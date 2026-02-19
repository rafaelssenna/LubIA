import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { executeStockOperations, hasStockMovements, StockOperation } from '@/lib/estoque';
import { getSession } from '@/lib/auth';

// Mapa de transições de status válidas
const VALID_TRANSITIONS: Record<string, string[]> = {
  AGENDADO: ['EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'],
  EM_ANDAMENTO: ['CONCLUIDO', 'AGUARDANDO_PECAS', 'CANCELADO'],
  AGUARDANDO_PECAS: ['EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'],
  CONCLUIDO: ['ENTREGUE'],
  CANCELADO: [],
  ENTREGUE: [],
};

// GET - Buscar ordem por ID
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
    const ordemId = parseInt(id);

    if (isNaN(ordemId)) {
      return NextResponse.json({ error: 'ID da ordem inválido' }, { status: 400 });
    }

    const ordem = await prisma.ordemServico.findFirst({
      where: { id: ordemId, empresaId: session.empresaId },
      include: {
        veiculo: {
          include: {
            cliente: true,
          },
        },
        itens: {
          include: {
            servico: true,
          },
        },
        itensProduto: {
          include: {
            produto: true,
          },
        },
        servicosExtras: true,
      },
    });

    if (!ordem) {
      return NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: ordem.id,
        numero: ordem.numero,
        status: ordem.status,
        dataAgendada: ordem.dataAgendada,
        dataInicio: ordem.dataInicio,
        dataConclusao: ordem.dataConclusao,
        kmEntrada: ordem.kmEntrada,
        observacoes: ordem.observacoes,
        total: Number(ordem.total),
        createdAt: ordem.createdAt,
        updatedAt: ordem.updatedAt,
        veiculo: {
          id: ordem.veiculo.id,
          placa: ordem.veiculo.placa,
          marca: ordem.veiculo.marca,
          modelo: ordem.veiculo.modelo,
          ano: ordem.veiculo.ano,
          kmAtual: ordem.veiculo.kmAtual,
          cliente: {
            id: ordem.veiculo.cliente.id,
            nome: ordem.veiculo.cliente.nome,
            telefone: ordem.veiculo.cliente.telefone,
            email: ordem.veiculo.cliente.email,
          },
        },
        itens: ordem.itens.map(i => ({
          id: i.id,
          servicoId: i.servicoId,
          servicoNome: i.servico.nome,
          quantidade: i.quantidade,
          precoUnitario: Number(i.precoUnitario),
          desconto: Number(i.desconto),
          subtotal: Number(i.subtotal),
        })),
        itensProduto: ordem.itensProduto.map(i => ({
          id: i.id,
          produtoId: i.produtoId,
          produtoNome: i.produto.nome,
          produtoCodigo: i.produto.codigo,
          quantidade: Number(i.quantidade),
          precoUnitario: Number(i.precoUnitario),
          desconto: Number(i.desconto),
          subtotal: Number(i.subtotal),
        })),
        servicosExtras: ordem.servicosExtras.map(s => ({
          id: s.id,
          descricao: s.descricao,
          valor: Number(s.valor),
        })),
      },
    });
  } catch (error: any) {
    console.error('[ORDEM API GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar ordem de serviço' }, { status: 500 });
  }
}

