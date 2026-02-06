import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const produtoId = parseInt(id);

    if (isNaN(produtoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const produto = await prisma.produto.findUnique({
      where: { id: produtoId },
    });

    if (!produto) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: produto });
  } catch (error: any) {
    console.error('Erro ao buscar produto:', error);
    return NextResponse.json({ error: 'Erro ao buscar produto', details: error?.message }, { status: 500 });
  }
}

// PUT update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const produtoId = parseInt(id);

    if (isNaN(produtoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();

    // Convert categoria and unidade to uppercase (enum format)
    const categoria = body.categoria?.toUpperCase?.() || body.categoria;
    const unidade = body.unidade?.toUpperCase?.() || body.unidade;

    const produto = await prisma.produto.update({
      where: { id: produtoId },
      data: {
        codigo: body.codigo,
        nome: body.nome,
        marca: body.marca,
        categoria: categoria,
        unidade: unidade,
        quantidade: body.quantidade,
        estoqueMinimo: body.estoqueMinimo,
        precoCompra: body.precoCompra,
        precoCompraAtual: body.precoCompraAtual ?? body.precoCompra,
        precoVenda: body.precoVenda,
        precoGranel: body.precoGranel || null,
        localizacao: body.localizacao || null,
      },
    });

    return NextResponse.json({ data: produto });
  } catch (error: any) {
    console.error('Erro ao atualizar produto:', error);
    return NextResponse.json({ error: 'Erro ao atualizar produto', details: error?.message }, { status: 500 });
  }
}

// DELETE product (soft delete - set ativo = false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const produtoId = parseInt(id);

    if (isNaN(produtoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Soft delete - just set ativo to false
    await prisma.produto.update({
      where: { id: produtoId },
      data: { ativo: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar produto:', error);
    return NextResponse.json({ error: 'Erro ao deletar produto', details: error?.message }, { status: 500 });
  }
}
