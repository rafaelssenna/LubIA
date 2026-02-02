import { NextRequest, NextResponse } from 'next/server';
import { extractInvoiceData } from '@/lib/ocr';

export async function POST(request: NextRequest) {
  console.log('========================================');
  console.log('[OCR NOTA-FISCAL API] POST request iniciado');
  console.log('[OCR NOTA-FISCAL API] URL:', request.url);
  console.log('[OCR NOTA-FISCAL API] Method:', request.method);
  console.log('[OCR NOTA-FISCAL API] Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
  console.log('[OCR NOTA-FISCAL API] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

  try {
    console.log('[OCR NOTA-FISCAL API] Tentando extrair formData...');
    const formData = await request.formData();
    console.log('[OCR NOTA-FISCAL API] FormData extraído com sucesso');

    const file = formData.get('file') as File;
    console.log('[OCR NOTA-FISCAL API] File obtido:', file ? 'Sim' : 'Não');

    if (!file) {
      console.log('[OCR NOTA-FISCAL API] ERRO: Nenhum arquivo enviado');
      console.log('========================================');
      return NextResponse.json(
        { error: 'Nenhuma imagem enviada' },
        { status: 400 }
      );
    }

    console.log('[OCR NOTA-FISCAL API] File name:', file.name);
    console.log('[OCR NOTA-FISCAL API] File type:', file.type);
    console.log('[OCR NOTA-FISCAL API] File size:', file.size, 'bytes');

    console.log('[OCR NOTA-FISCAL API] Convertendo para buffer...');
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('[OCR NOTA-FISCAL API] Buffer criado, tamanho:', buffer.length, 'bytes');

    console.log('[OCR NOTA-FISCAL API] Chamando extractInvoiceData...');
    const result = await extractInvoiceData(buffer);
    console.log('[OCR NOTA-FISCAL API] extractInvoiceData retornou - fornecedor:', result.fornecedor);
    console.log('[OCR NOTA-FISCAL API] extractInvoiceData retornou - itens:', result.itens?.length || 0);

    console.log('[OCR NOTA-FISCAL API] Retornando resultado com sucesso');
    console.log('========================================');
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('========================================');
    console.error('[OCR NOTA-FISCAL API] ERRO CAPTURADO!');
    console.error('[OCR NOTA-FISCAL API] Tipo do erro:', error?.constructor?.name);
    console.error('[OCR NOTA-FISCAL API] Mensagem:', error?.message);
    console.error('[OCR NOTA-FISCAL API] Code:', error?.code);
    console.error('[OCR NOTA-FISCAL API] Stack:', error?.stack);
    console.error('[OCR NOTA-FISCAL API] Erro completo:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
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
