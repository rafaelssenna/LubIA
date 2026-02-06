import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Verificar status da conexão WhatsApp
export async function GET() {
  try {
    const config = await prisma.configuracao.findUnique({
      where: { id: 1 },
    });

    if (!config?.uazapiToken || !config?.uazapiUrl) {
      return NextResponse.json({
        connected: false,
        configured: false,
        message: 'WhatsApp não configurado',
      });
    }

    // Chamar UazAPI para verificar status
    const response = await fetch(`${config.uazapiUrl}/instance/status`, {
      method: 'GET',
      headers: {
        'token': config.uazapiToken,
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        connected: false,
        configured: true,
        message: 'Erro ao verificar status',
      });
    }

    const data = await response.json();

    // Atualizar status no banco
    const isConnected = data.status === 'connected';
    await prisma.configuracao.update({
      where: { id: 1 },
      data: {
        whatsappConnected: isConnected,
        whatsappNumber: data.owner || null,
        whatsappName: data.profileName || null,
      },
    });

    return NextResponse.json({
      connected: isConnected,
      configured: true,
      status: data.status,
      profileName: data.profileName,
      profilePicUrl: data.profilePicUrl,
      number: data.owner,
      isBusiness: data.isBusiness,
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
