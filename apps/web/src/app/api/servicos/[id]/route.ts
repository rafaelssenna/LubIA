import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Buscar serviço por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const servicoId = parseInt(id);

    if (isNaN(servicoId)) {
      return NextResponse.json({ error: 'ID do serviço inválido' }, { status: 400 });
    }

    const servico = await prisma.servico.findUnique({
      where: { id: servicoId },
    });

    if (!servico) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: servico.id,
        nome: servico.nome,
        descricao: servico.descricao,
        categoria: servico.categoria,
        precoBase: Number(servico.precoBase),
        duracaoMin: servico.duracaoMin,
        ativo: servico.ativo,
        createdAt: servico.createdAt,
        updatedAt: servico.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('[SERVICO API GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar serviço' }, { status: 500 });
  }
}

// PUT - Atualizar serviço
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const servicoId = parseInt(id);

    if (isNaN(servicoId)) {
      return NextResponse.json({ error: 'ID do serviço inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { nome, descricao, categoria, precoBase, duracaoMin, ativo } = body;

    // Verify service exists
    const existing = await prisma.servico.findUnique({
      where: { id: servicoId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }

    const servico = await prisma.servico.update({
      where: { id: servicoId },
      data: {
        nome: nome || existing.nome,
        descricao: descricao !== undefined ? descricao : existing.descricao,
        categoria: categoria !== undefined ? categoria : existing.categoria,
        precoBase: precoBase !== undefined ? precoBase : existing.precoBase,
        duracaoMin: duracaoMin !== undefined ? duracaoMin : existing.duracaoMin,
        ativo: ativo !== undefined ? ativo : existing.ativo,
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
    });
  } catch (error: any) {
    console.error('[SERVICO API PUT] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao atualizar serviço' }, { status: 500 });
  }
}

// DELETE - Excluir serviço
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const servicoId = parseInt(id);

    if (isNaN(servicoId)) {
      return NextResponse.json({ error: 'ID do serviço inválido' }, { status: 400 });
    }

    // Check if service has orders
    const ordersCount = await prisma.itemOrdem.count({
      where: { servicoId },
    });

    if (ordersCount > 0) {
      return NextResponse.json({
        error: 'Serviço possui ordens de serviço vinculadas. Desative-o em vez de excluir.',
      }, { status: 400 });
    }

    await prisma.servico.delete({
      where: { id: servicoId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[SERVICO API DELETE] Erro:', error?.message);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Erro ao excluir serviço' }, { status: 500 });
  }
}
