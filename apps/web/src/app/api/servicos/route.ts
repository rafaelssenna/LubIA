import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET - Buscar todos os serviços
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const busca = searchParams.get('busca') || '';
    const categoria = searchParams.get('categoria') || '';
    const ativo = searchParams.get('ativo');

    const where: any = {
      empresaId: session.empresaId,
    };

    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { descricao: { contains: busca, mode: 'insensitive' } },
      ];
    }

    if (categoria) {
      where.categoria = categoria;
    }

    if (ativo !== null && ativo !== '') {
      where.ativo = ativo === 'true';
    }

    const servicos = await prisma.servico.findMany({
      where,
      orderBy: { nome: 'asc' },
    });

    // Get all services for stats (unfiltered but scoped to empresa)
    const allServicos = await prisma.servico.findMany({
      where: { empresaId: session.empresaId },
    });

    // Calculate stats from all services
    const total = allServicos.length;
    const ativos = allServicos.filter(s => s.ativo).length;
    const precoMedio = total > 0
      ? allServicos.reduce((acc, s) => acc + Number(s.precoBase), 0) / total
      : 0;
    const duracaoMedia = total > 0
      ? allServicos.reduce((acc, s) => acc + (s.duracaoMin || 0), 0) / total
      : 0;

    // Count unique categories
    const categoriasUnicas = new Set(allServicos.map(s => s.categoria));

    return NextResponse.json({
      data: servicos.map(s => ({
        id: s.id,
        nome: s.nome,
        descricao: s.descricao,
        categoria: s.categoria,
        precoBase: Number(s.precoBase),
        duracaoMin: s.duracaoMin,
        ativo: s.ativo,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      stats: {
        total,
        ativos,
        categorias: categoriasUnicas.size,
        precoMedio: Math.round(precoMedio * 100) / 100,
        duracaoMedia: Math.round(duracaoMedia),
      },
    });
  } catch (error: any) {
    console.error('[SERVICOS API GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar serviços' }, { status: 500 });
  }
}

// POST - Criar novo serviço
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nome, descricao, categoria, precoBase, duracaoMin, ativo } = body;

    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    if (!precoBase || precoBase <= 0) {
      return NextResponse.json({ error: 'Preço é obrigatório' }, { status: 400 });
    }

    const servico = await prisma.servico.create({
      data: {
        nome,
        descricao: descricao || null,
        categoria: categoria || 'OUTROS',
        precoBase,
        duracaoMin: duracaoMin || null,
        ativo: ativo !== false,
        empresaId: session.empresaId,
      },
    });

    return NextResponse.json({
      data: {
        id: servico.id,
        nome: servico.nome,
        descricao: servico.descricao,
        categoria: servico.categoria,
        precoBase: Number(servico.precoBase),
        duracaoMin: servico.duracaoMin,
        ativo: servico.ativo,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[SERVICOS API POST] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao criar serviço' }, { status: 500 });
  }
}
