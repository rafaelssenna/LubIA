import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const tipo = searchParams.get('tipo') || '';

    const where: any = {
      empresaId: session.empresaId,
    };

    if (search) {
      where.OR = [
        { numero: { contains: search, mode: 'insensitive' } },
        { venda: { numero: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (tipo && (tipo === 'TROCA' || tipo === 'REEMBOLSO')) {
      where.tipo = tipo;
    }

    const [devolucoes, total] = await Promise.all([
      prisma.devolucaoVendaRapida.findMany({
        where,
        include: {
          venda: {
            select: {
              id: true,
              numero: true,
              nomeCliente: true,
            },
          },
          itens: {
            include: {
              produto: {
                select: {
                  id: true,
                  nome: true,
                  codigo: true,
                },
              },
              produtoTroca: {
                select: {
                  id: true,
                  nome: true,
                  codigo: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.devolucaoVendaRapida.count({ where }),
    ]);

    return NextResponse.json({
      devolucoes: devolucoes.map((dev) => ({
        id: dev.id,
        numero: dev.numero,
        tipo: dev.tipo,
        motivo: dev.motivo,
        motivoOutro: dev.motivoOutro,
        observacoes: dev.observacoes,
        valorTotal: Number(dev.valorTotal),
        createdAt: dev.createdAt,
        venda: {
          id: dev.venda.id,
          numero: dev.venda.numero,
          cliente: dev.venda.nomeCliente ? { nome: dev.venda.nomeCliente } : null,
        },
        itens: dev.itens.map((item) => ({
          id: item.id,
          produtoId: item.produtoId,
          produto: item.produto,
          quantidadeDevolvida: Number(item.quantidadeDevolvida),
          valorUnitario: Number(item.valorUnitario),
          subtotal: Number(item.subtotal),
          produtoTrocaId: item.produtoTrocaId,
          produtoTroca: item.produtoTroca,
          quantidadeTroca: item.quantidadeTroca ? Number(item.quantidadeTroca) : null,
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[DEVOLUCOES GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar devoluções' }, { status: 500 });
  }
}
