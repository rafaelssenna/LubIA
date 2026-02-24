import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET - Listar todas as ideias (todas as empresas)
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!session.isSuperAdmin) {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const empresaId = searchParams.get('empresaId');

    const where: any = {};
    if (status && status !== 'todos') {
      where.status = status;
    }
    if (empresaId) {
      where.empresaId = parseInt(empresaId);
    }

    const ideias = await prisma.ideia.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        usuario: { select: { id: true, nome: true } },
        empresa: { select: { id: true, nome: true } },
        _count: { select: { avaliacoes: true } },
      },
    });

    return NextResponse.json({
      data: ideias.map((i) => ({
        id: i.id,
        titulo: i.titulo,
        descricao: i.descricao,
        categoria: i.categoria,
        impacto: i.impacto,
        status: i.status,
        notaMedia: i.notaMedia ? Number(i.notaMedia) : null,
        totalAvaliacoes: i.totalAvaliacoes,
        autor: i.usuario.nome,
        autorId: i.usuario.id,
        empresa: i.empresa.nome,
        empresaId: i.empresa.id,
        createdAt: i.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('[ADMIN IDEIAS API GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar ideias' }, { status: 500 });
  }
}

// PUT - Atualizar status de uma ideia (super admin)
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!session.isSuperAdmin) {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, status, nota, comentario } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const updateData: any = {};

    if (status) {
      updateData.status = status;
    }

    // Se passou nota, criar/atualizar avaliação
    if (nota && nota >= 1 && nota <= 5) {
      await prisma.ideiaAvaliacao.upsert({
        where: {
          ideiaId_avaliadorId: {
            ideiaId: id,
            avaliadorId: session.userId,
          },
        },
        create: {
          ideiaId: id,
          avaliadorId: session.userId,
          nota,
          comentario: comentario || null,
        },
        update: {
          nota,
          comentario: comentario || null,
        },
      });

      // Recalcular média
      const avaliacoes = await prisma.ideiaAvaliacao.findMany({
        where: { ideiaId: id },
        select: { nota: true },
      });

      const somaNotas = avaliacoes.reduce((acc, av) => acc + av.nota, 0);
      const notaMedia = somaNotas / avaliacoes.length;

      updateData.notaMedia = Math.round(notaMedia * 10) / 10;
      updateData.totalAvaliacoes = avaliacoes.length;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.ideia.update({
        where: { id },
        data: updateData,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[ADMIN IDEIAS API PUT] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}
