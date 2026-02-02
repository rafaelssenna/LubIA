import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET single client with vehicles
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clienteId = parseInt(id);

    if (isNaN(clienteId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      include: {
        veiculos: true,
        _count: {
          select: { veiculos: true }
        }
      }
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...cliente,
        veiculosCount: cliente._count.veiculos,
      }
    });
  } catch (error: any) {
    console.error('Erro ao buscar cliente:', error);
    return NextResponse.json({ error: 'Erro ao buscar cliente', details: error?.message }, { status: 500 });
  }
}

// PUT update client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clienteId = parseInt(id);

    if (isNaN(clienteId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();

    // Check if CPF already exists (if provided and different)
    if (body.cpf) {
      const existing = await prisma.cliente.findFirst({
        where: {
          cpf: body.cpf,
          id: { not: clienteId }
        }
      });
      if (existing) {
        return NextResponse.json({ error: 'CPF já cadastrado para outro cliente' }, { status: 400 });
      }
    }

    const cliente = await prisma.cliente.update({
      where: { id: clienteId },
      data: {
        nome: body.nome,
        telefone: body.telefone,
        email: body.email || null,
        cpf: body.cpf || null,
        endereco: body.endereco || null,
      },
      include: {
        _count: {
          select: { veiculos: true }
        }
      }
    });

    return NextResponse.json({
      data: {
        ...cliente,
        veiculosCount: cliente._count.veiculos,
      }
    });
  } catch (error: any) {
    console.error('Erro ao atualizar cliente:', error);
    return NextResponse.json({ error: 'Erro ao atualizar cliente', details: error?.message }, { status: 500 });
  }
}

// DELETE client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clienteId = parseInt(id);

    if (isNaN(clienteId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Check if client has vehicles
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      include: { _count: { select: { veiculos: true } } }
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    if (cliente._count.veiculos > 0) {
      return NextResponse.json({
        error: 'Não é possível excluir cliente com veículos cadastrados. Remova os veículos primeiro.'
      }, { status: 400 });
    }

    await prisma.cliente.delete({
      where: { id: clienteId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar cliente:', error);
    return NextResponse.json({ error: 'Erro ao deletar cliente', details: error?.message }, { status: 500 });
  }
}
