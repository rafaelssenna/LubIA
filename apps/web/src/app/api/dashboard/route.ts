import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

    // Run all queries in parallel
    const [
      totalClientes,
      totalVeiculos,
      ordensMes,
      vendasMes,
      ordensHoje,
    ] = await Promise.all([
      prisma.cliente.count({ where: { empresaId: session.empresaId } }),
      prisma.veiculo.count({ where: { empresaId: session.empresaId } }),
      // Apenas O.S. concluídas/entregues E PAGAS contam no faturamento
      prisma.ordemServico.findMany({
        where: {
          empresaId: session.empresaId,
          createdAt: { gte: inicioMes, lte: fimMes },
          status: { in: ['CONCLUIDO', 'ENTREGUE'] },
          pago: true, // Apenas pagas
        },
        select: { total: true },
      }),
      // Vendas rápidas do mês (apenas pagas)
      prisma.vendaRapida.findMany({
        where: {
          empresaId: session.empresaId,
          createdAt: { gte: inicioMes, lte: fimMes },
          pago: true, // Apenas pagas
        },
        select: { total: true },
      }),
      prisma.ordemServico.findMany({
        where: {
          empresaId: session.empresaId,
          OR: [
            { dataAgendada: { gte: hoje, lt: amanha } },
            {
              dataAgendada: null,
              createdAt: { gte: hoje, lt: amanha },
              status: { in: ['AGENDADO', 'EM_ANDAMENTO', 'AGUARDANDO_PECAS'] },
            },
          ],
        },
        include: {
          veiculo: {
            include: {
              cliente: { select: { nome: true } },
            },
          },
          itens: {
            include: {
              servico: { select: { nome: true } },
            },
          },
        },
        orderBy: { dataAgendada: 'asc' },
      }),
    ]);

    // Soma O.S. concluídas + Vendas Rápidas
    const faturamentoOS = ordensMes.reduce((acc, o) => acc + Number(o.total), 0);
    const faturamentoVendas = vendasMes.reduce((acc, v) => acc + Number(v.total), 0);
    const faturamentoMes = faturamentoOS + faturamentoVendas;

    const servicosHoje = ordensHoje.map(o => ({
      id: o.id,
      numero: o.numero,
      hora: o.dataAgendada
        ? new Date(o.dataAgendada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : '--:--',
      cliente: o.veiculo.cliente.nome,
      veiculo: `${o.veiculo.marca} ${o.veiculo.modelo}`,
      placa: o.veiculo.placa,
      servico: o.itens[0]?.servico.nome || 'Serviço',
      status: o.status,
      formaPagamento: o.formaPagamento,
      total: Number(o.total),
    }));

    return NextResponse.json({
      stats: {
        clientes: totalClientes,
        veiculos: totalVeiculos,
        ordensMes: ordensMes.length,
        faturamento: faturamentoMes,
      },
      servicosHoje,
    });
  } catch (error: any) {
    console.error('[DASHBOARD API] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao carregar dashboard' }, { status: 500 });
  }
}
