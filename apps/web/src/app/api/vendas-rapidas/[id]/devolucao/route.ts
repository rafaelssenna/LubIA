import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { executeStockOperations, StockOperation } from '@/lib/estoque';

interface ProdutoTroca {
  produtoId: number;
  produtoNome: string;
  quantidade: number;
  preco: number;
}

interface ItemDevolucao {
  itemVendaId: number;
  produtoId: number;
  quantidadeDevolvida: number;
  valorUnitario: number;
  // For TROCA - múltiplos produtos
  produtosTroca: ProdutoTroca[];
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
        // Validate that each item has at least one exchange product
        if (!itemDev.produtosTroca || itemDev.produtosTroca.length === 0) {
          return NextResponse.json(
            { error: 'Selecione ao menos um produto de troca para cada item' },
            { status: 400 }
          );
        }

        // Validate each exchange product
        for (const prodTroca of itemDev.produtosTroca) {
          const produto = await prisma.produto.findFirst({
            where: {
              id: prodTroca.produtoId,
              empresaId: session.empresaId,
              ativo: true,
            },
          });

          if (!produto) {
            return NextResponse.json(
              { error: `Produto de troca ${prodTroca.produtoId} não encontrado` },
              { status: 400 }
            );
          }

          if (Number(produto.quantidade) < prodTroca.quantidade) {
            return NextResponse.json(
              {
                error: `Estoque insuficiente para troca: "${produto.nome}". Disponível: ${Number(produto.quantidade)}`,
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

    // Calculate total value of exchange products (for TROCA) - soma todos os produtos
    const valorTroca = tipo === 'TROCA'
      ? itens.reduce(
          (acc, item) => acc + (item.produtosTroca || []).reduce(
            (sum, p) => sum + p.quantidade * p.preco,
            0
          ),
          0
        )
      : 0;

    // Calculate difference: positive = customer pays, negative = customer receives
    const diferencaTroca = valorTroca - valorTotal;

    // Create devolução in transaction
    const devolucao = await prisma.$transaction(async (tx) => {
      // Create devolução with items
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
            })),
          },
        },
        include: {
          itens: true,
        },
      });

      // Create exchange product records (for TROCA with multiple products)
      if (tipo === 'TROCA') {
        for (let i = 0; i < itens.length; i++) {
          const itemReq = itens[i];
          const itemDev = dev.itens[i];

          if (itemReq.produtosTroca && itemReq.produtosTroca.length > 0) {
            await tx.itemTrocaVendaRapida.createMany({
              data: itemReq.produtosTroca.map((prodTroca) => ({
                itemDevolucaoId: itemDev.id,
                produtoTrocaId: prodTroca.produtoId,
                quantidadeTroca: prodTroca.quantidade,
                precoTroca: prodTroca.preco,
              })),
            });
          }
        }
      }

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

        // For TROCA, subtract stock for each exchange product
        if (tipo === 'TROCA' && item.produtosTroca) {
          for (const prodTroca of item.produtosTroca) {
            stockOps.push({
              produtoId: prodTroca.produtoId,
              quantidade: prodTroca.quantidade,
              tipo: 'SAIDA',
              motivo: `Troca ${numeroDevolucao} - Produto substituto`,
              documento: numeroDevolucao,
              empresaId: session.empresaId,
            });
          }
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
