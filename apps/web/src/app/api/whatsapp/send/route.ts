import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Enviar mensagem WhatsApp
export async function POST(request: NextRequest) {
  try {
    const config = await prisma.configuracao.findUnique({
      where: { id: 1 },
    });

    if (!config?.uazapiToken || !config?.uazapiUrl) {
      return NextResponse.json({
        error: 'WhatsApp não configurado',
      }, { status: 400 });
    }

    if (!config.whatsappConnected) {
      return NextResponse.json({
        error: 'WhatsApp não está conectado',
      }, { status: 400 });
    }

    const body = await request.json();
    const { number, text, type, file, docName, caption } = body;

    if (!number) {
      return NextResponse.json({
        error: 'Número de telefone é obrigatório',
      }, { status: 400 });
    }

    // Formatar número (remover caracteres não numéricos)
    const formattedNumber = number.replace(/\D/g, '');

    let endpoint = '/send/text';
    let payload: any = {
      number: formattedNumber,
      delay: 1000,
      readchat: true,
    };

    if (type === 'media' && file) {
      // Enviar mídia (imagem, documento, etc)
      endpoint = '/send/media';
      payload = {
        ...payload,
        type: file.includes('.pdf') ? 'document' : 'image',
        file: file,
        docName: docName || 'documento.pdf',
        text: caption || '',
      };
    } else {
      // Enviar texto simples
      payload.text = text;
      payload.linkPreview = true;
    }

    const response = await fetch(`${config.uazapiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': config.uazapiToken,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[WHATSAPP SEND] Erro da API:', errorData);
      return NextResponse.json({
        error: errorData.error || 'Erro ao enviar mensagem',
        details: errorData,
      }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      messageId: data.key?.id || data.id,
      status: data.status,
    });
  } catch (error: any) {
    console.error('[WHATSAPP SEND] Erro:', error?.message);
    return NextResponse.json({
      error: 'Erro ao enviar mensagem',
      details: error?.message,
    }, { status: 500 });
  }
}
