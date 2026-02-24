import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// POST - Avaliar uma ideia
export async function POST(
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
    const { nota, comentario } = body;

    // Verificar se usuário é interno
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.userId },
      select: { isInternal: true, role: true },
    });

    const isInternal = usuario?.isInternal || usuario?.role === 'ADMIN';

    if (!isInternal) {
      return NextResponse.json({ error: 'Apenas equipe interna pode avaliar' }, { status: 403 });
    }

    // Validar nota
    if (!nota || nota < 1 || nota > 5) {
      return NextResponse.json({ error: 'Nota deve ser entre 1 e 5' }, { status: 400 });
    }

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

    // Criar ou atualizar avaliação (upsert)
    await prisma.ideiaAvaliacao.upsert({
      where: {
        ideiaId_avaliadorId: {
          ideiaId,
          avaliadorId: session.userId,
        },
      },
      create: {
        ideiaId,
        avaliadorId: session.userId,
        nota,
        comentario: comentario?.trim() || null,
      },
      update: {
        nota,
        comentario: comentario?.trim() || null,
      },
    });

    // Recalcular média
    const avaliacoes = await prisma.ideiaAvaliacao.findMany({
      where: { ideiaId },
      select: { nota: true },
    });

    const somaNotas = avaliacoes.reduce((acc, av) => acc + av.nota, 0);
    const notaMedia = somaNotas / avaliacoes.length;

    // Atualizar ideia
    const updateData: any = {
      notaMedia: Math.round(notaMedia * 10) / 10, // Uma casa decimal
      totalAvaliacoes: avaliacoes.length,
    };

    // Se for primeira avaliação, mudar status para EM_AVALIACAO
    if (ideia.status === 'SUGERIDA') {
      updateData.status = 'EM_AVALIACAO';
    }

    await prisma.ideia.update({
      where: { id: ideiaId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      notaMedia: updateData.notaMedia,
      totalAvaliacoes: updateData.totalAvaliacoes,
    });
  } catch (error: any) {
    console.error('[IDEARIO AVALIAR API POST] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao avaliar ideia' }, { status: 500 });
  }
}
