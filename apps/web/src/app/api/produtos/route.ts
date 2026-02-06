import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  console.log('========================================');
  console.log('[PRODUTOS API] GET request iniciado');
  console.log('[PRODUTOS API] URL:', request.url);
  console.log('[PRODUTOS API] DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('[PRODUTOS API] DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 30) + '...');

  try {
    const { searchParams } = new URL(request.url);
    const busca = searchParams.get('busca') || '';
    const categoria = searchParams.get('categoria') || '';

    console.log('[PRODUTOS API] Params - busca:', busca, 'categoria:', categoria);
    console.log('[PRODUTOS API] Tentando conectar ao banco...');

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

    console.log('[PRODUTOS API] Query executada com sucesso!');
    console.log('[PRODUTOS API] Produtos encontrados:', produtos.length);

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

    console.log('[PRODUTOS API] Dados mapeados, retornando resposta...');
    console.log('========================================');

    return NextResponse.json({ data, total: data.length });
  } catch (error: any) {
    console.error('========================================');
    console.error('[PRODUTOS API] ERRO CAPTURADO!');
    console.error('[PRODUTOS API] Tipo do erro:', error?.constructor?.name);
    console.error('[PRODUTOS API] Mensagem:', error?.message);
    console.error('[PRODUTOS API] Code:', error?.code);
    console.error('[PRODUTOS API] Stack:', error?.stack);
    console.error('[PRODUTOS API] Erro completo:', JSON.stringify(error, null, 2));
    console.error('========================================');

    return NextResponse.json({
      error: 'Erro ao buscar produtos',
      details: error?.message,
      code: error?.code,
      type: error?.constructor?.name
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('========================================');
  console.log('[PRODUTOS API] POST request iniciado');
  console.log('[PRODUTOS API] DATABASE_URL exists:', !!process.env.DATABASE_URL);

  try {
    const body = await request.json();
    console.log('[PRODUTOS API] Body recebido:', JSON.stringify(body, null, 2));

    // Convert categoria and unidade to uppercase (enum format)
    const categoria = body.categoria?.toUpperCase?.() || body.categoria;
    const unidade = (body.unidade?.toUpperCase?.() || body.unidade) || 'UNIDADE';

    const produto = await prisma.produto.create({
      data: {
        codigo: body.codigo,
        nome: body.nome,
        marca: body.marca,
        categoria: categoria,
        unidade: unidade,
        quantidade: body.quantidade || 0,
        estoqueMinimo: body.estoqueMinimo || 0,
        precoCompra: body.precoCompra || 0,
        precoCompraAtual: body.precoCompraAtual || body.precoCompra || 0,
        precoVenda: body.precoVenda || 0,
        precoGranel: body.precoGranel || null,
        localizacao: body.localizacao || null,
      },
    });

    console.log('[PRODUTOS API] Produto criado com sucesso! ID:', produto.id);
    console.log('========================================');

    return NextResponse.json({ data: produto }, { status: 201 });
  } catch (error: any) {
    console.error('========================================');
    console.error('[PRODUTOS API POST] ERRO CAPTURADO!');
    console.error('[PRODUTOS API POST] Tipo:', error?.constructor?.name);
    console.error('[PRODUTOS API POST] Mensagem:', error?.message);
    console.error('[PRODUTOS API POST] Code:', error?.code);
    console.error('[PRODUTOS API POST] Stack:', error?.stack);
    console.error('========================================');

    return NextResponse.json({
      error: 'Erro ao criar produto',
      details: error?.message,
      code: error?.code
    }, { status: 500 });
  }
}
