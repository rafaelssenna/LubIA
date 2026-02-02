import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all vehicles with optional search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const busca = searchParams.get('busca');
    const clienteId = searchParams.get('clienteId');

    const veiculos = await prisma.veiculo.findMany({
      where: {
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
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.placa || !body.marca || !body.modelo || !body.clienteId) {
      return NextResponse.json({ error: 'Placa, marca, modelo e cliente são obrigatórios' }, { status: 400 });
    }

    // Format plate (remove non-alphanumeric and uppercase)
    const placaFormatted = body.placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // Check if plate already exists
    const existing = await prisma.veiculo.findUnique({
      where: { placa: placaFormatted }
    });
    if (existing) {
      return NextResponse.json({ error: 'Placa já cadastrada' }, { status: 400 });
    }

    // Verify client exists
    const cliente = await prisma.cliente.findUnique({
      where: { id: parseInt(body.clienteId) }
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
