import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { gerarDanfeFromXml } from '@/lib/nfe';

// GET - Baixar DANFE (PDF) de uma NF-e
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const nfeId = parseInt(id);

    const nota = await prisma.notaFiscal.findFirst({
      where: { id: nfeId, empresaId: session.empresaId },
    });

    if (!nota) {
      return NextResponse.json({ error: 'Nota fiscal não encontrada' }, { status: 404 });
    }

    let danfeBase64 = nota.danfePdf;

    // Se não tem DANFE salvo, tenta gerar a partir do XML de retorno
    if (!danfeBase64 && nota.xmlRetorno && nota.chaveAcesso) {
      try {
        danfeBase64 = await gerarDanfeFromXml(nota.xmlRetorno, nota.chaveAcesso);
        // Salva para próximas vezes
        await prisma.notaFiscal.update({
          where: { id: nfeId },
          data: { danfePdf: danfeBase64 },
        });
      } catch (err: any) {
        console.error('[DANFE] Erro ao gerar DANFE:', err?.message);
      }
    }

    if (!danfeBase64) {
      return NextResponse.json({ error: 'DANFE não disponível para esta NF-e' }, { status: 404 });
    }

    const pdfBuffer = Buffer.from(danfeBase64, 'base64');

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="DANFE-${nota.numero}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('[DANFE GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao gerar DANFE' }, { status: 500 });
  }
}
