import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const busca = searchParams.get('busca') || '';
    const categoria = searchParams.get('categoria') || '';

    const produtos = await prisma.produto.findMany({
      where: {
        ativo: true,
        ...(busca && {
          OR: [
            { nome: { contains: busca, mode: 'insensitive' } },
            { codigo: { contains: busca, mode: 'insensitive' } },
            { marca: { contains: busca, mode: 'insensitive' } },
          ],
        }),
        ...(categoria && { categoria: categoria as any }),
      },
      orderBy: { nome: 'asc' },
    });

    const data = produtos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nome: p.nome,
      marca: p.marca,
      categoria: p.categoria.toLowerCase(),
      unidade: p.unidade,
      quantidade: Number(p.quantidade),
      estoqueMinimo: Number(p.estoqueMinimo),
      precoCompra: Number(p.precoCompra),
      precoCompraAtual: Number(p.precoCompraAtual),
      precoVenda: Number(p.precoVenda),
      precoGranel: p.precoGranel ? Number(p.precoGranel) : null,
      localizacao: p.localizacao,
      estoqueBaixo: Number(p.quantidade) <= Number(p.estoqueMinimo),
    }));

    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const produto = await prisma.produto.create({
      data: {
        codigo: body.codigo,
        nome: body.nome,
        marca: body.marca,
        categoria: body.categoria,
        unidade: body.unidade || 'UNIDADE',
        quantidade: body.quantidade || 0,
        estoqueMinimo: body.estoqueMinimo || 0,
        precoCompra: body.precoCompra || 0,
        precoCompraAtual: body.precoCompraAtual || body.precoCompra || 0,
        precoVenda: body.precoVenda || 0,
        precoGranel: body.precoGranel || null,
        localizacao: body.localizacao || null,
      },
    });

    return NextResponse.json({ data: produto }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 });
  }
}
