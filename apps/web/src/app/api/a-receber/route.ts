import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET - Buscar todas as pendências (ordens e vendas não pagas)
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') || 'todos'; // 'ordens', 'vendas', 'todos'

    const pendencias: any[] = [];

    // Buscar O.S. não pagas
    if (tipo === 'todos' || tipo === 'ordens') {
      const ordensNaoPagas = await prisma.ordemServico.findMany({
        where: {
          empresaId: session.empresaId,
          pago: false,
          status: 'CONCLUIDO',
        },
        include: {
          veiculo: {
            include: {
              cliente: true,
            },
          },
        },
        orderBy: { dataPagamentoPrevista: 'asc' },
      });

      for (const ordem of ordensNaoPagas) {
        pendencias.push({
          id: ordem.id,
          tipo: 'ORDEM',
          numero: ordem.numero,
          cliente: ordem.veiculo.cliente.nome,
          telefone: ordem.veiculo.cliente.telefone,
          total: Number(ordem.total),
          dataCriacao: ordem.createdAt,
          dataConclusao: ordem.dataConclusao,
          dataPagamentoPrevista: ordem.dataPagamentoPrevista,
          veiculo: `${ordem.veiculo.marca} ${ordem.veiculo.modelo} - ${ordem.veiculo.placa}`,
        });
      }
    }

    // Buscar Vendas Rápidas não pagas
    if (tipo === 'todos' || tipo === 'vendas') {
      const vendasNaoPagas = await prisma.vendaRapida.findMany({
        where: {
          empresaId: session.empresaId,
          pago: false,
        },
        orderBy: { dataPagamentoPrevista: 'asc' },
      });

      for (const venda of vendasNaoPagas) {
        pendencias.push({
          id: venda.id,
          tipo: 'VENDA',
          numero: venda.numero,
          cliente: venda.nomeCliente || 'Balcão',
          telefone: null,
          total: Number(venda.total),
          dataCriacao: venda.createdAt,
          dataConclusao: venda.createdAt,
          dataPagamentoPrevista: venda.dataPagamentoPrevista,
          veiculo: null,
        });
      }
    }

    // Ordenar por data prevista (nulls no final)
    pendencias.sort((a, b) => {
      if (!a.dataPagamentoPrevista && !b.dataPagamentoPrevista) return 0;
      if (!a.dataPagamentoPrevista) return 1;
      if (!b.dataPagamentoPrevista) return -1;
      return new Date(a.dataPagamentoPrevista).getTime() - new Date(b.dataPagamentoPrevista).getTime();
    });

    // Calcular totais
    const totalPendente = pendencias.reduce((acc, p) => acc + p.total, 0);
    const totalOrdens = pendencias.filter(p => p.tipo === 'ORDEM').reduce((acc, p) => acc + p.total, 0);
    const totalVendas = pendencias.filter(p => p.tipo === 'VENDA').reduce((acc, p) => acc + p.total, 0);

    return NextResponse.json({
      data: pendencias,
      stats: {
        total: pendencias.length,
        totalPendente,
        ordens: pendencias.filter(p => p.tipo === 'ORDEM').length,
        totalOrdens,
        vendas: pendencias.filter(p => p.tipo === 'VENDA').length,
        totalVendas,
      },
    });
  } catch (error: any) {
    console.error('[A RECEBER API GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar pendências' }, { status: 500 });
  }
}

// PUT - Marcar como pago
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, tipo, formaPagamento } = body;

    if (!id || !tipo) {
      return NextResponse.json({ error: 'ID e tipo são obrigatórios' }, { status: 400 });
    }

    if (tipo === 'ORDEM') {
      const ordem = await prisma.ordemServico.findFirst({
        where: { id, empresaId: session.empresaId },
      });

      if (!ordem) {
        return NextResponse.json({ error: 'Ordem não encontrada' }, { status: 404 });
      }

      await prisma.ordemServico.update({
        where: { id },
        data: {
          pago: true,
          dataPagamento: new Date(),
          formaPagamento: formaPagamento || null,
        },
      });
    } else if (tipo === 'VENDA') {
      const venda = await prisma.vendaRapida.findFirst({
        where: { id, empresaId: session.empresaId },
      });

      if (!venda) {
        return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
      }

      await prisma.vendaRapida.update({
        where: { id },
        data: {
          pago: true,
          dataPagamento: new Date(),
          formaPagamento: formaPagamento || null,
        },
      });
    } else {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[A RECEBER API PUT] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao marcar como pago' }, { status: 500 });
  }
}
