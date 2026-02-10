import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET all vehicles with optional search
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const busca = searchParams.get('busca');
    const clienteId = searchParams.get('clienteId');

    const veiculos = await prisma.veiculo.findMany({
      where: {
        empresaId: session.empresaId,
        AND: [
          busca ? {
            OR: [
              { placa: { contains: busca, mode: 'insensitive' } },
              { modelo: { contains: busca, mode: 'insensitive' } },
              { marca: { contains: busca, mode: 'insensitive' } },
            ]
          } : {},
          clienteId ? { clienteId: parseInt(clienteId) } : {},
        ]
      },
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            telefone: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: veiculos });
  } catch (error: any) {
    console.error('Erro ao buscar veículos:', error);
    return NextResponse.json({ error: 'Erro ao buscar veículos', details: error?.message }, { status: 500 });
  }
}

// POST create new vehicle
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.placa || !body.marca || !body.modelo || !body.clienteId) {
      return NextResponse.json({ error: 'Placa, marca, modelo e cliente são obrigatórios' }, { status: 400 });
    }

    // Format plate (remove non-alphanumeric and uppercase)
    const placaFormatted = body.placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // Check if plate already exists for this empresa
    const existing = await prisma.veiculo.findFirst({
      where: { placa: placaFormatted, empresaId: session.empresaId }
    });
    if (existing) {
      return NextResponse.json({ error: 'Placa já cadastrada' }, { status: 400 });
    }

    // Verify client exists and belongs to this empresa
    const cliente = await prisma.cliente.findFirst({
      where: { id: parseInt(body.clienteId), empresaId: session.empresaId }
    });
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 400 });
    }

    const veiculo = await prisma.veiculo.create({
      data: {
        placa: placaFormatted,
        marca: body.marca,
        modelo: body.modelo,
        ano: body.ano ? parseInt(body.ano) : null,
        cor: body.cor || null,
        kmAtual: body.kmAtual ? parseInt(body.kmAtual) : null,
        clienteId: parseInt(body.clienteId),
        empresaId: session.empresaId,
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

    return NextResponse.json({ data: veiculo }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar veículo:', error);
    return NextResponse.json({ error: 'Erro ao criar veículo', details: error?.message }, { status: 500 });
  }
}
