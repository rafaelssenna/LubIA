import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { executeStockOperations, StockOperation } from '@/lib/estoque';

interface ItemDevolucao {
  itemVendaId: number;
  produtoId: number;
  quantidadeDevolvida: number;
  valorUnitario: number;
  // For TROCA
  produtoTrocaId?: number;
  quantidadeTroca?: number;
  precoTroca?: number; // Preço unitário do produto de troca
}

interface DevolucaoRequest {
  tipo: 'TROCA' | 'REEMBOLSO';
  motivo: 'DEFEITO' | 'ARREPENDIMENTO' | 'OUTRO';
  motivoOutro?: string;
  observacoes?: string;
  itens: ItemDevolucao[];
}

export async function POST(
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

    const body: DevolucaoRequest = await request.json();
    const { tipo, motivo, motivoOutro, observacoes, itens } = body;

    // Validate request
    if (!tipo || !motivo || !itens || itens.length === 0) {
      return NextResponse.json(
        { error: 'Dados incompletos. Tipo, motivo e itens são obrigatórios.' },
        { status: 400 }
      );
    }

    // Verify venda exists and belongs to this empresa
    const venda = await prisma.vendaRapida.findFirst({
      where: {
        id: vendaId,
        empresaId: session.empresaId,
      },
      include: {
        itens: {
          include: {
            devolucoes: {
              select: {
                quantidadeDevolvida: true,
              },
            },
          },
        },
      },
    });

    if (!venda) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
    }

    // Validate each item quantity
    for (const itemDev of itens) {
      const itemVenda = venda.itens.find((i) => i.id === itemDev.itemVendaId);
      if (!itemVenda) {
        return NextResponse.json(
          { error: `Item de venda ${itemDev.itemVendaId} não encontrado` },
          { status: 400 }
        );
      }

      const totalDevolvido = itemVenda.devolucoes.reduce(
        (acc, dev) => acc + Number(dev.quantidadeDevolvida),
        0
      );
      const disponivel = Number(itemVenda.quantidade) - totalDevolvido;

      if (itemDev.quantidadeDevolvida > disponivel) {
        return NextResponse.json(
          {
            error: `Quantidade inválida para devolução. Disponível: ${disponivel}, solicitado: ${itemDev.quantidadeDevolvida}`,
          },
          { status: 400 }
        );
      }
    }

    // For TROCA, validate exchange products exist and have stock
    if (tipo === 'TROCA') {
      for (const itemDev of itens) {
        if (itemDev.produtoTrocaId && itemDev.quantidadeTroca) {
          const produtoTroca = await prisma.produto.findFirst({
            where: {
              id: itemDev.produtoTrocaId,
              empresaId: session.empresaId,
              ativo: true,
            },
          });

          if (!produtoTroca) {
            return NextResponse.json(
              { error: `Produto de troca ${itemDev.produtoTrocaId} não encontrado` },
              { status: 400 }
            );
          }

          if (Number(produtoTroca.quantidade) < itemDev.quantidadeTroca) {
            return NextResponse.json(
              {
                error: `Estoque insuficiente para troca: "${produtoTroca.nome}". Disponível: ${Number(produtoTroca.quantidade)}`,
              },
              { status: 400 }
            );
          }
        }
      }
    }

    // Generate devolução number
    const lastDevolucao = await prisma.devolucaoVendaRapida.findFirst({
      where: { empresaId: session.empresaId },
      orderBy: { id: 'desc' },
      select: { numero: true },
    });

    let nextNumber = 1;
    if (lastDevolucao?.numero) {
      const match = lastDevolucao.numero.match(/DEV-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    const numeroDevolucao = `DEV-${String(nextNumber).padStart(4, '0')}`;

    // Calculate total value of returned products
    const valorTotal = itens.reduce(
      (acc, item) => acc + item.quantidadeDevolvida * item.valorUnitario,
      0
    );

    // Calculate total value of exchange products (for TROCA)
    const valorTroca = tipo === 'TROCA'
      ? itens.reduce(
          (acc, item) => acc + (item.quantidadeTroca || 0) * (item.precoTroca || 0),
          0
        )
      : 0;

    // Calculate difference: positive = customer pays, negative = customer receives
    const diferencaTroca = valorTroca - valorTotal;

    // Create devolução in transaction
    const devolucao = await prisma.$transaction(async (tx) => {
      // Create devolução
      const dev = await tx.devolucaoVendaRapida.create({
        data: {
          empresaId: session.empresaId,
          vendaId,
          numero: numeroDevolucao,
          tipo,
          motivo,
          motivoOutro: motivo === 'OUTRO' ? motivoOutro : null,
          observacoes,
          valorTotal,
          valorTroca,
          diferencaTroca,
          itens: {
            create: itens.map((item) => ({
              itemVendaId: item.itemVendaId,
              produtoId: item.produtoId,
              quantidadeDevolvida: item.quantidadeDevolvida,
              valorUnitario: item.valorUnitario,
              subtotal: item.quantidadeDevolvida * item.valorUnitario,
              produtoTrocaId: tipo === 'TROCA' ? item.produtoTrocaId : null,
              quantidadeTroca: tipo === 'TROCA' ? item.quantidadeTroca : null,
              precoTroca: tipo === 'TROCA' ? item.precoTroca : null,
            })),
          },
        },
        include: {
          itens: true,
        },
      });

      // Stock operations
      const stockOps: StockOperation[] = [];

      // Return stock for returned products
      for (const item of itens) {
        stockOps.push({
          produtoId: item.produtoId,
          quantidade: item.quantidadeDevolvida,
          tipo: 'DEVOLUCAO',
          motivo: `Devolução ${numeroDevolucao} - ${tipo}`,
          documento: numeroDevolucao,
          empresaId: session.empresaId,
        });

        // For TROCA, also subtract stock of exchange product
        if (tipo === 'TROCA' && item.produtoTrocaId && item.quantidadeTroca) {
          stockOps.push({
            produtoId: item.produtoTrocaId,
            quantidade: item.quantidadeTroca,
            tipo: 'SAIDA',
            motivo: `Troca ${numeroDevolucao} - Produto substituto`,
            documento: numeroDevolucao,
            empresaId: session.empresaId,
          });
        }
      }

      await executeStockOperations(tx, stockOps);

      return dev;
    });

    return NextResponse.json({
      success: true,
      devolucao: {
        id: devolucao.id,
        numero: devolucao.numero,
        tipo: devolucao.tipo,
        motivo: devolucao.motivo,
        valorTotal: Number(devolucao.valorTotal),
        createdAt: devolucao.createdAt,
      },
    });
  } catch (error: any) {
    console.error('[DEVOLUCAO POST] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao criar devolução' }, { status: 500 });
  }
}
