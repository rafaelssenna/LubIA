import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET - Listar ideias
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const categoria = searchParams.get('categoria');
    const minhaIdeia = searchParams.get('minhaIdeia') === 'true';
    const ordenar = searchParams.get('ordenar') || 'data'; // 'data' ou 'nota'
    const busca = searchParams.get('busca');

    // Construir where
    const where: any = {
      empresaId: session.empresaId,
    };

    if (status && status !== 'todos') {
      where.status = status;
    }

    if (categoria && categoria !== 'todos') {
      where.categoria = categoria;
    }

    if (minhaIdeia) {
      where.usuarioId = session.userId;
    }

    if (busca) {
      where.OR = [
        { titulo: { contains: busca, mode: 'insensitive' } },
        { descricao: { contains: busca, mode: 'insensitive' } },
      ];
    }

    // Ordenação
    const orderBy: any = ordenar === 'nota'
      ? [{ notaMedia: 'desc' }, { createdAt: 'desc' }]
      : { createdAt: 'desc' };

    const ideias = await prisma.ideia.findMany({
      where,
      orderBy,
      include: {
        usuario: {
          select: { id: true, nome: true },
        },
        _count: {
          select: { avaliacoes: true },
        },
      },
    });

    // Calcular estatísticas
    const todas = await prisma.ideia.count({ where: { empresaId: session.empresaId } });
    const minhas = await prisma.ideia.count({ where: { empresaId: session.empresaId, usuarioId: session.userId } });
    const aprovadas = await prisma.ideia.count({ where: { empresaId: session.empresaId, status: 'APROVADA' } });
    const implementadas = await prisma.ideia.count({ where: { empresaId: session.empresaId, status: 'IMPLEMENTADA' } });

    return NextResponse.json({
      data: ideias.map((ideia) => ({
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
      })),
      stats: {
        todas,
        minhas,
        aprovadas,
        implementadas,
      },
    });
  } catch (error: any) {
    console.error('[IDEARIO API GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar ideias' }, { status: 500 });
  }
}

// POST - Criar nova ideia
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { titulo, descricao, categoria, impacto } = body;

    // Validações
    if (!titulo || !titulo.trim()) {
      return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 });
    }

    if (!descricao || !descricao.trim()) {
      return NextResponse.json({ error: 'Descrição é obrigatória' }, { status: 400 });
    }

    if (!categoria) {
      return NextResponse.json({ error: 'Categoria é obrigatória' }, { status: 400 });
    }

    const ideia = await prisma.ideia.create({
      data: {
        empresaId: session.empresaId,
        usuarioId: session.userId,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        categoria,
        impacto: impacto || 'MEDIO',
        status: 'SUGERIDA',
      },
      include: {
        usuario: {
          select: { id: true, nome: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: ideia.id,
        titulo: ideia.titulo,
        descricao: ideia.descricao,
        categoria: ideia.categoria,
        impacto: ideia.impacto,
        status: ideia.status,
        notaMedia: null,
        totalAvaliacoes: 0,
        autor: ideia.usuario.nome,
        autorId: ideia.usuario.id,
        createdAt: ideia.createdAt,
        updatedAt: ideia.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('[IDEARIO API POST] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao criar ideia' }, { status: 500 });
  }
}
