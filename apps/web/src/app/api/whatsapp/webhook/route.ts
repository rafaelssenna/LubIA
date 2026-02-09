import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateChatResponse } from '@/lib/chatbot';

const UAZAPI_URL = process.env.UAZAPI_URL || 'https://hia-clientes.uazapi.com';

// Função para enviar mensagem via UazAPI
async function sendWhatsAppMessage(token: string, to: string, text: string) {
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
      return false;
    }

    console.log('[WEBHOOK] Mensagem enviada para:', to);
    return true;
  } catch (error: any) {
    console.error('[WEBHOOK] Erro ao enviar mensagem:', error?.message);
    return false;
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
      await sendWhatsAppMessage(config.uazapiToken, from, aiResponse);

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
