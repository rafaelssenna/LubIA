import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET - Buscar filial por ID
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
    const filialId = parseInt(id);

    if (isNaN(filialId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const filial = await prisma.filial.findFirst({
      where: { id: filialId, empresaId: session.empresaId },
    });

    if (!filial) {
      return NextResponse.json({ error: 'Filial não encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: filial.id,
        nome: filial.nome,
        cnpj: filial.cnpj,
        ativo: filial.ativo,
      },
    });
  } catch (error: any) {
    console.error('[FILIAL API GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar filial' }, { status: 500 });
  }
}

// PUT - Atualizar filial
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
    const filialId = parseInt(id);

    if (isNaN(filialId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { nome, cnpj, ativo } = body;

    // Verificar se filial existe
    const existing = await prisma.filial.findFirst({
      where: { id: filialId, empresaId: session.empresaId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Filial não encontrada' }, { status: 404 });
    }

    // Verificar se CNPJ já existe para outra filial
    if (cnpj && cnpj !== existing.cnpj) {
      const cnpjExiste = await prisma.filial.findFirst({
        where: {
          cnpj,
          empresaId: session.empresaId,
          id: { not: filialId },
        },
      });

      if (cnpjExiste) {
        return NextResponse.json({ error: 'CNPJ já cadastrado em outra filial' }, { status: 400 });
      }
    }

    const filial = await prisma.filial.update({
      where: { id: filialId },
      data: {
        nome: nome !== undefined ? nome : existing.nome,
        cnpj: cnpj !== undefined ? cnpj : existing.cnpj,
        ativo: ativo !== undefined ? ativo : existing.ativo,
      },
    });

    return NextResponse.json({
      data: {
        id: filial.id,
        nome: filial.nome,
        cnpj: filial.cnpj,
        ativo: filial.ativo,
      },
    });
  } catch (error: any) {
    console.error('[FILIAL API PUT] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao atualizar filial' }, { status: 500 });
  }
}

// DELETE - Desativar filial (soft delete)
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
    const filialId = parseInt(id);

    if (isNaN(filialId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Verificar se filial existe
    const existing = await prisma.filial.findFirst({
      where: { id: filialId, empresaId: session.empresaId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Filial não encontrada' }, { status: 404 });
    }

    // Soft delete
    await prisma.filial.update({
      where: { id: filialId },
      data: { ativo: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[FILIAL API DELETE] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao excluir filial' }, { status: 500 });
  }
}
