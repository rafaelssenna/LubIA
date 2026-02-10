import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateChatResponse, ChatResponse, ChatResponseList, ChatResponseButton } from '@/lib/chatbot';

const UAZAPI_URL = process.env.UAZAPI_URL || 'https://hia-clientes.uazapi.com';

// Buffer de mensagens - aguarda 7 segundos para agrupar mensagens do mesmo usuário
const MESSAGE_BUFFER_MS = 7000; // 7 segundos

interface BufferedMessage {
  text: string;
  pushName: string;
  tipoMensagem: TipoMensagem;
  messageId?: string;
  metadata?: any;
}

interface MessageBuffer {
  messages: BufferedMessage[];
  timer: NodeJS.Timeout | null;
  processing: boolean;
  empresaId: number;
  token: string;
}

const messageBuffers = new Map<string, MessageBuffer>();

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
  empresaId: number,
  tipo: TipoMensagem = 'TEXTO',
  messageId?: string,
  metadata?: any
): Promise<void> {
  try {
    // Buscar ou criar conversa (unique por telefone + empresaId)
    let conversa = await prisma.conversa.findUnique({
      where: { telefone_empresaId: { telefone, empresaId } },
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
          empresaId,
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
          empresaId,
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
        empresaId,
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

// Função para enviar mensagem de texto via UazAPI
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
    console.log('[WEBHOOK] Mensagem de texto enviada para:', to);
    return data.key?.id || data.id || null;
  } catch (error: any) {
    console.error('[WEBHOOK] Erro ao enviar mensagem:', error?.message);
    return null;
  }
}

// Função para enviar mensagem de lista interativa via UazAPI
async function sendWhatsAppListMessage(
  token: string,
  to: string,
  listData: ChatResponseList
): Promise<string | null> {
  try {
    const payload = {
      number: to,
      type: 'list',
      text: listData.text,
      listButton: listData.listButton,
      footerText: listData.footerText || '',
      choices: listData.choices,
    };
    console.log('[WEBHOOK] Enviando lista interativa:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${UAZAPI_URL}/send/menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json().catch(() => ({}));
    console.log('[WEBHOOK] Resposta da lista:', response.status, JSON.stringify(responseData));

    if (!response.ok) {
      console.error('[WEBHOOK] Erro ao enviar lista - usando fallback de texto');
      // Fallback para mensagem de texto se lista falhar
      return sendWhatsAppMessage(token, to, listData.text);
    }

    console.log('[WEBHOOK] Mensagem de lista enviada com sucesso para:', to);
    return responseData.key?.id || responseData.id || null;
  } catch (error: any) {
    console.error('[WEBHOOK] Erro ao enviar lista:', error?.message);
    // Fallback para mensagem de texto
    return sendWhatsAppMessage(token, to, listData.text);
  }
}

// Função para enviar mensagem com botões via UazAPI
async function sendWhatsAppButtonMessage(
  token: string,
  to: string,
  buttonData: ChatResponseButton
): Promise<string | null> {
  try {
    const response = await fetch(`${UAZAPI_URL}/send/menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body: JSON.stringify({
        number: to,
        type: 'button',
        text: buttonData.text,
        footerText: buttonData.footerText || '',
        choices: buttonData.choices,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[WEBHOOK] Erro ao enviar botões:', errorData);
      // Fallback para mensagem de texto se botões falhar
      return sendWhatsAppMessage(token, to, buttonData.text);
    }

    const data = await response.json();
    console.log('[WEBHOOK] Mensagem de botões enviada para:', to);
    return data.key?.id || data.id || null;
  } catch (error: any) {
    console.error('[WEBHOOK] Erro ao enviar botões:', error?.message);
    // Fallback para mensagem de texto
    return sendWhatsAppMessage(token, to, buttonData.text);
  }
}

// Função para enviar resposta do chatbot (texto, lista ou botões)
async function sendChatResponse(
  token: string,
  to: string,
  response: ChatResponse
): Promise<string | null> {
  switch (response.type) {
    case 'list':
      return sendWhatsAppListMessage(token, to, response);
    case 'button':
      return sendWhatsAppButtonMessage(token, to, response);
    case 'text':
    default:
      return sendWhatsAppMessage(token, to, response.message);
  }
}

// Função para processar mensagens do buffer
async function processBufferedMessages(phoneNumber: string): Promise<void> {
  const buffer = messageBuffers.get(phoneNumber);
  if (!buffer || buffer.messages.length === 0 || buffer.processing) {
    return;
  }

  buffer.processing = true;

  try {
    // Combinar todas as mensagens em uma só
    const combinedText = buffer.messages.map(m => m.text).join(' ');
    const pushName = buffer.messages[0].pushName;

    // Usar empresaId e token armazenados no buffer
    const { empresaId, token } = buffer;

    console.log('[WEBHOOK] Processando buffer com', buffer.messages.length, 'mensagens para empresa', empresaId, ':', combinedText.substring(0, 100));

    if (!token || !empresaId) {
      console.error('[WEBHOOK] Token ou empresa não encontrado no buffer');
      return;
    }

    // Gerar resposta com IA usando texto combinado
    const aiResponse = await generateChatResponse(combinedText, phoneNumber, empresaId, pushName);

    // Se resposta vazia, chatbot está desabilitado
    if (aiResponse.type === 'text' && !aiResponse.message) {
      console.log('[WEBHOOK] Chatbot desabilitado, não respondendo');
      return;
    }

    // Enviar resposta (texto, lista ou botões)
    const sentMessageId = await sendChatResponse(token, phoneNumber, aiResponse);

    // Determinar conteúdo para salvar no histórico
    let conteudoParaSalvar = '';
    if (aiResponse.type === 'text') {
      conteudoParaSalvar = aiResponse.message;
    } else if (aiResponse.type === 'list' || aiResponse.type === 'button') {
      conteudoParaSalvar = aiResponse.text;
    }

    // Salvar resposta enviada no banco
    if (sentMessageId !== null && conteudoParaSalvar) {
      await saveMessage(
        phoneNumber,
        null,
        conteudoParaSalvar,
        true, // enviada
        empresaId,
        'TEXTO',
        sentMessageId
      );
    }

    console.log('[WEBHOOK] Resposta enviada após buffer');
  } catch (error: any) {
    console.error('[WEBHOOK] Erro ao processar buffer:', error?.message);
  } finally {
    // Limpar buffer
    messageBuffers.delete(phoneNumber);
  }
}

// Função para encontrar empresa pelo token ou instância
async function findEmpresaByToken(request: NextRequest, data: any): Promise<{ empresaId: number; token: string } | null> {
  // Opção 1: Token no header (UazAPI pode enviar assim)
  const headerToken = request.headers.get('token') || request.headers.get('x-api-token');

  // Opção 2: Token/instância no body do webhook
  const instanceToken = data.token || data.instance?.token || data.instanceToken;
  const instanceId = data.instance?.id || data.instanceId || data.instance;

  // Log para debug
  console.log('[WEBHOOK] Identificação:', { headerToken: !!headerToken, instanceToken: !!instanceToken, instanceId });

  let config = null;

  // Tentar encontrar pelo token do header
  if (headerToken) {
    config = await prisma.configuracao.findFirst({
      where: { uazapiToken: headerToken },
    });
  }

  // Tentar encontrar pelo token do body
  if (!config && instanceToken) {
    config = await prisma.configuracao.findFirst({
      where: { uazapiToken: instanceToken },
    });
  }

  // Tentar encontrar pelo ID da instância
  if (!config && instanceId) {
    config = await prisma.configuracao.findFirst({
      where: { uazapiInstanceId: instanceId },
    });
  }

  if (config?.empresaId && config?.uazapiToken) {
    return { empresaId: config.empresaId, token: config.uazapiToken };
  }

  return null;
}

// POST - Receber mensagens do WhatsApp via UazAPI webhook
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Log completo do payload para debug
    console.log('[WEBHOOK] Payload recebido:', JSON.stringify(data, null, 2));

    // Identificar a empresa pelo token/instância
    const empresaInfo = await findEmpresaByToken(request, data);

    let empresaId: number | undefined;
    let token: string | undefined;

    if (empresaInfo) {
      empresaId = empresaInfo.empresaId;
      token = empresaInfo.token;
    } else {
      console.warn('[WEBHOOK] Não foi possível identificar a empresa pelo token');
      // Fallback para primeira config encontrada (compatibilidade com instância única)
      const fallbackConfig = await prisma.configuracao.findFirst({
        where: { uazapiToken: { not: null } },
      }) as { empresaId: number; uazapiToken: string | null } | null;
      if (fallbackConfig?.empresaId && fallbackConfig?.uazapiToken) {
        empresaId = fallbackConfig.empresaId;
        token = fallbackConfig.uazapiToken;
        console.log('[WEBHOOK] Usando fallback para empresa:', empresaId);
      }
    }

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
      let text = typeof rawContent === 'string'
        ? rawContent
        : (rawContent?.text || message.text || '');

      // Verificar se é resposta de botão/lista interativa
      const buttonOrListId = message.buttonOrListid || message.selectedButtonId || message.listResponseMessage?.singleSelectReply?.selectedRowId;
      if (buttonOrListId) {
        console.log('[WEBHOOK] Resposta de botão/lista recebida:', buttonOrListId);
        text = buttonOrListId; // Usar o ID do botão/lista como texto
      }

      const pushName = message.senderName || '';

      // Se não tem texto e não é botão, ignorar (pode ser sticker, audio, etc.)
      if (!text.trim() && !buttonOrListId) {
        console.log('[WEBHOOK] Ignorando mensagem sem texto');
        return NextResponse.json({ success: true, ignored: true });
      }

      console.log('[WEBHOOK] Mensagem recebida:', {
        from,
        pushName,
        text: text.substring(0, 100),
        empresaId,
      });

      // Verificar se empresa foi identificada
      if (!empresaId) {
        console.error('[WEBHOOK] Empresa não encontrada para processar mensagem');
        return NextResponse.json({ success: false, error: 'Empresa não configurada' });
      }

      // Determinar tipo da mensagem
      const tipoMensagem = getTipoMensagem(message);
      const messageId = message.id || message.key?.id;

      // Salvar mensagem recebida no banco imediatamente
      await saveMessage(
        from,
        pushName,
        text,
        false, // recebida
        empresaId,
        tipoMensagem,
        messageId,
        { type: message.type, mimetype: message.mimetype }
      );

      // === BUFFER DE 7 SEGUNDOS ===
      // Adicionar mensagem ao buffer e (re)iniciar timer
      let buffer = messageBuffers.get(from);

      // Se está processando, criar novo buffer para próximo ciclo
      if (buffer?.processing) {
        console.log('[WEBHOOK] Buffer em processamento, criando novo buffer para próxima mensagem');
        buffer = { messages: [], timer: null, processing: false, empresaId, token: token! };
        messageBuffers.set(from, buffer);
      }

      if (!buffer) {
        buffer = { messages: [], timer: null, processing: false, empresaId, token: token! };
        messageBuffers.set(from, buffer);
      }

      // Adicionar mensagem ao buffer
      buffer.messages.push({
        text,
        pushName,
        tipoMensagem,
        messageId,
        metadata: { type: message.type, mimetype: message.mimetype }
      });

      // Cancelar timer anterior e iniciar novo
      if (buffer.timer) {
        clearTimeout(buffer.timer);
      }

      buffer.timer = setTimeout(() => {
        processBufferedMessages(from);
      }, MESSAGE_BUFFER_MS);

      console.log('[WEBHOOK] Mensagem adicionada ao buffer (' + buffer.messages.length + '), aguardando', MESSAGE_BUFFER_MS / 1000, 'segundos...');

      return NextResponse.json({ success: true, buffered: true, bufferSize: buffer.messages.length });

    } else if (event === 'connection' || data.status) {
      // Evento de conexão/desconexão
      const status = data.status || message?.status;
      console.log('[WEBHOOK] Evento de conexão:', status, 'empresaId:', empresaId);

      if (empresaId) {
        if (status === 'connected' || status === 'open') {
          await prisma.configuracao.updateMany({
            where: { empresaId },
            data: { whatsappConnected: true },
          }).catch(() => { });
        } else if (status === 'disconnected' || status === 'close') {
          await prisma.configuracao.updateMany({
            where: { empresaId },
            data: { whatsappConnected: false },
          }).catch(() => { });
        }
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
