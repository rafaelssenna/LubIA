import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Buscar ordem por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ordemId = parseInt(id);

    if (isNaN(ordemId)) {
      return NextResponse.json({ error: 'ID da ordem inválido' }, { status: 400 });
    }

    const ordem = await prisma.ordemServico.findUnique({
      where: { id: ordemId },
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
  try {
    const { id } = await params;
    const ordemId = parseInt(id);

    if (isNaN(ordemId)) {
      return NextResponse.json({ error: 'ID da ordem inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { status, dataAgendada, dataInicio, dataConclusao, kmEntrada, observacoes, itens, itensProduto } = body;

    // Verify order exists
    const existing = await prisma.ordemServico.findUnique({
      where: { id: ordemId },
      include: { veiculo: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 });
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

    if (dataAgendada !== undefined) updateData.dataAgendada = dataAgendada ? new Date(dataAgendada) : null;
    if (dataInicio !== undefined) updateData.dataInicio = dataInicio ? new Date(dataInicio) : null;
    if (dataConclusao !== undefined) updateData.dataConclusao = dataConclusao ? new Date(dataConclusao) : null;
    if (kmEntrada !== undefined) updateData.kmEntrada = kmEntrada;
    if (observacoes !== undefined) updateData.observacoes = observacoes;

    // If items are being updated, recalculate total
    if (itens !== undefined || itensProduto !== undefined) {
      // Delete existing items
      if (itens !== undefined) {
        await prisma.itemOrdem.deleteMany({ where: { ordemId } });
      }
      if (itensProduto !== undefined) {
        await prisma.itemOrdemProduto.deleteMany({ where: { ordemId } });
      }

      let totalServicos = 0;
      let totalProdutos = 0;

      // Recreate service items
      if (itens && itens.length > 0) {
        for (const item of itens) {
          const servico = await prisma.servico.findUnique({
            where: { id: item.servicoId },
          });
          if (servico) {
            const precoUnit = item.precoUnitario || Number(servico.precoBase);
            const qtd = item.quantidade || 1;
            const desc = item.desconto || 0;
            const subtotal = (precoUnit * qtd) - desc;
            totalServicos += subtotal;

            await prisma.itemOrdem.create({
              data: {
                ordemId,
                servicoId: item.servicoId,
                quantidade: qtd,
                precoUnitario: precoUnit,
                desconto: desc,
                subtotal,
              },
            });
          }
        }
      }

      // Recreate product items
      if (itensProduto && itensProduto.length > 0) {
        for (const item of itensProduto) {
          const produto = await prisma.produto.findUnique({
            where: { id: item.produtoId },
          });
          if (produto) {
            const precoUnit = item.precoUnitario || Number(produto.precoVenda);
            const qtd = item.quantidade || 1;
            const desc = item.desconto || 0;
            const subtotal = (precoUnit * qtd) - desc;
            totalProdutos += subtotal;

            await prisma.itemOrdemProduto.create({
              data: {
                ordemId,
                produtoId: item.produtoId,
                quantidade: qtd,
                precoUnitario: precoUnit,
                desconto: desc,
                subtotal,
              },
            });
          }
        }
      }

      updateData.total = totalServicos + totalProdutos;
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
  try {
    const { id } = await params;
    const ordemId = parseInt(id);

    if (isNaN(ordemId)) {
      return NextResponse.json({ error: 'ID da ordem inválido' }, { status: 400 });
    }

    // Check if order exists
    const ordem = await prisma.ordemServico.findUnique({
      where: { id: ordemId },
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

    await prisma.ordemServico.delete({
      where: { id: ordemId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[ORDEM API DELETE] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao excluir ordem de serviço' }, { status: 500 });
  }
}
