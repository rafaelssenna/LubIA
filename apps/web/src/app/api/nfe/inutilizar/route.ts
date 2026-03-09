import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { inutilizarNFe, buscarConfigNFe } from '@/lib/nfe';

// POST - Inutilizar faixa de numeração
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { numeroInicial, numeroFinal, motivo } = body;

    if (!numeroInicial || !numeroFinal) {
      return NextResponse.json({
        error: 'Número inicial e final são obrigatórios',
      }, { status: 400 });
    }

    if (!motivo || motivo.length < 15) {
      return NextResponse.json({
        error: 'Motivo da inutilização é obrigatório (mínimo 15 caracteres)',
      }, { status: 400 });
    }

    if (numeroInicial > numeroFinal) {
      return NextResponse.json({
        error: 'Número inicial deve ser menor ou igual ao final',
      }, { status: 400 });
    }

    const configNFe = await buscarConfigNFe(session.empresaId);

    const resultado = await inutilizarNFe(
      session.empresaId,
      numeroInicial,
      numeroFinal,
      motivo,
      configNFe,
    );

    if (resultado.success) {
      // Registrar as numerações inutilizadas no banco
      for (let num = numeroInicial; num <= numeroFinal; num++) {
        await prisma.notaFiscal.create({
          data: {
            empresaId: session.empresaId,
            numero: num,
            serie: configNFe.serie,
            status: 'INUTILIZADA',
            valorTotal: 0,
            valorProdutos: 0,
            motivoCancelamento: motivo,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: { protocolo: resultado.protocolo },
      });
    }

    return NextResponse.json({
      error: `Inutilização rejeitada pela SEFAZ: ${resultado.motivo}`,
    }, { status: 422 });

  } catch (error: any) {
    console.error('[NFE INUTILIZAR] Erro:', error?.message);
    return NextResponse.json({
      error: error?.message || 'Erro ao inutilizar numeração',
    }, { status: 500 });
  }
}
