import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET single product
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
    const produtoId = parseInt(id);

    if (isNaN(produtoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const produto = await prisma.produto.findFirst({
      where: { id: produtoId, empresaId: session.empresaId },
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
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const produtoId = parseInt(id);

    if (isNaN(produtoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Verify product exists and belongs to this empresa
    const existingProduto = await prisma.produto.findFirst({
      where: { id: produtoId, empresaId: session.empresaId }
    });
    if (!existingProduto) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const body = await request.json();

    // Check if codigo is being changed and already exists for this empresa
    if (body.codigo && body.codigo !== existingProduto.codigo) {
      const existing = await prisma.produto.findFirst({
        where: {
          codigo: body.codigo,
          empresaId: session.empresaId,
          id: { not: produtoId }
        }
      });
      if (existing) {
        return NextResponse.json({ error: 'Código já cadastrado para outro produto' }, { status: 400 });
      }
    }

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
        volumeUnidade: body.volumeUnidade !== undefined ? body.volumeUnidade : existingProduto.volumeUnidade,
        quantidade: body.quantidade,
        estoqueMinimo: body.estoqueMinimo,
        precoCompra: body.precoCompra,
        precoCompraAtual: body.precoCompraAtual ?? body.precoCompra,
        precoVenda: body.precoVenda,
        precoGranel: body.precoGranel || null,
        localizacao: body.localizacao || null,
        cnpjFornecedor: body.cnpjFornecedor !== undefined ? body.cnpjFornecedor : existingProduto.cnpjFornecedor,
        filialId: body.filialId !== undefined ? body.filialId : existingProduto.filialId,
        ativo: body.ativo !== undefined ? body.ativo : existingProduto.ativo,
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
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const produtoId = parseInt(id);

    if (isNaN(produtoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Verify product exists and belongs to this empresa
    const existingProduto = await prisma.produto.findFirst({
      where: { id: produtoId, empresaId: session.empresaId }
    });
    if (!existingProduto) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
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
