import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
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
      ordensHoje,
    ] = await Promise.all([
      prisma.cliente.count(),
      prisma.veiculo.count(),
      prisma.ordemServico.findMany({
        where: {
          createdAt: { gte: inicioMes, lte: fimMes },
        },
        select: { total: true },
      }),
      prisma.ordemServico.findMany({
        where: {
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

    const faturamentoMes = ordensMes.reduce((acc, o) => acc + Number(o.total), 0);

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
