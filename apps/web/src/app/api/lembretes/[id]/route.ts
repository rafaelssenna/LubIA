import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDateToBrazil } from '@/lib/timezone';

// GET - Buscar lembrete por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lembreteId = parseInt(id);

    if (isNaN(lembreteId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const lembrete = await prisma.lembrete.findUnique({
      where: { id: lembreteId },
      include: {
        veiculo: {
          include: {
            cliente: true,
          },
        },
      },
    });

    if (!lembrete) {
      return NextResponse.json({ error: 'Lembrete não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: lembrete });
  } catch (error: any) {
    console.error('[LEMBRETE API GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar lembrete' }, { status: 500 });
  }
}

// PUT - Atualizar lembrete
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lembreteId = parseInt(id);

    if (isNaN(lembreteId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { tipo, dataLembrete, kmLembrete, mensagem, enviado } = body;

    // Verificar se existe
    const existing = await prisma.lembrete.findUnique({
      where: { id: lembreteId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Lembrete não encontrado' }, { status: 404 });
    }

    const updateData: any = {};

    if (tipo !== undefined) updateData.tipo = tipo.toUpperCase();
    if (dataLembrete !== undefined) updateData.dataLembrete = parseDateToBrazil(dataLembrete);
    if (kmLembrete !== undefined) updateData.kmLembrete = kmLembrete;
    if (mensagem !== undefined) updateData.mensagem = mensagem;
    if (enviado !== undefined) {
      updateData.enviado = enviado;
      if (enviado && !existing.enviado) {
        updateData.dataEnvio = new Date();
      }
    }

    const lembrete = await prisma.lembrete.update({
      where: { id: lembreteId },
      data: updateData,
      include: {
        veiculo: {
          include: {
            cliente: true,
          },
        },
      },
    });

    return NextResponse.json({
      data: {
        id: lembrete.id,
        tipo: lembrete.tipo,
        dataLembrete: lembrete.dataLembrete,
        enviado: lembrete.enviado,
        dataEnvio: lembrete.dataEnvio,
      },
    });
  } catch (error: any) {
    console.error('[LEMBRETE API PUT] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao atualizar lembrete' }, { status: 500 });
  }
}

// DELETE - Excluir lembrete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lembreteId = parseInt(id);

    if (isNaN(lembreteId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Verificar se existe
    const existing = await prisma.lembrete.findUnique({
      where: { id: lembreteId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Lembrete não encontrado' }, { status: 404 });
    }

    await prisma.lembrete.delete({
      where: { id: lembreteId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[LEMBRETE API DELETE] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao excluir lembrete' }, { status: 500 });
  }
}
