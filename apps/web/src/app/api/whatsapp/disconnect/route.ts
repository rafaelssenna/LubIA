import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Desconectar WhatsApp
export async function POST() {
  try {
    const config = await prisma.configuracao.findUnique({
      where: { id: 1 },
    });

    if (!config?.uazapiToken || !config?.uazapiUrl) {
      return NextResponse.json({
        error: 'WhatsApp não configurado',
      }, { status: 400 });
    }

    // Chamar UazAPI para desconectar
    const response = await fetch(`${config.uazapiUrl}/instance/disconnect`, {
      method: 'GET',
      headers: {
        'token': config.uazapiToken,
      },
    });

    // Atualizar status no banco independente do resultado
    await prisma.configuracao.update({
      where: { id: 1 },
      data: {
        whatsappConnected: false,
        whatsappNumber: null,
        whatsappName: null,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        success: true,
        warning: 'Desconectado localmente, mas houve erro na API',
        details: errorData,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp desconectado com sucesso',
    });
  } catch (error: any) {
    console.error('[WHATSAPP DISCONNECT] Erro:', error?.message);

    // Mesmo com erro, marcar como desconectado localmente
    await prisma.configuracao.update({
      where: { id: 1 },
      data: {
        whatsappConnected: false,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      warning: 'Desconectado localmente',
    });
  }
}
