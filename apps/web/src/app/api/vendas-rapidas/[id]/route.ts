import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const vendaId = parseInt(id);

    if (isNaN(vendaId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const venda = await prisma.vendaRapida.findFirst({
      where: {
        id: vendaId,
        empresaId: session.empresaId,
      },
      include: {
        itens: {
          include: {
            produto: {
              select: {
                id: true,
                nome: true,
                codigo: true,
                marca: true,
                unidade: true,
              },
            },
            devolucoes: {
              select: {
                quantidadeDevolvida: true,
              },
            },
          },
        },
        devolucoes: {
          include: {
            itens: {
              include: {
                produto: {
                  select: {
                    id: true,
                    nome: true,
                    codigo: true,
                  },
                },
                produtoTroca: {
                  select: {
                    id: true,
                    nome: true,
                    codigo: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!venda) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
    }

    // Calculate available quantity for return (original - already returned)
    const itensComDisponivel = venda.itens.map((item) => {
      const totalDevolvido = item.devolucoes.reduce(
        (acc: number, dev: { quantidadeDevolvida: any }) => acc + Number(dev.quantidadeDevolvida),
        0
      );
      const quantidadeOriginal = Number(item.quantidade);
      const quantidadeDisponivel = quantidadeOriginal - totalDevolvido;

      return {
        id: item.id,
        produtoId: item.produtoId,
        produto: item.produto,
        quantidade: quantidadeOriginal,
        quantidadeDevolvida: totalDevolvido,
        quantidadeDisponivel: Math.max(0, quantidadeDisponivel),
        valorUnitario: Number(item.precoUnitario),
        subtotal: Number(item.subtotal),
      };
    });

    return NextResponse.json({
      id: venda.id,
      numero: venda.numero,
      nomeCliente: venda.nomeCliente,
      formaPagamento: venda.formaPagamento,
      observacoes: venda.observacoes,
      desconto: Number(venda.desconto),
      total: Number(venda.total),
      createdAt: venda.createdAt,
      itens: itensComDisponivel,
      devolucoes: venda.devolucoes.map((dev) => ({
        id: dev.id,
        numero: dev.numero,
        tipo: dev.tipo,
        motivo: dev.motivo,
        motivoOutro: dev.motivoOutro,
        observacoes: dev.observacoes,
        valorTotal: Number(dev.valorTotal),
        createdAt: dev.createdAt,
        itens: dev.itens.map((item) => ({
          id: item.id,
          produtoId: item.produtoId,
          produto: item.produto,
          quantidadeDevolvida: Number(item.quantidadeDevolvida),
          valorUnitario: Number(item.valorUnitario),
          subtotal: Number(item.subtotal),
          produtoTrocaId: item.produtoTrocaId,
          produtoTroca: item.produtoTroca,
          quantidadeTroca: item.quantidadeTroca ? Number(item.quantidadeTroca) : null,
        })),
      })),
    });
  } catch (error: any) {
    console.error('[VENDA RAPIDA GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar venda' }, { status: 500 });
  }
}
