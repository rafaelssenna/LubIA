import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obter QR Code para conexão
export async function GET() {
  try {
    const config = await prisma.configuracao.findUnique({
      where: { id: 1 },
    });

    if (!config?.uazapiToken || !config?.uazapiUrl) {
      return NextResponse.json({
        error: 'WhatsApp não configurado. Configure o token primeiro.',
      }, { status: 400 });
    }

    // Chamar UazAPI para obter QR Code
    const response = await fetch(`${config.uazapiUrl}/instance/connect`, {
      method: 'GET',
      headers: {
        'token': config.uazapiToken,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        error: errorData.error || 'Erro ao obter QR Code',
      }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({
      qrcode: data.qrcode,
      paircode: data.paircode,
      status: data.status,
    });
  } catch (error: any) {
    console.error('[WHATSAPP CONNECT] Erro:', error?.message);
    return NextResponse.json({
      error: 'Erro ao conectar WhatsApp',
      details: error?.message,
    }, { status: 500 });
  }
}
