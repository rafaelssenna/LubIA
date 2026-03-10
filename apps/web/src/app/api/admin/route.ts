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
    // Empresas internas/teste (que têm usuários isSuperAdmin ou isInternal)
    const empresasInternas = await prisma.usuario.findMany({
      where: { OR: [{ isSuperAdmin: true }, { isInternal: true }] },
      select: { empresaId: true },
      distinct: ['empresaId'],
    });
    const idsInternos = empresasInternas.map((u) => u.empresaId);
    const filtroExterno = { NOT: { id: { in: idsInternos } } };

    // Estatísticas gerais (só empresas externas)
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
      prisma.empresa.count({ where: filtroExterno }),
      prisma.empresa.count({ where: { ativo: true, ...filtroExterno } }),
      prisma.usuario.count({ where: { empresaId: { notIn: idsInternos } } }),
      prisma.cliente.count({ where: { empresaId: { notIn: idsInternos } } }),
      prisma.ordemServico.count({ where: { empresaId: { notIn: idsInternos } } }),
      prisma.vendaRapida.count({ where: { empresaId: { notIn: idsInternos } } }),
      prisma.ideia.count({ where: { empresaId: { notIn: idsInternos } } }),
      prisma.empresa.findMany({
        where: filtroExterno,
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
              produtos: true,
              ideias: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Todos os usuários (só empresas externas)
    const usuarios = await prisma.usuario.findMany({
      where: { empresaId: { notIn: idsInternos } },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        lastLoginAt: true,
        createdAt: true,
        empresa: { select: { nome: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Todas as ideias (só empresas externas)
    const todasIdeias = await prisma.ideia.findMany({
      where: { empresaId: { notIn: idsInternos } },
      orderBy: { createdAt: 'desc' },
      include: {
        usuario: { select: { nome: true } },
        empresa: { select: { nome: true } },
      },
    });

    // Estatísticas de ideias por status (só empresas externas)
    const ideiasPorStatus = await prisma.ideia.groupBy({
      by: ['status'],
      where: { empresaId: { notIn: idsInternos } },
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
        produtos: e._count.produtos,
        ideias: e._count.ideias,
      })),
      usuarios: usuarios.map((u) => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        role: u.role,
        ativo: u.ativo,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        empresa: u.empresa.nome,
      })),
      ideias: todasIdeias.map((i) => ({
        id: i.id,
        titulo: i.titulo,
        descricao: i.descricao,
        status: i.status,
        categoria: i.categoria,
        impacto: i.impacto,
        notaMedia: i.notaMedia ? Number(i.notaMedia) : null,
        totalAvaliacoes: i.totalAvaliacoes,
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
