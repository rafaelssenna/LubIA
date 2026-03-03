import { NextRequest, NextResponse } from 'next/server';
import { clearHistory } from '@/lib/chatbot';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'phoneNumber é obrigatório' }, { status: 400 });
    }

    // 1. Limpar memória in-memory (conversationHistory, agendamentoState, cadastroState)
    clearHistory(phoneNumber);

    // 2. Deletar mensagens do banco para que getRecentMessages retorne vazio
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const conversa = await prisma.conversa.findFirst({
      where: {
        empresaId: session.empresaId,
        OR: [
          { telefone: { contains: cleanPhone.slice(-11) } },
          { telefone: { contains: cleanPhone } },
          { telefone: cleanPhone },
        ],
      },
    });

    let mensagensRemovidas = 0;
    if (conversa) {
      const result = await prisma.mensagem.deleteMany({
        where: { conversaId: conversa.id },
      });
      mensagensRemovidas = result.count;
    }

    return NextResponse.json({
      success: true,
      message: `Memória limpa para ${phoneNumber}`,
      mensagensRemovidas,
      conversaId: conversa?.id || null,
    });
  } catch (error: any) {
    console.error('[CLEAR MEMORY] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao limpar memória' }, { status: 500 });
  }
}
