import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET - Detalhes de uma ideia
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const ideiaId = parseInt(id);

    const ideia = await prisma.ideia.findFirst({
      where: {
        id: ideiaId,
        empresaId: session.empresaId,
      },
      include: {
        usuario: {
          select: { id: true, nome: true },
        },
        avaliacoes: {
          include: {
            avaliador: {
              select: { id: true, nome: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!ideia) {
      return NextResponse.json({ error: 'Ideia não encontrada' }, { status: 404 });
    }

    // Verificar se usuário atual é interno para mostrar avaliações
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.userId },
      select: { isInternal: true, role: true },
    });

    const isInternal = usuario?.isInternal || usuario?.role === 'ADMIN';

    // Se não for interno, não mostrar avaliações detalhadas
    const avaliacoes = isInternal
      ? ideia.avaliacoes.map((av) => ({
          id: av.id,
          nota: av.nota,
          comentario: av.comentario,
          avaliador: av.avaliador.nome,
          createdAt: av.createdAt,
        }))
      : [];

    // Verificar se o usuário atual já avaliou
    const minhaAvaliacao = ideia.avaliacoes.find((av) => av.avaliadorId === session.userId);

    return NextResponse.json({
      data: {
        id: ideia.id,
        titulo: ideia.titulo,
        descricao: ideia.descricao,
        categoria: ideia.categoria,
        impacto: ideia.impacto,
        status: ideia.status,
        notaMedia: ideia.notaMedia ? Number(ideia.notaMedia) : null,
        totalAvaliacoes: ideia.totalAvaliacoes,
        autor: ideia.usuario.nome,
        autorId: ideia.usuario.id,
        createdAt: ideia.createdAt,
        updatedAt: ideia.updatedAt,
        avaliacoes,
        minhaAvaliacao: minhaAvaliacao
          ? { nota: minhaAvaliacao.nota, comentario: minhaAvaliacao.comentario }
          : null,
        isInternal,
        isAutor: ideia.usuarioId === session.userId,
      },
    });
  } catch (error: any) {
    console.error('[IDEARIO API GET ID] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar ideia' }, { status: 500 });
  }
}

// PUT - Atualizar ideia
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const ideiaId = parseInt(id);
    const body = await request.json();

    // Buscar ideia
    const ideia = await prisma.ideia.findFirst({
      where: {
        id: ideiaId,
        empresaId: session.empresaId,
      },
    });

    if (!ideia) {
      return NextResponse.json({ error: 'Ideia não encontrada' }, { status: 404 });
    }

    // Verificar permissões do usuário
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.userId },
      select: { isInternal: true, role: true },
    });

    const isInternal = usuario?.isInternal || usuario?.role === 'ADMIN';
    const isAutor = ideia.usuarioId === session.userId;

    // O que pode ser atualizado
    const updateData: any = {};

    // Autor pode editar título/descrição apenas se status = SUGERIDA
    if (isAutor && ideia.status === 'SUGERIDA') {
      if (body.titulo) updateData.titulo = body.titulo.trim();
      if (body.descricao) updateData.descricao = body.descricao.trim();
      if (body.categoria) updateData.categoria = body.categoria;
      if (body.impacto) updateData.impacto = body.impacto;
    }

    // Interno pode mudar status
    if (isInternal && body.status) {
      updateData.status = body.status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhuma alteração permitida' }, { status: 400 });
    }

    const ideiaAtualizada = await prisma.ideia.update({
      where: { id: ideiaId },
      data: updateData,
      include: {
        usuario: {
          select: { id: true, nome: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: ideiaAtualizada.id,
        titulo: ideiaAtualizada.titulo,
        descricao: ideiaAtualizada.descricao,
        categoria: ideiaAtualizada.categoria,
        impacto: ideiaAtualizada.impacto,
        status: ideiaAtualizada.status,
        notaMedia: ideiaAtualizada.notaMedia ? Number(ideiaAtualizada.notaMedia) : null,
        totalAvaliacoes: ideiaAtualizada.totalAvaliacoes,
        autor: ideiaAtualizada.usuario.nome,
        autorId: ideiaAtualizada.usuario.id,
        createdAt: ideiaAtualizada.createdAt,
        updatedAt: ideiaAtualizada.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('[IDEARIO API PUT] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao atualizar ideia' }, { status: 500 });
  }
}

// DELETE - Excluir ideia
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const ideiaId = parseInt(id);

    // Buscar ideia
    const ideia = await prisma.ideia.findFirst({
      where: {
        id: ideiaId,
        empresaId: session.empresaId,
      },
    });

    if (!ideia) {
      return NextResponse.json({ error: 'Ideia não encontrada' }, { status: 404 });
    }

    // Verificar permissões
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    const isAdmin = usuario?.role === 'ADMIN';
    const isAutor = ideia.usuarioId === session.userId;

    // Apenas autor ou admin pode excluir
    if (!isAutor && !isAdmin) {
      return NextResponse.json({ error: 'Sem permissão para excluir' }, { status: 403 });
    }

    await prisma.ideia.delete({
      where: { id: ideiaId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[IDEARIO API DELETE] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao excluir ideia' }, { status: 500 });
  }
}