// PUT - Atualizar ordem de serviço
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const ordemId = parseInt(id);

    if (isNaN(ordemId)) {
      return NextResponse.json({ error: 'ID da ordem inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { status, veiculoId, dataAgendada, dataInicio, dataConclusao, kmEntrada, observacoes, itens, itensProduto, servicosExtras, formaPagamento } = body;

    // Verify order exists and belongs to this empresa
    const existing = await prisma.ordemServico.findFirst({
      where: { id: ordemId, empresaId: session.empresaId },
      include: { veiculo: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 });
    }

    // Validar transição de status
    if (status !== undefined && status !== existing.status) {
      const allowed = VALID_TRANSITIONS[existing.status];
      if (!allowed || !allowed.includes(status)) {
        return NextResponse.json({
          error: `Transição de status inválida: ${existing.status} → ${status}`,
        }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (status !== undefined) {
      updateData.status = status;
      // Auto-set dates based on status
      if (status === 'EM_ANDAMENTO' && !existing.dataInicio) {
        updateData.dataInicio = new Date();
      }
      if ((status === 'CONCLUIDO' || status === 'ENTREGUE') && !existing.dataConclusao) {
        updateData.dataConclusao = new Date();
      }
    }

    if (veiculoId !== undefined) updateData.veiculoId = veiculoId;
    if (dataAgendada !== undefined) updateData.dataAgendada = dataAgendada ? new Date(dataAgendada) : null;
    if (dataInicio !== undefined) updateData.dataInicio = dataInicio ? new Date(dataInicio) : null;
    if (dataConclusao !== undefined) updateData.dataConclusao = dataConclusao ? new Date(dataConclusao) : null;
    if (kmEntrada !== undefined) updateData.kmEntrada = kmEntrada;
    if (observacoes !== undefined) updateData.observacoes = observacoes;
    if (formaPagamento !== undefined) updateData.formaPagamento = formaPagamento;

    // If items are being updated, recalculate total and handle stock
    if (itens !== undefined || itensProduto !== undefined || servicosExtras !== undefined) {
      // Fetch old product items BEFORE deleting
      const oldProdutoItems = await prisma.itemOrdemProduto.findMany({
        where: { ordemId },
      });

      // Prepare new items data
      let totalServicos = 0;
      let totalProdutos = 0;
      let totalExtras = 0;
      const newItensData: any[] = [];
      const newItensProdutoData: any[] = [];
      const newServicosExtrasData: { descricao: string; valor: number }[] = [];

      // Process service items
      if (itens && itens.length > 0) {
        for (const item of itens) {
          const servico = await prisma.servico.findFirst({
            where: { id: item.servicoId, empresaId: session.empresaId },
          });
          if (servico) {
            const precoUnit = item.precoUnitario || Number(servico.precoBase);
            const qtd = item.quantidade || 1;
            const desc = item.desconto || 0;
            const subtotal = (precoUnit * qtd) - desc;
            totalServicos += subtotal;
            newItensData.push({
              servicoId: item.servicoId,
              quantidade: qtd,
              precoUnitario: precoUnit,
              desconto: desc,
              subtotal,
            });
          }
        }
      }

      // Process product items
      if (itensProduto && itensProduto.length > 0) {
        for (const item of itensProduto) {
          const produto = await prisma.produto.findFirst({
            where: { id: item.produtoId, empresaId: session.empresaId },
          });
          if (produto) {
            const precoUnit = item.precoUnitario || Number(produto.precoVenda);
            const qtd = item.quantidade || 1;
            const desc = item.desconto || 0;
            const subtotal = (precoUnit * qtd) - desc;
            totalProdutos += subtotal;
            newItensProdutoData.push({
              produtoId: item.produtoId,
              quantidade: qtd,
              precoUnitario: precoUnit,
              desconto: desc,
              subtotal,
            });
          }
        }
      }

      // Process serviços extras
      if (servicosExtras && servicosExtras.length > 0) {
        for (const extra of servicosExtras) {
          if (extra.descricao && extra.valor > 0) {
            totalExtras += extra.valor;
            newServicosExtrasData.push({
              descricao: extra.descricao,
              valor: extra.valor,
            });
          }
        }
      }

      // Calculate stock operations (restore old, deduct new)
      const stockOps: StockOperation[] = [];

      // Restore old quantities
      for (const old of oldProdutoItems) {
        stockOps.push({
          produtoId: old.produtoId,
          quantidade: Number(old.quantidade),
          tipo: 'DEVOLUCAO',
          motivo: `Devolução por edição da O.S. ${existing.numero}`,
          documento: existing.numero,
          empresaId: session.empresaId,
        });
      }

      // Deduct new quantities
      for (const newItem of newItensProdutoData) {
        stockOps.push({
          produtoId: newItem.produtoId,
          quantidade: newItem.quantidade,
          tipo: 'SAIDA',
          motivo: `Saída por edição da O.S. ${existing.numero}`,
          documento: existing.numero,
          empresaId: session.empresaId,
        });
      }

      // Validate net stock effect
      const netEffect: Record<number, number> = {};
      for (const op of stockOps) {
        if (!netEffect[op.produtoId]) netEffect[op.produtoId] = 0;
        if (op.tipo === 'SAIDA') netEffect[op.produtoId] -= op.quantidade;
        else netEffect[op.produtoId] += op.quantidade;
      }

      // Check each product
      for (const [produtoIdStr, netChange] of Object.entries(netEffect)) {
        if (netChange < 0) {
          const produto = await prisma.produto.findUnique({ where: { id: parseInt(produtoIdStr) } });
          if (produto && Number(produto.quantidade) + netChange < 0) {
            return NextResponse.json({
              error: `Estoque insuficiente para "${produto.nome}": disponível ${Number(produto.quantidade)}, necessário ${Math.abs(netChange)}`
            }, { status: 400 });
          }
        }
      }

      // Execute everything in a transaction
      updateData.total = totalServicos + totalProdutos + totalExtras;

      const ordem = await prisma.$transaction(async (tx) => {
        // Delete old items
        if (itens !== undefined) await tx.itemOrdem.deleteMany({ where: { ordemId } });
        if (itensProduto !== undefined) await tx.itemOrdemProduto.deleteMany({ where: { ordemId } });
        if (servicosExtras !== undefined) await tx.servicoExtra.deleteMany({ where: { ordemId } });

        // Recreate service items
        for (const item of newItensData) {
          await tx.itemOrdem.create({ data: { ordemId, ...item } });
        }

        // Recreate product items
        for (const item of newItensProdutoData) {
          await tx.itemOrdemProduto.create({ data: { ordemId, ...item } });
        }

        // Recreate serviços extras
        for (const extra of newServicosExtrasData) {
          await tx.servicoExtra.create({ data: { ordemId, ...extra } });
        }

        // Execute stock operations
        if (stockOps.length > 0) {
          await executeStockOperations(tx, stockOps);
        }

        // Update order
        return tx.ordemServico.update({
          where: { id: ordemId },
          data: updateData,
          include: {
            veiculo: { include: { cliente: true } },
          },
        });
      });

      // Update vehicle km if provided and higher
      if (kmEntrada && kmEntrada > (existing.veiculo.kmAtual || 0)) {
        await prisma.veiculo.update({
          where: { id: existing.veiculoId },
          data: { kmAtual: kmEntrada },
        });
      }

      return NextResponse.json({
        data: {
          id: ordem.id,
          numero: ordem.numero,
          status: ordem.status,
          total: Number(ordem.total),
        },
      });
    }

    // Handle status change to CANCELADO - restore stock
    if (status === 'CANCELADO' && existing.status !== 'CANCELADO') {
      const produtoItems = await prisma.itemOrdemProduto.findMany({ where: { ordemId } });
      const hasMovements = await hasStockMovements(prisma, existing.numero);

      if (produtoItems.length > 0 && hasMovements) {
        const stockOps: StockOperation[] = produtoItems.map(item => ({
          produtoId: item.produtoId,
          quantidade: Number(item.quantidade),
          tipo: 'DEVOLUCAO' as const,
          motivo: `Devolução por cancelamento da O.S. ${existing.numero}`,
          documento: existing.numero,
          empresaId: session.empresaId,
        }));

        const ordem = await prisma.$transaction(async (tx) => {
          await executeStockOperations(tx, stockOps);
          return tx.ordemServico.update({
            where: { id: ordemId },
            data: updateData,
            include: { veiculo: { include: { cliente: true } } },
          });
        });

        return NextResponse.json({
          data: {
            id: ordem.id,
            numero: ordem.numero,
            status: ordem.status,
            total: Number(ordem.total),
          },
        });
      }
    }

    const ordem = await prisma.ordemServico.update({
      where: { id: ordemId },
      data: updateData,
      include: {
        veiculo: {
          include: {
            cliente: true,
          },
        },
      },
    });

    // Update vehicle km if provided and higher
    if (kmEntrada && kmEntrada > (existing.veiculo.kmAtual || 0)) {
      await prisma.veiculo.update({
        where: { id: existing.veiculoId },
        data: { kmAtual: kmEntrada },
      });
    }

    return NextResponse.json({
      data: {
        id: ordem.id,
        numero: ordem.numero,
        status: ordem.status,
        total: Number(ordem.total),
      },
    });
  } catch (error: any) {
    console.error('[ORDEM API PUT] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao atualizar ordem de serviço' }, { status: 500 });
  }
}

// DELETE - Excluir ordem de serviço
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const ordemId = parseInt(id);

    if (isNaN(ordemId)) {
      return NextResponse.json({ error: 'ID da ordem inválido' }, { status: 400 });
    }

    // Check if order exists and belongs to this empresa
    const ordem = await prisma.ordemServico.findFirst({
      where: { id: ordemId, empresaId: session.empresaId },
    });

    if (!ordem) {
      return NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 });
    }

    // Only allow deletion of orders that are not completed
    if (ordem.status === 'CONCLUIDO' || ordem.status === 'ENTREGUE') {
      return NextResponse.json({
        error: 'Não é possível excluir uma ordem já concluída ou entregue',
      }, { status: 400 });
    }

    // Restore stock before deleting (only if there are existing SAIDA movements)
    const produtoItems = await prisma.itemOrdemProduto.findMany({ where: { ordemId } });
    const hasMovements = await hasStockMovements(prisma, ordem.numero);

    if (produtoItems.length > 0 && hasMovements) {
      const stockOps: StockOperation[] = produtoItems.map(item => ({
        produtoId: item.produtoId,
        quantidade: Number(item.quantidade),
        tipo: 'DEVOLUCAO' as const,
        motivo: `Devolução por exclusão da O.S. ${ordem.numero}`,
        documento: ordem.numero,
        empresaId: session.empresaId,
      }));

      await prisma.$transaction(async (tx) => {
        await executeStockOperations(tx, stockOps);
        await tx.ordemServico.delete({ where: { id: ordemId } });
      });
    } else {
      await prisma.ordemServico.delete({
        where: { id: ordemId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[ORDEM API DELETE] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao excluir ordem de serviço' }, { status: 500 });
  }
}
