import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getStats, getScheduledDemos } from '@/lib/crmDatabase';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !session.isSuperAdmin) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  }

  try {
    const [stats, demos] = await Promise.all([
      getStats(),
      getScheduledDemos(),
    ]);

    // Contadores globais de score (baseados em dados do banco)
    // demoScheduled = qualified, activeWithManyMessages ~= interested, resto = new_lead
    const qualifiedCount = stats.demoScheduled;
    const interestedCount = stats.activeWithManyMessages;
    const newLeadCount = stats.total - qualifiedCount - interestedCount;

    return NextResponse.json({
      success: true,
      data: {
        total: stats.total,
        activated: stats.activated,
        demoScheduled: stats.demoScheduled,
        agents: stats.agents,
        recentToday: stats.recentToday,
        scoreCounts: {
          qualified: qualifiedCount,
          interested: interestedCount,
          new_lead: newLeadCount,
        },
        demos: demos.map(d => ({
          id: d.id,
          phone: d.phone,
          name: d.name,
          date: d.demo_date,
          time: d.demo_time,
          status: d.status,
        })),
      },
    });
  } catch (error: any) {
    console.error('[CRM] Erro ao buscar stats:', error?.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
