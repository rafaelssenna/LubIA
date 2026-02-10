import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// POST - Seed initial services (always adds, even if services exist)
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Initial services to seed
    const servicos = [
      {
        empresaId: session.empresaId,
        nome: 'Troca de Óleo 5W30',
        descricao: 'Troca de óleo do motor com óleo semi-sintético 5W30',
        categoria: 'TROCA_OLEO' as const,
        precoBase: 180.00,
        duracaoMin: 60,
      },
      {
        empresaId: session.empresaId,
        nome: 'Troca de Óleo Sintético',
        descricao: 'Troca de óleo do motor com óleo 100% sintético',
        categoria: 'TROCA_OLEO' as const,
        precoBase: 280.00,
        duracaoMin: 60,
      },
      {
        empresaId: session.empresaId,
        nome: 'Alinhamento e Balanceamento',
        descricao: 'Alinhamento das rodas dianteiras e traseiras + balanceamento das 4 rodas',
        categoria: 'PNEUS' as const,
        precoBase: 140.00,
        duracaoMin: 90,
      },
      {
        empresaId: session.empresaId,
        nome: 'Troca de Filtros',
        descricao: 'Substituição do filtro de óleo, ar e combustível',
        categoria: 'FILTROS' as const,
        precoBase: 150.00,
        duracaoMin: 45,
      },
    ];

    // Create all services
    const created = await prisma.servico.createMany({
      data: servicos,
    });

    return NextResponse.json({
      message: `${created.count} serviços criados com sucesso!`,
      count: created.count,
    });
  } catch (error: any) {
    console.error('[SERVICOS SEED] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao criar serviços' }, { status: 500 });
  }
}
