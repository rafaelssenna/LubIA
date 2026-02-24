import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Middleware para verificar super admin
async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) {
    return { error: 'Não autorizado', status: 401 };
  }
  if (!session.isSuperAdmin) {
    return { error: 'Acesso restrito a administradores', status: 403 };
  }
  return { session };
}

// GET - Dashboard geral do admin (todas as empresas)
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // Estatísticas gerais
    const [
      totalEmpresas,
      empresasAtivas,
      totalUsuarios,
      totalClientes,
      totalOrdens,
      totalVendas,
      totalIdeias,
      empresas,
    ] = await Promise.all([
      prisma.empresa.count(),
      prisma.empresa.count({ where: { ativo: true } }),
      prisma.usuario.count(),
      prisma.cliente.count(),
      prisma.ordemServico.count(),
      prisma.vendaRapida.count(),
      prisma.ideia.count(),
      prisma.empresa.findMany({
        select: {
          id: true,
          nome: true,
          slug: true,
          ativo: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          createdAt: true,
          _count: {
            select: {
              usuarios: true,
              clientes: true,
              ordens: true,
              vendasRapidas: true,
              ideias: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Ideias recentes (todas as empresas)
    const ideiasRecentes = await prisma.ideia.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        usuario: { select: { nome: true } },
        empresa: { select: { nome: true } },
      },
    });

    // Estatísticas de ideias por status
    const ideiasPorStatus = await prisma.ideia.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    return NextResponse.json({
      stats: {
        totalEmpresas,
        empresasAtivas,
        totalUsuarios,
        totalClientes,
        totalOrdens,
        totalVendas,
        totalIdeias,
      },
      empresas: empresas.map((e) => ({
        id: e.id,
        nome: e.nome,
        slug: e.slug,
        ativo: e.ativo,
        subscriptionStatus: e.subscriptionStatus,
        trialEndsAt: e.trialEndsAt,
        createdAt: e.createdAt,
        usuarios: e._count.usuarios,
        clientes: e._count.clientes,
        ordens: e._count.ordens,
        vendas: e._count.vendasRapidas,
        ideias: e._count.ideias,
      })),
      ideiasRecentes: ideiasRecentes.map((i) => ({
        id: i.id,
        titulo: i.titulo,
        status: i.status,
        categoria: i.categoria,
        notaMedia: i.notaMedia ? Number(i.notaMedia) : null,
        autor: i.usuario.nome,
        empresa: i.empresa.nome,
        createdAt: i.createdAt,
      })),
      ideiasPorStatus: ideiasPorStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error: any) {
    console.error('[ADMIN API GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 });
  }
}
