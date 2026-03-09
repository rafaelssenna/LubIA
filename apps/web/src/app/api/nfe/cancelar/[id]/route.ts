import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { cancelarNFe, buscarConfigNFe } from '@/lib/nfe';

// POST - Cancelar NF-e
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
    const body = await request.json();
    const { motivo } = body;

    if (!motivo || motivo.length < 15) {
      return NextResponse.json({
        error: 'Motivo do cancelamento é obrigatório (mínimo 15 caracteres)',
      }, { status: 400 });
    }

    // Buscar NF-e
    const nota = await prisma.notaFiscal.findFirst({
      where: { id: nfeId, empresaId: session.empresaId },
    });

    if (!nota) {
      return NextResponse.json({ error: 'Nota fiscal não encontrada' }, { status: 404 });
    }

    if (nota.status !== 'AUTORIZADA') {
      return NextResponse.json({
        error: 'Apenas notas autorizadas podem ser canceladas',
      }, { status: 400 });
    }

    if (!nota.chaveAcesso || !nota.protocolo) {
      return NextResponse.json({
        error: 'NF-e sem chave de acesso ou protocolo',
      }, { status: 400 });
    }

    // Verificar prazo (24h)
    const horasDesdeEmissao = (Date.now() - nota.createdAt.getTime()) / (1000 * 60 * 60);
    if (horasDesdeEmissao > 24) {
      return NextResponse.json({
        error: 'Prazo de cancelamento expirado (máximo 24 horas após emissão)',
      }, { status: 400 });
    }

    // Buscar config
    const configNFe = await buscarConfigNFe(session.empresaId);

    // Cancelar na SEFAZ
    const resultado = await cancelarNFe(
      session.empresaId,
      nota.chaveAcesso,
      nota.protocolo,
      motivo,
      configNFe,
    );

    if (resultado.success) {
      // Atualizar no banco
      await prisma.notaFiscal.update({
        where: { id: nfeId },
        data: {
          status: 'CANCELADA',
          motivoCancelamento: motivo,
        },
      });

      return NextResponse.json({
        success: true,
        data: { protocolo: resultado.protocolo },
      });
    }

    return NextResponse.json({
      error: `Cancelamento rejeitado pela SEFAZ: ${resultado.motivo}`,
    }, { status: 422 });

  } catch (error: any) {
    console.error('[NFE CANCELAR] Erro:', error?.message);
    return NextResponse.json({
      error: error?.message || 'Erro ao cancelar NF-e',
    }, { status: 500 });
  }
}
