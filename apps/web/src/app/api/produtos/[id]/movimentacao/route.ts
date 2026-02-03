import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Buscar histórico de movimentações
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const produtoId = parseInt(id);

    if (isNaN(produtoId)) {
      return NextResponse.json({ error: 'ID do produto inválido' }, { status: 400 });
    }

    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
      where: { produtoId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Últimas 50 movimentações
    });

    return NextResponse.json({
      data: movimentacoes.map(m => ({
        id: m.id,
        tipo: m.tipo,
        quantidade: Number(m.quantidade),
        motivo: m.motivo,
        documento: m.documento,
        createdAt: m.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('[MOVIMENTACAO API GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar movimentações' }, { status: 500 });
  }
}

// POST - Registrar nova movimentação
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('========================================');
  console.log('[MOVIMENTACAO API] POST request iniciado');
  console.log('[MOVIMENTACAO API] URL:', request.url);
  console.log('[MOVIMENTACAO API] DATABASE_URL exists:', !!process.env.DATABASE_URL);

  try {
    const { id } = await params;
    console.log('[MOVIMENTACAO API] ID do produto (string):', id);

    const produtoId = parseInt(id);
    console.log('[MOVIMENTACAO API] ID do produto (parsed):', produtoId);

    if (isNaN(produtoId)) {
      console.log('[MOVIMENTACAO API] ERRO: ID inválido');
      console.log('========================================');
      return NextResponse.json({ error: 'ID do produto inválido' }, { status: 400 });
    }

    console.log('[MOVIMENTACAO API] Extraindo body...');
    const body = await request.json();
    console.log('[MOVIMENTACAO API] Body:', JSON.stringify(body, null, 2));

    const { tipo, quantidade, motivo, documento } = body;
    console.log('[MOVIMENTACAO API] tipo:', tipo, 'quantidade:', quantidade);

    // Busca produto atual
    console.log('[MOVIMENTACAO API] Buscando produto no banco...');
    const produto = await prisma.produto.findUnique({
      where: { id: produtoId },
    });

    if (!produto) {
      console.log('[MOVIMENTACAO API] ERRO: Produto não encontrado');
      console.log('========================================');
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    console.log('[MOVIMENTACAO API] Produto encontrado:', produto.nome);
    console.log('[MOVIMENTACAO API] Quantidade atual:', Number(produto.quantidade));

    // Calcula nova quantidade
    let novaQuantidade = Number(produto.quantidade);
    if (tipo === 'ENTRADA') {
      novaQuantidade += quantidade;
      console.log('[MOVIMENTACAO API] ENTRADA: +', quantidade, '=', novaQuantidade);
    } else if (tipo === 'SAIDA') {
      novaQuantidade -= quantidade;
      console.log('[MOVIMENTACAO API] SAIDA: -', quantidade, '=', novaQuantidade);
    }

    if (novaQuantidade < 0) {
      console.log('[MOVIMENTACAO API] ERRO: Estoque insuficiente');
      console.log('========================================');
      return NextResponse.json({ error: 'Estoque insuficiente' }, { status: 400 });
    }

    // Cria movimentação e atualiza produto
    console.log('[MOVIMENTACAO API] Executando transação...');
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

    console.log('[MOVIMENTACAO API] Transação concluída com sucesso!');
    console.log('[MOVIMENTACAO API] Nova quantidade do produto:', novaQuantidade);
    console.log('========================================');

    return NextResponse.json({ success: true, novaQuantidade });
  } catch (error: any) {
    console.error('========================================');
    console.error('[MOVIMENTACAO API] ERRO CAPTURADO!');
    console.error('[MOVIMENTACAO API] Tipo do erro:', error?.constructor?.name);
    console.error('[MOVIMENTACAO API] Mensagem:', error?.message);
    console.error('[MOVIMENTACAO API] Code:', error?.code);
    console.error('[MOVIMENTACAO API] Stack:', error?.stack);
    console.error('[MOVIMENTACAO API] Erro completo:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('========================================');
    return NextResponse.json({
      error: 'Erro ao registrar movimentação',
      details: error?.message,
      code: error?.code,
      type: error?.constructor?.name
    }, { status: 500 });
  }
}
