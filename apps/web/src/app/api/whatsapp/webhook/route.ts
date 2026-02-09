import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateChatResponse } from '@/lib/chatbot';

const UAZAPI_URL = process.env.UAZAPI_URL || 'https://hia-clientes.uazapi.com';

// Tipo de mensagem baseado no enum do Prisma
type TipoMensagem = 'TEXTO' | 'IMAGEM' | 'AUDIO' | 'VIDEO' | 'DOCUMENTO' | 'STICKER' | 'LOCALIZACAO';

// Função para determinar o tipo de mensagem
function getTipoMensagem(message: any): TipoMensagem {
  if (message.type === 'image' || message.mimetype?.startsWith('image')) return 'IMAGEM';
  if (message.type === 'audio' || message.type === 'ptt' || message.mimetype?.startsWith('audio')) return 'AUDIO';
  if (message.type === 'video' || message.mimetype?.startsWith('video')) return 'VIDEO';
  if (message.type === 'document' || message.type === 'file') return 'DOCUMENTO';
  if (message.type === 'sticker') return 'STICKER';
  if (message.type === 'location') return 'LOCALIZACAO';
  return 'TEXTO';
}

// Função para salvar mensagem no banco
async function saveMessage(
  telefone: string,
  nome: string | null,
  conteudo: string,
  enviada: boolean,
  tipo: TipoMensagem = 'TEXTO',
  messageId?: string,
  metadata?: any
): Promise<void> {
  try {
    // Buscar ou criar conversa
    let conversa = await prisma.conversa.findUnique({
      where: { telefone },
    });

    // Tentar vincular a cliente existente
    let clienteId: number | null = null;
    if (!conversa) {
      // Buscar cliente pelo telefone (com diferentes formatos)
      const telefoneLimpo = telefone.replace(/\D/g, '');
      const telefoneFormatos = [
        telefoneLimpo,
        telefoneLimpo.slice(-11), // Últimos 11 dígitos
        telefoneLimpo.slice(-10), // Últimos 10 dígitos
        telefoneLimpo.startsWith('55') ? telefoneLimpo.slice(2) : telefoneLimpo,
      ];

      const cliente = await prisma.cliente.findFirst({
        where: {
          OR: telefoneFormatos.map(t => ({
            telefone: { contains: t },
          })),
        },
      });

      if (cliente) {
        clienteId = cliente.id;
        nome = nome || cliente.nome;
      }
    }

    if (conversa) {
      // Atualizar conversa existente
      await prisma.conversa.update({
        where: { id: conversa.id },
        data: {
          nome: nome || conversa.nome,
          ultimaMensagem: conteudo.substring(0, 200),
          ultimaData: new Date(),
          naoLidas: enviada ? 0 : { increment: 1 },
        },
      });
    } else {
      // Criar nova conversa
      conversa = await prisma.conversa.create({
        data: {
          telefone,
          nome: nome || null,
          clienteId,
          ultimaMensagem: conteudo.substring(0, 200),
          ultimaData: new Date(),
          naoLidas: enviada ? 0 : 1,
        },
      });
    }

    // Salvar mensagem
    await prisma.mensagem.create({
      data: {
        conversaId: conversa.id,
        messageId: messageId || null,
        tipo,
        conteudo,
        enviada,
        lida: enviada,
        dataEnvio: new Date(),
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    console.log('[WEBHOOK] Mensagem salva:', { telefone, enviada, tipo });
  } catch (error: any) {
    console.error('[WEBHOOK] Erro ao salvar mensagem:', error?.message);
  }
}

// Função para enviar mensagem via UazAPI
async function sendWhatsAppMessage(token: string, to: string, text: string): Promise<string | null> {
  try {
    const response = await fetch(`${UAZAPI_URL}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body: JSON.stringify({
        number: to,
        text: text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[WEBHOOK] Erro ao enviar mensagem:', errorData);
      return null;
    }

    const data = await response.json();
    console.log('[WEBHOOK] Mensagem enviada para:', to);
    return data.key?.id || data.id || null;
  } catch (error: any) {
    console.error('[WEBHOOK] Erro ao enviar mensagem:', error?.message);
    return null;
  }
}

// POST - Receber mensagens do WhatsApp via UazAPI webhook
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Log completo do payload para debug
    console.log('[WEBHOOK] Payload recebido:', JSON.stringify(data, null, 2));

    // UazAPI envia: { EventType: 'messages', message: {...}, chat: {...} }
    const event = data.EventType || data.event || data.type;
    const message = data.message || {};

    if (event === 'messages' && message) {
      // Ignorar mensagens enviadas pela API (evitar loop)
      if (message.wasSentByApi) {
        console.log('[WEBHOOK] Ignorando mensagem enviada pela API');
        return NextResponse.json({ success: true, ignored: true });
      }

      // Ignorar mensagens de grupo
      if (message.isGroup) {
        console.log('[WEBHOOK] Ignorando mensagem de grupo');
        return NextResponse.json({ success: true, ignored: true });
      }

      // Ignorar mensagens enviadas por mim
      if (message.fromMe) {
        console.log('[WEBHOOK] Ignorando mensagem própria');
        return NextResponse.json({ success: true, ignored: true });
      }

      // Extrair informações da mensagem (formato UazAPI)
      // sender pode ser @lid, então usar sender_pn ou chatid que tem o número real
      const from = (message.sender_pn || message.chatid || '').replace('@s.whatsapp.net', '');

      // content pode ser string ou objeto { text: "...", contextInfo: {...} }
      const rawContent = message.content;
      const text = typeof rawContent === 'string'
        ? rawContent
        : (rawContent?.text || message.text || '');

      const pushName = message.senderName || '';

      // Se não tem texto, ignorar (pode ser sticker, audio, etc.)
      if (!text.trim()) {
        console.log('[WEBHOOK] Ignorando mensagem sem texto');
        return NextResponse.json({ success: true, ignored: true });
      }

      console.log('[WEBHOOK] Mensagem recebida:', {
        from,
        pushName,
        text: text.substring(0, 100),
      });

      // Determinar tipo da mensagem
      const tipoMensagem = getTipoMensagem(message);
      const messageId = message.id || message.key?.id;

      // Salvar mensagem recebida no banco
      await saveMessage(
        from,
        pushName,
        text,
        false, // recebida
        tipoMensagem,
        messageId,
        { type: message.type, mimetype: message.mimetype }
      );

      // Buscar token da instância
      const config = await prisma.configuracao.findUnique({
        where: { id: 1 },
      });

      if (!config?.uazapiToken) {
        console.error('[WEBHOOK] Token não encontrado');
        return NextResponse.json({ success: false, error: 'Token não configurado' });
      }

      // Gerar resposta com IA
      const aiResponse = await generateChatResponse(text, from, pushName);

      // Se resposta vazia, chatbot está desabilitado
      if (!aiResponse) {
        console.log('[WEBHOOK] Chatbot desabilitado, não respondendo');
        return NextResponse.json({ success: true, chatbotDisabled: true });
      }

      // Enviar resposta
      const sentMessageId = await sendWhatsAppMessage(config.uazapiToken, from, aiResponse);

      // Salvar resposta enviada no banco
      if (sentMessageId !== null) {
        await saveMessage(
          from,
          null,
          aiResponse,
          true, // enviada
          'TEXTO',
          sentMessageId
        );
      }

      return NextResponse.json({ success: true, responded: true });

    } else if (event === 'connection' || data.status) {
      // Evento de conexão/desconexão
      const status = data.status || message?.status;
      console.log('[WEBHOOK] Evento de conexão:', status);

      if (status === 'connected' || status === 'open') {
        await prisma.configuracao.update({
          where: { id: 1 },
          data: { whatsappConnected: true },
        }).catch(() => { });
      } else if (status === 'disconnected' || status === 'close') {
        await prisma.configuracao.update({
          where: { id: 1 },
          data: { whatsappConnected: false },
        }).catch(() => { });
      }
    } else {
      console.log('[WEBHOOK] Evento não tratado:', event);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[WEBHOOK] Erro ao processar:', error?.message);
    // Sempre retornar 200 para não causar retries infinitos
    return NextResponse.json({ success: false, error: error?.message });
  }
}

// GET - Verificar se webhook está ativo (health check)
export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'Webhook endpoint is ready',
    features: ['AI chatbot powered by Gemini'],
  });
}
