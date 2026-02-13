import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET - Buscar orçamento por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const orcamentoId = parseInt(id);

  try {
    const orcamento = await prisma.orcamento.findFirst({
      where: { id: orcamentoId, empresaId: session.empresaId },
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

    if (!orcamento) {
      return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: orcamento.id,
        numero: orcamento.numero,
        status: orcamento.status,
        validade: orcamento.validade,
        observacoes: orcamento.observacoes,
        total: Number(orcamento.total),
        ordemServicoId: orcamento.ordemServicoId,
        createdAt: orcamento.createdAt,
        veiculo: {
          id: orcamento.veiculo.id,
          placa: orcamento.veiculo.placa,
          marca: orcamento.veiculo.marca,
          modelo: orcamento.veiculo.modelo,
          ano: orcamento.veiculo.ano,
          kmAtual: orcamento.veiculo.kmAtual,
          cliente: {
            id: orcamento.veiculo.cliente.id,
            nome: orcamento.veiculo.cliente.nome,
            telefone: orcamento.veiculo.cliente.telefone,
            email: orcamento.veiculo.cliente.email,
          },
        },
        itens: orcamento.itens.map(i => ({
          id: i.id,
          servicoId: i.servicoId,
          servicoNome: i.servico.nome,
          quantidade: i.quantidade,
          precoUnitario: Number(i.precoUnitario),
          desconto: Number(i.desconto),
          subtotal: Number(i.subtotal),
        })),
        itensProduto: orcamento.itensProduto.map(i => ({
          id: i.id,
          produtoId: i.produtoId,
          produtoNome: i.produto.nome,
          quantidade: Number(i.quantidade),
          precoUnitario: Number(i.precoUnitario),
          desconto: Number(i.desconto),
          subtotal: Number(i.subtotal),
        })),
        servicosExtras: orcamento.servicosExtras.map(s => ({
          id: s.id,
          descricao: s.descricao,
          valor: Number(s.valor),
        })),
      },
    });
  } catch (error: any) {
    console.error('[ORCAMENTO API GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar orçamento' }, { status: 500 });
  }
}

// PUT - Atualizar orçamento
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const orcamentoId = parseInt(id);

  try {
    const body = await request.json();
    const { status, validade, observacoes, itens, itensProduto, servicosExtras } = body;

    // Verify orcamento exists and belongs to this empresa
    const orcamentoExistente = await prisma.orcamento.findFirst({
      where: { id: orcamentoId, empresaId: session.empresaId },
    });

    if (!orcamentoExistente) {
      return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    }

    // Não permite editar se já foi convertido
    if (orcamentoExistente.status === 'CONVERTIDO') {
      return NextResponse.json({ error: 'Orçamento já foi convertido em O.S.' }, { status: 400 });
    }

    // Calculate totals if items provided
    let total = Number(orcamentoExistente.total);
    let itensData: any[] | undefined;
    let itensProdutoData: any[] | undefined;
    let servicosExtrasData: any[] | undefined;

    if (itens !== undefined || itensProduto !== undefined || servicosExtras !== undefined) {
      // Recalculate all totals
      let totalServicos = 0;
      itensData = [];
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
            itensData.push({
              servicoId: item.servicoId,
              quantidade: qtd,
              precoUnitario: precoUnit,
              desconto: desc,
              subtotal,
            });
          }
        }
      }

      let totalProdutos = 0;
      itensProdutoData = [];
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
            itensProdutoData.push({
              produtoId: item.produtoId,
              quantidade: qtd,
              precoUnitario: precoUnit,
              desconto: desc,
              subtotal,
            });
          }
        }
      }

      let totalExtras = 0;
      servicosExtrasData = [];
      if (servicosExtras && servicosExtras.length > 0) {
        for (const extra of servicosExtras) {
          if (extra.descricao && extra.valor > 0) {
            totalExtras += extra.valor;
            servicosExtrasData.push({
              descricao: extra.descricao,
              valor: extra.valor,
            });
          }
        }
      }

      total = totalServicos + totalProdutos + totalExtras;
    }

    // Update orcamento
    const orcamento = await prisma.$transaction(async (tx) => {
      // Delete existing items if new ones provided
      if (itensData !== undefined) {
        await tx.itemOrcamento.deleteMany({ where: { orcamentoId } });
      }
      if (itensProdutoData !== undefined) {
        await tx.itemOrcamentoProduto.deleteMany({ where: { orcamentoId } });
      }
      if (servicosExtrasData !== undefined) {
        await tx.servicoExtraOrcamento.deleteMany({ where: { orcamentoId } });
      }

      const updated = await tx.orcamento.update({
        where: { id: orcamentoId },
        data: {
          ...(status && { status }),
          ...(validade && { validade: new Date(validade) }),
          ...(observacoes !== undefined && { observacoes }),
          total,
          ...(itensData && {
            itens: {
              create: itensData,
            },
          }),
          ...(itensProdutoData && {
            itensProduto: {
              create: itensProdutoData,
            },
          }),
          ...(servicosExtrasData && {
            servicosExtras: {
              create: servicosExtrasData,
            },
          }),
        },
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

      return updated;
    });

    return NextResponse.json({
      data: {
        id: orcamento.id,
        numero: orcamento.numero,
        status: orcamento.status,
        validade: orcamento.validade,
        total: Number(orcamento.total),
      },
    });
  } catch (error: any) {
    console.error('[ORCAMENTO API PUT] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao atualizar orçamento' }, { status: 500 });
  }
}

// DELETE - Excluir orçamento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const orcamentoId = parseInt(id);

  try {
    const orcamento = await prisma.orcamento.findFirst({
      where: { id: orcamentoId, empresaId: session.empresaId },
    });

    if (!orcamento) {
      return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    }

    // Não permite excluir se já foi convertido
    if (orcamento.status === 'CONVERTIDO') {
      return NextResponse.json({ error: 'Orçamento já foi convertido em O.S. e não pode ser excluído' }, { status: 400 });
    }

    await prisma.orcamento.delete({
      where: { id: orcamentoId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[ORCAMENTO API DELETE] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao excluir orçamento' }, { status: 500 });
  }
}
