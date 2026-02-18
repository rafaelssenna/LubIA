import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateStock, executeStockOperations, StockOperation } from '@/lib/estoque';
import { getSession } from '@/lib/auth';

// GET - Buscar todas as vendas rápidas
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const busca = searchParams.get('busca') || '';
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    const where: any = {
      empresaId: session.empresaId,
    };

    if (busca) {
      where.OR = [
        { numero: { contains: busca, mode: 'insensitive' } },
        { nomeCliente: { contains: busca, mode: 'insensitive' } },
      ];
    }

    if (dataInicio && dataFim) {
      where.createdAt = {
        gte: new Date(dataInicio),
        lte: new Date(dataFim + 'T23:59:59'),
      };
    }

    // Contagem total com filtros (para paginação)
    const total = await prisma.vendaRapida.count({ where });

    const vendas = await prisma.vendaRapida.findMany({
      where,
      include: {
        itens: {
          include: {
            produto: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Stats
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const [statsTotal, statsHoje, statsTotalValor] = await Promise.all([
      prisma.vendaRapida.count({ where: { empresaId: session.empresaId } }),
      prisma.vendaRapida.count({
        where: { empresaId: session.empresaId, createdAt: { gte: hoje } },
      }),
      prisma.vendaRapida.aggregate({
        where: { empresaId: session.empresaId, createdAt: { gte: hoje } },
        _sum: { total: true },
      }),
    ]);

    const stats = {
      total: statsTotal,
      hoje: statsHoje,
      faturamentoHoje: Number(statsTotalValor._sum.total || 0),
    };

    return NextResponse.json({
      data: vendas.map(v => ({
        id: v.id,
        numero: v.numero,
        nomeCliente: v.nomeCliente,
        observacoes: v.observacoes,
        total: Number(v.total),
        createdAt: v.createdAt,
        itens: v.itens.map(i => ({
          id: i.id,
          produtoId: i.produtoId,
          produtoNome: i.produto.nome,
          produtoCodigo: i.produto.codigo,
          quantidade: Number(i.quantidade),
          precoUnitario: Number(i.precoUnitario),
          desconto: Number(i.desconto),
          subtotal: Number(i.subtotal),
        })),
      })),
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[VENDAS RAPIDAS API GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar vendas rápidas' }, { status: 500 });
  }
}

// POST - Criar nova venda rápida
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nomeCliente, observacoes, itens } = body;

    if (!itens || itens.length === 0) {
      return NextResponse.json({ error: 'Adicione pelo menos um produto' }, { status: 400 });
    }

    // Calculate total from products
    let totalVenda = 0;
    const itensData: any[] = [];

    for (const item of itens) {
      const produto = await prisma.produto.findFirst({
        where: { id: item.produtoId, empresaId: session.empresaId },
      });
      if (produto) {
        const precoUnit = item.precoUnitario || Number(produto.precoVenda);
        const qtd = item.quantidade || 1;
        const desc = item.desconto || 0;
        const subtotal = (precoUnit * qtd) - desc;
        totalVenda += subtotal;
        itensData.push({
          produtoId: item.produtoId,
          quantidade: qtd,
          precoUnitario: precoUnit,
          desconto: desc,
          subtotal,
        });
      }
    }

    // Validar estoque antes de criar
    const stockOps: StockOperation[] = itensData.map(item => ({
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      tipo: 'SAIDA' as const,
      motivo: 'Venda Rápida',
      documento: '',
      empresaId: session.empresaId,
    }));

    const stockError = await validateStock(prisma, stockOps);
    if (stockError) {
      return NextResponse.json({ error: stockError }, { status: 400 });
    }

    // Create sale AND deduct stock in a transaction
    const venda = await prisma.$transaction(async (tx) => {
      // Gerar número sequencial por empresa (VR-0001, VR-0002...)
      const ultimaVenda = await tx.vendaRapida.findFirst({
        where: { empresaId: session.empresaId },
        orderBy: { id: 'desc' },
        select: { numero: true }
      });

      let proximoNumero = 1;
      if (ultimaVenda?.numero) {
        const match = ultimaVenda.numero.match(/VR-(\d+)/);
        if (match) {
          proximoNumero = parseInt(match[1], 10) + 1;
        }
      }
      const numeroFormatado = `VR-${proximoNumero.toString().padStart(4, '0')}`;

      const novaVenda = await tx.vendaRapida.create({
        data: {
          numero: numeroFormatado,
          nomeCliente: nomeCliente || null,
          observacoes: observacoes || null,
          total: totalVenda,
          empresaId: session.empresaId,
          itens: {
            create: itensData,
          },
        },
        include: {
          itens: {
            include: {
              produto: true,
            },
          },
        },
      });

      // Deduzir estoque
      await executeStockOperations(tx, itensData.map(item => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        tipo: 'SAIDA' as const,
        motivo: `Venda Rápida ${novaVenda.numero}`,
        documento: novaVenda.numero,
        empresaId: session.empresaId,
      })));

      return novaVenda;
    });

    return NextResponse.json({
      data: {
        id: venda.id,
        numero: venda.numero,
        total: Number(venda.total),
        itens: venda.itens.length,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[VENDAS RAPIDAS API POST] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao criar venda rápida' }, { status: 500 });
  }
}
