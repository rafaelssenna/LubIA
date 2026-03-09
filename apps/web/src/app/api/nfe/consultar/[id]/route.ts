import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { consultarNFe, buscarConfigNFe } from '@/lib/nfe';

// POST - Consultar status de uma NF-e na SEFAZ
export async function POST(
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

    if (!nota.chaveAcesso) {
      return NextResponse.json({ error: 'NF-e sem chave de acesso' }, { status: 400 });
    }

    const configNFe = await buscarConfigNFe(session.empresaId);
    const resultado = await consultarNFe(session.empresaId, nota.chaveAcesso, configNFe);

    return NextResponse.json({
      success: true,
      data: {
        cStat: resultado.cStat,
        motivo: resultado.motivo,
        protocolo: resultado.protocolo,
      },
    });
  } catch (error: any) {
    console.error('[NFE CONSULTAR] Erro:', error?.message);
    return NextResponse.json({
      error: error?.message || 'Erro ao consultar NF-e',
    }, { status: 500 });
  }
}
