import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const UAZAPI_URL = process.env.UAZAPI_URL || 'https://hia-clientes.uazapi.com';

// POST - Desconectar WhatsApp
export async function POST() {
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
        error: 'WhatsApp nao configurado',
      }, { status: 400 });
    }

    // Chamar UazAPI para desconectar
    const response = await fetch(`${UAZAPI_URL}/instance/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': config.uazapiToken,
      },
    });

    // Atualizar status no banco (NÃO apagar token para poder reconectar na mesma instância)
    await prisma.configuracao.update({
      where: { empresaId: session.empresaId },
      data: {
        whatsappConnected: false,
        // Mantém uazapiToken e uazapiInstanceId para reconectar
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
    const session = await getSession();
    if (session) {
      await prisma.configuracao.update({
        where: { empresaId: session.empresaId },
        data: {
          whatsappConnected: false,
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      warning: 'Desconectado localmente',
    });
  }
}
