import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET single vehicle
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
    const veiculoId = parseInt(id);

    if (isNaN(veiculoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const veiculo = await prisma.veiculo.findFirst({
      where: { id: veiculoId, empresaId: session.empresaId },
      include: {
        cliente: true,
        ordens: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      }
    });

    if (!veiculo) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: veiculo });
  } catch (error: any) {
    console.error('Erro ao buscar veículo:', error);
    return NextResponse.json({ error: 'Erro ao buscar veículo', details: error?.message }, { status: 500 });
  }
}

// PUT update vehicle
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
    const veiculoId = parseInt(id);

    if (isNaN(veiculoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Verify vehicle exists and belongs to this empresa
    const existingVeiculo = await prisma.veiculo.findFirst({
      where: { id: veiculoId, empresaId: session.empresaId }
    });
    if (!existingVeiculo) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    const body = await request.json();

    // Format plate if provided
    let placaFormatted = undefined;
    if (body.placa) {
      placaFormatted = body.placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

      // Check if plate is used by another vehicle in this empresa
      const existing = await prisma.veiculo.findFirst({
        where: {
          placa: placaFormatted,
          empresaId: session.empresaId,
          id: { not: veiculoId }
        }
      });
      if (existing) {
        return NextResponse.json({ error: 'Placa já cadastrada para outro veículo' }, { status: 400 });
      }
    }

    const veiculo = await prisma.veiculo.update({
      where: { id: veiculoId },
      data: {
        placa: placaFormatted,
        marca: body.marca,
        modelo: body.modelo,
        ano: body.ano ? parseInt(body.ano) : null,
        cor: body.cor || null,
        cilindrada: body.cilindrada !== undefined ? (body.cilindrada || null) : undefined,
        kmAtual: body.kmAtual ? parseInt(body.kmAtual) : null,
        clienteId: body.clienteId ? parseInt(body.clienteId) : undefined,
      },
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            telefone: true,
          }
        },
      }
    });

    return NextResponse.json({ data: veiculo });
  } catch (error: any) {
    console.error('Erro ao atualizar veículo:', error);
    return NextResponse.json({ error: 'Erro ao atualizar veículo', details: error?.message }, { status: 500 });
  }
}

// DELETE vehicle
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
    const veiculoId = parseInt(id);

    if (isNaN(veiculoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Check if vehicle exists and belongs to this empresa
    const veiculo = await prisma.veiculo.findFirst({
      where: { id: veiculoId, empresaId: session.empresaId },
      include: { _count: { select: { ordens: true } } }
    });

    if (!veiculo) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    if (veiculo._count.ordens > 0) {
      return NextResponse.json({
        error: 'Não é possível excluir veículo com ordens de serviço. O veículo possui histórico.'
      }, { status: 400 });
    }

    await prisma.veiculo.delete({
      where: { id: veiculoId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar veículo:', error);
    return NextResponse.json({ error: 'Erro ao deletar veículo', details: error?.message }, { status: 500 });
  }
}
