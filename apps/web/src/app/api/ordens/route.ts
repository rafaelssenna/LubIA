import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Buscar todas as ordens de serviço
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const busca = searchParams.get('busca') || '';
    const status = searchParams.get('status') || '';
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');

    const where: any = {};

    if (busca) {
      where.OR = [
        { numero: { contains: busca, mode: 'insensitive' } },
        { veiculo: { placa: { contains: busca, mode: 'insensitive' } } },
        { veiculo: { cliente: { nome: { contains: busca, mode: 'insensitive' } } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (dataInicio && dataFim) {
      where.createdAt = {
        gte: new Date(dataInicio),
        lte: new Date(dataFim + 'T23:59:59'),
      };
    }

    const ordens = await prisma.ordemServico.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });

    // Get stats
    const allOrdens = await prisma.ordemServico.findMany();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const stats = {
      total: allOrdens.length,
      abertas: allOrdens.filter(o => ['AGENDADO', 'EM_ANDAMENTO', 'AGUARDANDO_PECAS'].includes(o.status)).length,
      concluidas: allOrdens.filter(o => o.status === 'CONCLUIDO' || o.status === 'ENTREGUE').length,
      hoje: allOrdens.filter(o => {
        const dataOrdem = new Date(o.createdAt);
        dataOrdem.setHours(0, 0, 0, 0);
        return dataOrdem.getTime() === hoje.getTime();
      }).length,
    };

    return NextResponse.json({
      data: ordens.map(o => ({
        id: o.id,
        numero: o.numero,
        status: o.status,
        dataAgendada: o.dataAgendada,
        dataInicio: o.dataInicio,
        dataConclusao: o.dataConclusao,
        kmEntrada: o.kmEntrada,
        observacoes: o.observacoes,
        total: Number(o.total),
        createdAt: o.createdAt,
        veiculo: {
          id: o.veiculo.id,
          placa: o.veiculo.placa,
          marca: o.veiculo.marca,
          modelo: o.veiculo.modelo,
          ano: o.veiculo.ano,
          cliente: {
            id: o.veiculo.cliente.id,
            nome: o.veiculo.cliente.nome,
            telefone: o.veiculo.cliente.telefone,
          },
        },
        itens: o.itens.map(i => ({
          id: i.id,
          servicoId: i.servicoId,
          servicoNome: i.servico.nome,
          quantidade: i.quantidade,
          precoUnitario: Number(i.precoUnitario),
          desconto: Number(i.desconto),
          subtotal: Number(i.subtotal),
        })),
        itensProduto: o.itensProduto.map(i => ({
          id: i.id,
          produtoId: i.produtoId,
          produtoNome: i.produto.nome,
          quantidade: Number(i.quantidade),
          precoUnitario: Number(i.precoUnitario),
          desconto: Number(i.desconto),
          subtotal: Number(i.subtotal),
        })),
      })),
      stats,
    });
  } catch (error: any) {
    console.error('[ORDENS API GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar ordens de serviço' }, { status: 500 });
  }
}

// POST - Criar nova ordem de serviço
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { veiculoId, dataAgendada, kmEntrada, observacoes, itens, itensProduto } = body;

    if (!veiculoId) {
      return NextResponse.json({ error: 'Veículo é obrigatório' }, { status: 400 });
    }

    // Verify vehicle exists
    const veiculo = await prisma.veiculo.findUnique({
      where: { id: veiculoId },
    });

    if (!veiculo) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    // Calculate total from services
    let totalServicos = 0;
    const itensData = [];
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

    // Calculate total from products
    let totalProdutos = 0;
    const itensProdutoData = [];
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

    const total = totalServicos + totalProdutos;

    // Create order with items
    const ordem = await prisma.ordemServico.create({
      data: {
        veiculoId,
        dataAgendada: dataAgendada ? new Date(dataAgendada) : null,
        kmEntrada: kmEntrada || null,
        observacoes: observacoes || null,
        total,
        itens: {
          create: itensData,
        },
        itensProduto: {
          create: itensProdutoData,
        },
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
      },
    });

    // Update vehicle km if provided
    if (kmEntrada && kmEntrada > (veiculo.kmAtual || 0)) {
      await prisma.veiculo.update({
        where: { id: veiculoId },
        data: { kmAtual: kmEntrada },
      });
    }

    return NextResponse.json({
      data: {
        id: ordem.id,
        numero: ordem.numero,
        status: ordem.status,
        total: Number(ordem.total),
        veiculo: {
          placa: ordem.veiculo.placa,
          cliente: ordem.veiculo.cliente.nome,
        },
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[ORDENS API POST] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao criar ordem de serviço' }, { status: 500 });
  }
}
