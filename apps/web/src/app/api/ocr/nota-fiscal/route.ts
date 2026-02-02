import { NextRequest, NextResponse } from 'next/server';
import { extractInvoiceData } from '@/lib/ocr';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhuma imagem enviada' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractInvoiceData(buffer);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Erro no OCR de nota fiscal:', error);
    return NextResponse.json(
      { error: 'Erro ao processar imagem' },
      { status: 500 }
    );
  }
}
