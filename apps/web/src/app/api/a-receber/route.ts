import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET - Buscar pagamentos pendentes (crédito pessoal não pago)
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') || 'todos'; // 'ordens', 'vendas', 'todos'

    const pendencias: any[] = [];
    const idsJaAdicionados = new Set<string>();

    // ========================================
    // MÉTODO 1: Buscar na tabela Pagamento (novo sistema)
    // ========================================
    const whereBase = {
      empresaId: session.empresaId,
      tipo: 'CREDITO_PESSOAL' as const,
      dataPagamento: null,
    };

    // Buscar pagamentos de O.S.
    if (tipo === 'todos' || tipo === 'ordens') {
      const pagamentosOrdens = await prisma.pagamento.findMany({
        where: {
          ...whereBase,
          ordemServicoId: { not: null },
        },
        include: {
          ordemServico: {
            include: {
              veiculo: {
                include: {
                  cliente: true,
                },
              },
            },
          },
        },
        orderBy: { dataPagamentoPrevista: 'asc' },
      });

      for (const pag of pagamentosOrdens) {
        if (!pag.ordemServico) continue;
        const key = `ORDEM-${pag.ordemServicoId}`;
        if (idsJaAdicionados.has(key)) continue;
        idsJaAdicionados.add(key);

        pendencias.push({
          id: pag.id,
          tipo: 'ORDEM',
          ordemId: pag.ordemServicoId,
          numero: pag.ordemServico.numero,
          cliente: pag.ordemServico.veiculo.cliente?.nome || 'Avulso',
          telefone: pag.ordemServico.veiculo.cliente?.telefone || 'N/I',
          total: Number(pag.valor),
          dataCriacao: pag.createdAt,
          dataConclusao: pag.ordemServico.dataConclusao,
          dataPagamentoPrevista: pag.dataPagamentoPrevista,
          veiculo: `${pag.ordemServico.veiculo.marca} ${pag.ordemServico.veiculo.modelo} - ${pag.ordemServico.veiculo.placa}`,
        });
      }
    }

    // Buscar pagamentos de Vendas Rápidas
    if (tipo === 'todos' || tipo === 'vendas') {
      const pagamentosVendas = await prisma.pagamento.findMany({
        where: {
          ...whereBase,
          vendaRapidaId: { not: null },
        },
        include: {
          vendaRapida: true,
        },
        orderBy: { dataPagamentoPrevista: 'asc' },
      });

      for (const pag of pagamentosVendas) {
        if (!pag.vendaRapida) continue;
        const key = `VENDA-${pag.vendaRapidaId}`;
        if (idsJaAdicionados.has(key)) continue;
        idsJaAdicionados.add(key);

        pendencias.push({
          id: pag.id,
          tipo: 'VENDA',
          vendaId: pag.vendaRapidaId,
          numero: pag.vendaRapida.numero,
          cliente: pag.vendaRapida.nomeCliente || 'Balcão',
          telefone: null,
          total: Number(pag.valor),
          dataCriacao: pag.createdAt,
          dataConclusao: pag.vendaRapida.createdAt,
          dataPagamentoPrevista: pag.dataPagamentoPrevista,
          veiculo: null,
        });
      }
    }

    // ========================================
    // MÉTODO 2: Buscar diretamente nas tabelas (sistema legado - pago=false)
    // ========================================

    // O.S. com pago=false que não estão na tabela Pagamento
    if (tipo === 'todos' || tipo === 'ordens') {
      const ordensNaoPagas = await prisma.ordemServico.findMany({
        where: {
          empresaId: session.empresaId,
          pago: false,
        },
        include: {
          veiculo: {
            include: { cliente: true },
          },
        },
        orderBy: { dataPagamentoPrevista: 'asc' },
      });

      for (const os of ordensNaoPagas) {
        const key = `ORDEM-${os.id}`;
        if (idsJaAdicionados.has(key)) continue;
        idsJaAdicionados.add(key);

        pendencias.push({
          id: os.id,
          tipo: 'ORDEM',
          ordemId: os.id,
          numero: os.numero,
          cliente: os.veiculo.cliente?.nome || 'Avulso',
          telefone: os.veiculo.cliente?.telefone || 'N/I',
          total: Number(os.total),
          dataCriacao: os.createdAt,
          dataConclusao: os.dataConclusao,
          dataPagamentoPrevista: os.dataPagamentoPrevista,
          veiculo: `${os.veiculo.marca} ${os.veiculo.modelo} - ${os.veiculo.placa}`,
          legado: true, // Flag para indicar registro legado
        });
      }
    }

    // Vendas com pago=false que não estão na tabela Pagamento
    if (tipo === 'todos' || tipo === 'vendas') {
      const vendasNaoPagas = await prisma.vendaRapida.findMany({
        where: {
          empresaId: session.empresaId,
          pago: false,
        },
        orderBy: { dataPagamentoPrevista: 'asc' },
      });

      for (const venda of vendasNaoPagas) {
        const key = `VENDA-${venda.id}`;
        if (idsJaAdicionados.has(key)) continue;
        idsJaAdicionados.add(key);

        pendencias.push({
          id: venda.id,
          tipo: 'VENDA',
          vendaId: venda.id,
          numero: venda.numero,
          cliente: venda.nomeCliente || 'Balcão',
          telefone: null,
          total: Number(venda.total),
          dataCriacao: venda.createdAt,
          dataConclusao: venda.createdAt,
          dataPagamentoPrevista: venda.dataPagamentoPrevista,
          veiculo: null,
          legado: true,
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

// PUT - Marcar pagamento como recebido
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, formaPagamento, tipo, legado } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    // Se é um registro legado (não está na tabela Pagamento)
    if (legado) {
      if (tipo === 'ORDEM') {
        await prisma.ordemServico.update({
          where: { id, empresaId: session.empresaId },
          data: {
            pago: true,
            formaPagamento: formaPagamento || 'DINHEIRO',
            dataPagamento: new Date(),
          },
        });
      } else if (tipo === 'VENDA') {
        await prisma.vendaRapida.update({
          where: { id, empresaId: session.empresaId },
          data: {
            pago: true,
            formaPagamento: formaPagamento || 'DINHEIRO',
            dataPagamento: new Date(),
          },
        });
      }
      return NextResponse.json({ success: true });
    }

    // Buscar o pagamento na tabela Pagamento
    const pagamento = await prisma.pagamento.findFirst({
      where: { id, empresaId: session.empresaId },
    });

    if (!pagamento) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });
    }

    // Atualizar o pagamento
    await prisma.pagamento.update({
      where: { id },
      data: {
        tipo: formaPagamento || pagamento.tipo,
        dataPagamento: new Date(),
      },
    });

    // Verificar se todos os pagamentos da ordem/venda foram recebidos
    if (pagamento.ordemServicoId) {
      const pendentes = await prisma.pagamento.count({
        where: {
          ordemServicoId: pagamento.ordemServicoId,
          dataPagamento: null,
        },
      });

      if (pendentes === 0) {
        await prisma.ordemServico.update({
          where: { id: pagamento.ordemServicoId },
          data: {
            pago: true,
            dataPagamento: new Date(),
          },
        });
      }
    } else if (pagamento.vendaRapidaId) {
      const pendentes = await prisma.pagamento.count({
        where: {
          vendaRapidaId: pagamento.vendaRapidaId,
          dataPagamento: null,
        },
      });

      if (pendentes === 0) {
        await prisma.vendaRapida.update({
          where: { id: pagamento.vendaRapidaId },
          data: {
            pago: true,
            dataPagamento: new Date(),
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[A RECEBER API PUT] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao marcar como pago' }, { status: 500 });
  }
}
