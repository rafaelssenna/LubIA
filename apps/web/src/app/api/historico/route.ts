import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const busca = searchParams.get('busca') || '';
    const tipo = searchParams.get('tipo') || 'todos'; // 'todos', 'os', 'vendas'
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    const dateFilter: any = {};
    if (dataInicio && dataFim) {
      dateFilter.gte = new Date(dataInicio);
      dateFilter.lte = new Date(dataFim + 'T23:59:59');
    }

    // Build results array
    const results: any[] = [];

    // Fetch completed O.S. if tipo allows
    if (tipo === 'todos' || tipo === 'os') {
      const osWhere: any = {
        empresaId: session.empresaId,
        status: { in: ['CONCLUIDO', 'ENTREGUE'] },
      };

      if (busca) {
        osWhere.OR = [
          { numero: { contains: busca, mode: 'insensitive' } },
          { veiculo: { placa: { contains: busca, mode: 'insensitive' } } },
          { veiculo: { cliente: { nome: { contains: busca, mode: 'insensitive' } } } },
        ];
      }

      if (dataInicio && dataFim) {
        osWhere.dataConclusao = dateFilter;
      }

      const ordens = await prisma.ordemServico.findMany({
        where: osWhere,
        include: {
          veiculo: {
            include: {
              cliente: { select: { nome: true, telefone: true } },
            },
          },
          itens: {
            include: { servico: { select: { nome: true } } },
          },
          itensProduto: {
            include: { produto: { select: { nome: true } } },
          },
        },
        orderBy: { dataConclusao: 'desc' },
      });

      for (const o of ordens) {
        results.push({
          id: o.id,
          tipo: 'OS',
          numero: o.numero,
          cliente: o.veiculo.cliente.nome,
          telefone: o.veiculo.cliente.telefone,
          descricao: o.veiculo.placa + ' - ' + o.veiculo.marca + ' ' + o.veiculo.modelo,
          itens: [
            ...o.itens.map(i => i.servico.nome),
            ...o.itensProduto.map(i => i.produto.nome),
          ].slice(0, 3).join(', '),
          total: Number(o.total),
          formaPagamento: o.formaPagamento,
          data: o.dataConclusao || o.createdAt,
          status: o.status,
        });
      }
    }

    // Fetch Vendas Rápidas if tipo allows
    if (tipo === 'todos' || tipo === 'vendas') {
      const vrWhere: any = {
        empresaId: session.empresaId,
      };

      if (busca) {
        vrWhere.OR = [
          { numero: { contains: busca, mode: 'insensitive' } },
          { nomeCliente: { contains: busca, mode: 'insensitive' } },
        ];
      }

      if (dataInicio && dataFim) {
        vrWhere.createdAt = dateFilter;
      }

      const vendas = await prisma.vendaRapida.findMany({
        where: vrWhere,
        include: {
          itens: {
            include: { produto: { select: { nome: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      for (const v of vendas) {
        results.push({
          id: v.id,
          tipo: 'VENDA',
          numero: v.numero,
          cliente: v.nomeCliente || 'Balcão',
          telefone: null,
          descricao: 'Venda Rápida',
          itens: v.itens.map(i => i.produto.nome).slice(0, 3).join(', '),
          total: Number(v.total),
          formaPagamento: v.formaPagamento,
          data: v.createdAt,
          status: null,
        });
      }
    }

    // Sort by date descending
    results.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    // Paginate
    const total = results.length;
    const paginatedResults = results.slice((page - 1) * limit, page * limit);

    // Stats
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const [osHoje, vendasHoje, osFaturamento, vendasFaturamento] = await Promise.all([
      prisma.ordemServico.count({
        where: {
          empresaId: session.empresaId,
          status: { in: ['CONCLUIDO', 'ENTREGUE'] },
          dataConclusao: { gte: hoje },
        },
      }),
      prisma.vendaRapida.count({
        where: { empresaId: session.empresaId, createdAt: { gte: hoje } },
      }),
      prisma.ordemServico.aggregate({
        where: {
          empresaId: session.empresaId,
          status: { in: ['CONCLUIDO', 'ENTREGUE'] },
          dataConclusao: { gte: hoje },
        },
        _sum: { total: true },
      }),
      prisma.vendaRapida.aggregate({
        where: { empresaId: session.empresaId, createdAt: { gte: hoje } },
        _sum: { total: true },
      }),
    ]);

    const stats = {
      vendasHoje: osHoje + vendasHoje,
      faturamentoHoje: Number(osFaturamento._sum.total || 0) + Number(vendasFaturamento._sum.total || 0),
    };

    return NextResponse.json({
      data: paginatedResults,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[HISTORICO API] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao carregar histórico' }, { status: 500 });
  }
}
