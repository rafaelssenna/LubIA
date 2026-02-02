import { NextRequest, NextResponse } from 'next/server';
import { extractDocumentData } from '@/lib/ocr';

export async function POST(request: NextRequest) {
  console.log('========================================');
  console.log('[OCR DOCUMENTO API] POST request iniciado');
  console.log('[OCR DOCUMENTO API] URL:', request.url);
  console.log('[OCR DOCUMENTO API] Method:', request.method);
  console.log('[OCR DOCUMENTO API] Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
  console.log('[OCR DOCUMENTO API] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

  try {
    console.log('[OCR DOCUMENTO API] Tentando extrair formData...');
    const formData = await request.formData();
    console.log('[OCR DOCUMENTO API] FormData extraído com sucesso');

    const file = formData.get('file') as File;
    console.log('[OCR DOCUMENTO API] File obtido:', file ? 'Sim' : 'Não');

    if (!file) {
      console.log('[OCR DOCUMENTO API] ERRO: Nenhum arquivo enviado');
      console.log('========================================');
      return NextResponse.json(
        { error: 'Nenhuma imagem enviada' },
        { status: 400 }
      );
    }

    console.log('[OCR DOCUMENTO API] File name:', file.name);
    console.log('[OCR DOCUMENTO API] File type:', file.type);
    console.log('[OCR DOCUMENTO API] File size:', file.size, 'bytes');

    console.log('[OCR DOCUMENTO API] Convertendo para buffer...');
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('[OCR DOCUMENTO API] Buffer criado, tamanho:', buffer.length, 'bytes');

    console.log('[OCR DOCUMENTO API] Chamando extractDocumentData...');
    const result = await extractDocumentData(buffer);
    console.log('[OCR DOCUMENTO API] extractDocumentData retornou - tipo:', result.tipo);
    console.log('[OCR DOCUMENTO API] extractDocumentData retornou:', JSON.stringify(result, null, 2));

    console.log('[OCR DOCUMENTO API] Retornando resultado com sucesso');
    console.log('========================================');
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('========================================');
    console.error('[OCR DOCUMENTO API] ERRO CAPTURADO!');
    console.error('[OCR DOCUMENTO API] Tipo do erro:', error?.constructor?.name);
    console.error('[OCR DOCUMENTO API] Mensagem:', error?.message);
    console.error('[OCR DOCUMENTO API] Code:', error?.code);
    console.error('[OCR DOCUMENTO API] Stack:', error?.stack);
    console.error('[OCR DOCUMENTO API] Erro completo:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
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
