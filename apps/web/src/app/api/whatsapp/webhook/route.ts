import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Receber mensagens do WhatsApp via UazAPI webhook
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('[WEBHOOK] Evento recebido:', JSON.stringify(data, null, 2));

    // Estrutura do evento de mensagem da UazAPI:
    // { event: 'messages', data: { key: {...}, message: {...}, ... } }
    const event = data.event;
    const messageData = data.data;

    if (event === 'messages' && messageData) {
      const key = messageData.key || {};
      const message = messageData.message || {};

      // Ignorar mensagens enviadas pela API (evitar loop)
      if (messageData.wasSentByApi) {
        console.log('[WEBHOOK] Ignorando mensagem enviada pela API');
        return NextResponse.json({ success: true, ignored: true });
      }

      // Ignorar mensagens de grupo
      if (key.remoteJid?.includes('@g.us')) {
        console.log('[WEBHOOK] Ignorando mensagem de grupo');
        return NextResponse.json({ success: true, ignored: true });
      }

      // Extrair informações da mensagem
      const from = key.remoteJid?.replace('@s.whatsapp.net', '') || '';
      const text = message.conversation ||
        message.extendedTextMessage?.text ||
        message.imageMessage?.caption ||
        message.videoMessage?.caption ||
        '';
      const fromMe = key.fromMe || false;
      const pushName = messageData.pushName || '';

      console.log('[WEBHOOK] Mensagem recebida:', {
        from,
        pushName,
        text: text.substring(0, 100),
        fromMe,
      });

      // TODO: Aqui você pode implementar lógica para:
      // - Responder automaticamente
      // - Salvar mensagens no banco
      // - Notificar a equipe
      // - Integrar com chatbot

      // Por enquanto, apenas logamos a mensagem
      // Você pode expandir isso depois conforme necessidade

    } else if (event === 'connection') {
      // Evento de conexão/desconexão
      console.log('[WEBHOOK] Evento de conexão:', messageData?.status);

      // Atualizar status no banco se mudar
      if (messageData?.status === 'connected') {
        await prisma.configuracao.update({
          where: { id: 1 },
          data: { whatsappConnected: true },
        }).catch(() => { });
      } else if (messageData?.status === 'disconnected') {
        await prisma.configuracao.update({
          where: { id: 1 },
          data: { whatsappConnected: false },
        }).catch(() => { });
      }
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
  });
}
