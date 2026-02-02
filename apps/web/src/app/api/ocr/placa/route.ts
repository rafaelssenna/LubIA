import { NextRequest, NextResponse } from 'next/server';
import { extractPlate } from '@/lib/ocr';

export async function POST(request: NextRequest) {
  console.log('========================================');
  console.log('[OCR PLACA API] POST request iniciado');
  console.log('[OCR PLACA API] URL:', request.url);
  console.log('[OCR PLACA API] Method:', request.method);
  console.log('[OCR PLACA API] Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
  console.log('[OCR PLACA API] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

  try {
    console.log('[OCR PLACA API] Tentando extrair formData...');
    const formData = await request.formData();
    console.log('[OCR PLACA API] FormData extraído com sucesso');

    const file = formData.get('file') as File;
    console.log('[OCR PLACA API] File obtido:', file ? 'Sim' : 'Não');

    if (!file) {
      console.log('[OCR PLACA API] ERRO: Nenhum arquivo enviado');
      console.log('========================================');
      return NextResponse.json(
        { error: 'Nenhuma imagem enviada' },
        { status: 400 }
      );
    }

    console.log('[OCR PLACA API] File name:', file.name);
    console.log('[OCR PLACA API] File type:', file.type);
    console.log('[OCR PLACA API] File size:', file.size, 'bytes');

    console.log('[OCR PLACA API] Convertendo para buffer...');
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('[OCR PLACA API] Buffer criado, tamanho:', buffer.length, 'bytes');

    console.log('[OCR PLACA API] Chamando extractPlate...');
    const result = await extractPlate(buffer);
    console.log('[OCR PLACA API] extractPlate retornou:', result ? JSON.stringify(result) : 'null');

    if (!result) {
      console.log('[OCR PLACA API] Placa não encontrada, retornando sucesso=false');
      console.log('========================================');
      return NextResponse.json({
        success: false,
        message: 'Não foi possível identificar uma placa na imagem',
      });
    }

    console.log('[OCR PLACA API] Placa encontrada! Retornando resultado...');
    console.log('========================================');
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('========================================');
    console.error('[OCR PLACA API] ERRO CAPTURADO!');
    console.error('[OCR PLACA API] Tipo do erro:', error?.constructor?.name);
    console.error('[OCR PLACA API] Mensagem:', error?.message);
    console.error('[OCR PLACA API] Code:', error?.code);
    console.error('[OCR PLACA API] Stack:', error?.stack);
    console.error('[OCR PLACA API] Erro completo:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('========================================');
    return NextResponse.json(
      {
        error: 'Erro ao processar imagem',
        details: error?.message,
        type: error?.constructor?.name
      },
      { status: 500 }
    );
  }
}
