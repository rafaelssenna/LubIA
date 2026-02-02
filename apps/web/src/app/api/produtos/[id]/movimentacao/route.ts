import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const produtoId = parseInt(id);
    const body = await request.json();

    const { tipo, quantidade, motivo, documento } = body;

    // Busca produto atual
    const produto = await prisma.produto.findUnique({
      where: { id: produtoId },
    });

    if (!produto) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Calcula nova quantidade
    let novaQuantidade = Number(produto.quantidade);
    if (tipo === 'ENTRADA') {
      novaQuantidade += quantidade;
    } else if (tipo === 'SAIDA') {
      novaQuantidade -= quantidade;
    }

    if (novaQuantidade < 0) {
      return NextResponse.json({ error: 'Estoque insuficiente' }, { status: 400 });
    }

    // Cria movimentação e atualiza produto
    await prisma.$transaction([
      prisma.movimentacaoEstoque.create({
        data: {
          produtoId,
          tipo,
          quantidade,
          motivo,
          documento,
        },
      }),
      prisma.produto.update({
        where: { id: produtoId },
        data: { quantidade: novaQuantidade },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao registrar movimentação:', error);
    return NextResponse.json({ error: 'Erro ao registrar movimentação' }, { status: 500 });
  }
}
