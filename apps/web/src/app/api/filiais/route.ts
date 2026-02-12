import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET - Listar todas as filiais
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const ativoParam = searchParams.get('ativo');

    const ativoFilter = ativoParam === 'todos' ? {} : ativoParam === 'false' ? { ativo: false } : { ativo: true };

    const filiais = await prisma.filial.findMany({
      where: {
        empresaId: session.empresaId,
        ...ativoFilter,
      },
      orderBy: { nome: 'asc' },
    });

    return NextResponse.json({
      data: filiais.map((f) => ({
        id: f.id,
        nome: f.nome,
        cnpj: f.cnpj,
        ativo: f.ativo,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error('[FILIAIS API GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar filiais' }, { status: 500 });
  }
}

// POST - Criar nova filial
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nome, cnpj } = body;

    if (!nome || !cnpj) {
      return NextResponse.json({ error: 'Nome e CNPJ são obrigatórios' }, { status: 400 });
    }

    // Verificar se CNPJ já existe para esta empresa
    const existe = await prisma.filial.findFirst({
      where: { cnpj, empresaId: session.empresaId },
    });

    if (existe) {
      return NextResponse.json({ error: 'CNPJ já cadastrado' }, { status: 400 });
    }

    const filial = await prisma.filial.create({
      data: {
        nome,
        cnpj,
        empresaId: session.empresaId,
      },
    });

    return NextResponse.json({
      data: {
        id: filial.id,
        nome: filial.nome,
        cnpj: filial.cnpj,
        ativo: filial.ativo,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[FILIAIS API POST] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao criar filial' }, { status: 500 });
  }
}
