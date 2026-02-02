import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all clients with optional search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const busca = searchParams.get('busca');

    const clientes = await prisma.cliente.findMany({
      where: busca ? {
        OR: [
          { nome: { contains: busca, mode: 'insensitive' } },
          { telefone: { contains: busca } },
          { cpf: { contains: busca } },
        ]
      } : undefined,
      include: {
        veiculos: {
          select: {
            id: true,
            placa: true,
            marca: true,
            modelo: true,
          }
        },
        _count: {
          select: { veiculos: true }
        }
      },
      orderBy: { nome: 'asc' },
    });

    return NextResponse.json({
      data: clientes.map(c => ({
        ...c,
        veiculosCount: c._count.veiculos,
      }))
    });
  } catch (error: any) {
    console.error('Erro ao buscar clientes:', error);
    return NextResponse.json({ error: 'Erro ao buscar clientes', details: error?.message }, { status: 500 });
  }
}

// POST create new client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.nome || !body.telefone) {
      return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 });
    }

    // Check if CPF already exists (if provided)
    if (body.cpf) {
      const existing = await prisma.cliente.findUnique({
        where: { cpf: body.cpf }
      });
      if (existing) {
        return NextResponse.json({ error: 'CPF já cadastrado' }, { status: 400 });
      }
    }

    const cliente = await prisma.cliente.create({
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
    }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar cliente:', error);
    return NextResponse.json({ error: 'Erro ao criar cliente', details: error?.message }, { status: 500 });
  }
}
