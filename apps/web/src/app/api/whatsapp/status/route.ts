import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const UAZAPI_URL = process.env.UAZAPI_URL || 'https://hia-clientes.uazapi.com';

// GET - Verificar status da conexão WhatsApp
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const config = await prisma.configuracao.findUnique({
      where: { empresaId: session.empresaId },
    });

    if (!config?.uazapiToken) {
      return NextResponse.json({
        connected: false,
        configured: false,
        message: 'WhatsApp não configurado',
      });
    }

    // Chamar UazAPI para verificar status
    const response = await fetch(`${UAZAPI_URL}/instance/status`, {
      method: 'GET',
      headers: {
        'token': config.uazapiToken,
      },
    });

    if (!response.ok) {
      // Se token inválido, limpar
      if (response.status === 401) {
        await prisma.configuracao.update({
          where: { empresaId: session.empresaId },
          data: {
            whatsappConnected: false,
          },
        });
      }

      return NextResponse.json({
        connected: false,
        configured: true,
        message: 'Erro ao verificar status',
      });
    }

    const data = await response.json();
    console.log('[WHATSAPP STATUS] Resposta UazAPI:', JSON.stringify(data, null, 2));

    // A resposta tem: instance (objeto com dados) e status (objeto com connected/loggedIn)
    const instance = data.instance || {};
    const statusObj = data.status || {};

    // Verificar se está conectado: status.connected (boolean) ou instance.status (string)
    const isConnected = statusObj.connected === true || instance.status === 'connected';

    // Atualizar status no banco
    await prisma.configuracao.update({
      where: { empresaId: session.empresaId },
      data: {
        whatsappConnected: isConnected,
        whatsappNumber: instance.owner || null,
        whatsappName: instance.profileName || null,
      },
    });

    return NextResponse.json({
      connected: isConnected,
      configured: true,
      status: instance.status || (isConnected ? 'connected' : 'disconnected'),
      profileName: instance.profileName,
      profilePicUrl: instance.profilePicUrl,
      number: instance.owner,
      isBusiness: instance.isBusiness,
      // Se está conectando, retornar QR code atualizado
      qrcode: instance.qrcode,
      paircode: instance.paircode,
    });
  } catch (error: any) {
    console.error('[WHATSAPP STATUS] Erro:', error?.message);
    return NextResponse.json({
      connected: false,
      configured: false,
      error: error?.message,
    }, { status: 500 });
  }
}
