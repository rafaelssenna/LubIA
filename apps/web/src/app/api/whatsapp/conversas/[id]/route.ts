import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Buscar conversa com mensagens
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversaId = parseInt(id);

    if (isNaN(conversaId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const conversa = await prisma.conversa.findUnique({
      where: { id: conversaId },
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            telefone: true,
            email: true,
          },
        },
        mensagens: {
          orderBy: { dataEnvio: 'asc' },
          take: 100, // Últimas 100 mensagens
        },
      },
    });

    if (!conversa) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    // Marcar mensagens como lidas e zerar contador
    await prisma.$transaction([
      prisma.mensagem.updateMany({
        where: { conversaId, lida: false },
        data: { lida: true },
      }),
      prisma.conversa.update({
        where: { id: conversaId },
        data: { naoLidas: 0 },
      }),
    ]);

    return NextResponse.json({
      data: {
        id: conversa.id,
        telefone: conversa.telefone,
        nome: conversa.nome || conversa.cliente?.nome || conversa.telefone,
        cliente: conversa.cliente,
        arquivada: conversa.arquivada,
        mensagens: conversa.mensagens.map(m => ({
          id: m.id,
          tipo: m.tipo,
          conteudo: m.conteudo,
          enviada: m.enviada,
          lida: m.lida,
          dataEnvio: m.dataEnvio,
        })),
      },
    });
  } catch (error: any) {
    console.error('[CONVERSA API] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar conversa' }, { status: 500 });
  }
}

// PUT - Atualizar conversa (arquivar, etc)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversaId = parseInt(id);
    const body = await request.json();

    if (isNaN(conversaId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const { arquivada, nome } = body;

    const conversa = await prisma.conversa.update({
      where: { id: conversaId },
      data: {
        ...(arquivada !== undefined && { arquivada }),
        ...(nome !== undefined && { nome }),
      },
    });

    return NextResponse.json({ data: conversa });
  } catch (error: any) {
    console.error('[CONVERSA API] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao atualizar conversa' }, { status: 500 });
  }
}

// DELETE - Deletar conversa e mensagens
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversaId = parseInt(id);

    if (isNaN(conversaId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    await prisma.conversa.delete({
      where: { id: conversaId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[CONVERSA API] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao deletar conversa' }, { status: 500 });
  }
}
