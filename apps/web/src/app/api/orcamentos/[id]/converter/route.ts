import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { validateStock, executeStockOperations, StockOperation } from '@/lib/estoque';

// POST - Converter orçamento em O.S.
export async function POST(
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
    const body = await request.json().catch(() => ({}));
    const { dataAgendada, kmEntrada, veiculoId: bodyVeiculoId } = body;

    // Buscar orçamento com todos os itens
    const orcamento = await prisma.orcamento.findFirst({
      where: { id: orcamentoId, empresaId: session.empresaId },
      include: {
        veiculo: true,
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

    if (orcamento.status === 'CONVERTIDO') {
      return NextResponse.json({ error: 'Orçamento já foi convertido' }, { status: 400 });
    }

    if (orcamento.status === 'RECUSADO') {
      return NextResponse.json({ error: 'Orçamento foi recusado' }, { status: 400 });
    }

    // Veículo pode vir do orçamento ou do body (se informado)
    const veiculoId = orcamento.veiculoId || bodyVeiculoId;

    if (!veiculoId) {
      return NextResponse.json({
        error: 'Para converter em O.S., é necessário selecionar um veículo'
      }, { status: 400 });
    }

    // Verificar se o veículo existe
    const veiculo = await prisma.veiculo.findFirst({
      where: { id: veiculoId, empresaId: session.empresaId },
      include: { cliente: true },
    });

    if (!veiculo) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    // Prepare product items data
    const itensProdutoData = orcamento.itensProduto.map(i => ({
      produtoId: i.produtoId,
      quantidade: Number(i.quantidade),
      precoUnitario: Number(i.precoUnitario),
      desconto: Number(i.desconto),
      subtotal: Number(i.subtotal),
    }));

    // Validate stock before converting
    if (itensProdutoData.length > 0) {
      const stockOps: StockOperation[] = itensProdutoData.map(item => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        tipo: 'SAIDA' as const,
        motivo: 'Saída por O.S.',
        documento: '',
        empresaId: session.empresaId,
      }));

      const stockError = await validateStock(prisma, stockOps);
      if (stockError) {
        return NextResponse.json({ error: stockError }, { status: 400 });
      }
    }

    // Create O.S. from orcamento in a transaction
    const ordem = await prisma.$transaction(async (tx) => {
      // Gerar número sequencial por empresa
      const ultimaOrdem = await tx.ordemServico.findFirst({
        where: { empresaId: session.empresaId },
        orderBy: { id: 'desc' },
        select: { numero: true }
      });

      let proximoNumero = 1;
      if (ultimaOrdem?.numero) {
        const numeroAtual = parseInt(ultimaOrdem.numero, 10);
        if (!isNaN(numeroAtual)) {
          proximoNumero = numeroAtual + 1;
        }
      }
      const numeroFormatado = proximoNumero.toString().padStart(4, '0');

      // Prepare services data
      const itensData = orcamento.itens.map(i => ({
        servicoId: i.servicoId,
        quantidade: i.quantidade,
        precoUnitario: Number(i.precoUnitario),
        desconto: Number(i.desconto),
        subtotal: Number(i.subtotal),
      }));

      // Prepare extras data
      const servicosExtrasData = orcamento.servicosExtras.map(s => ({
        descricao: s.descricao,
        valor: Number(s.valor),
      }));

      // Create O.S.
      const novaOrdem = await tx.ordemServico.create({
        data: {
          numero: numeroFormatado,
          veiculoId: veiculoId,
          dataAgendada: dataAgendada ? new Date(dataAgendada) : null,
          kmEntrada: kmEntrada || veiculo.kmAtual || null,
          observacoes: orcamento.observacoes,
          total: Number(orcamento.total),
          empresaId: session.empresaId,
          itens: {
            create: itensData,
          },
          itensProduto: {
            create: itensProdutoData,
          },
          servicosExtras: {
            create: servicosExtrasData,
          },
        },
      });

      // Deduct stock
      if (itensProdutoData.length > 0) {
        await executeStockOperations(tx, itensProdutoData.map(item => ({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          tipo: 'SAIDA' as const,
          motivo: `Saída por O.S. ${novaOrdem.numero}`,
          documento: novaOrdem.numero,
          empresaId: session.empresaId,
        })));
      }

      // Update orcamento status and link to O.S.
      await tx.orcamento.update({
        where: { id: orcamentoId },
        data: {
          status: 'CONVERTIDO',
          ordemServicoId: novaOrdem.id,
        },
      });

      // Update vehicle km if provided
      if (kmEntrada && kmEntrada > (veiculo.kmAtual || 0)) {
        await tx.veiculo.update({
          where: { id: veiculoId },
          data: { kmAtual: kmEntrada },
        });
      }

      return novaOrdem;
    });

    return NextResponse.json({
      data: {
        id: ordem.id,
        numero: ordem.numero,
        status: ordem.status,
        total: Number(ordem.total),
        veiculo: {
          placa: veiculo.placa,
          cliente: veiculo.cliente?.nome || 'Avulso',
        },
      },
      message: `Orçamento convertido em O.S. #${ordem.numero}`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[ORCAMENTO CONVERTER] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao converter orçamento' }, { status: 500 });
  }
}
