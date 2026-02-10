import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET - Listar conversas
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const busca = searchParams.get('busca') || '';
    const arquivadas = searchParams.get('arquivadas') === 'true';

    const where: any = {
      empresaId: session.empresaId,
      arquivada: arquivadas,
    };

    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { telefone: { contains: busca } },
        { ultimaMensagem: { contains: busca, mode: 'insensitive' } },
      ];
    }

    const conversas = await prisma.conversa.findMany({
      where,
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: { ultimaData: 'desc' },
    });

    // Stats
    const [totalConversas, totalNaoLidas, conversasHoje] = await Promise.all([
      prisma.conversa.count({ where: { empresaId: session.empresaId, arquivada: false } }),
      prisma.conversa.aggregate({
        where: { empresaId: session.empresaId, arquivada: false },
        _sum: { naoLidas: true },
      }),
      prisma.conversa.count({
        where: {
          empresaId: session.empresaId,
          arquivada: false,
          ultimaData: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return NextResponse.json({
      data: conversas.map(c => ({
        id: c.id,
        telefone: c.telefone,
        nome: c.nome || c.cliente?.nome || formatPhone(c.telefone),
        clienteId: c.clienteId,
        ultimaMensagem: c.ultimaMensagem,
        ultimaData: c.ultimaData,
        naoLidas: c.naoLidas,
        arquivada: c.arquivada,
      })),
      stats: {
        total: totalConversas,
        naoLidas: totalNaoLidas._sum.naoLidas || 0,
        hoje: conversasHoje,
      },
    });
  } catch (error: any) {
    console.error('[CONVERSAS API] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar conversas' }, { status: 500 });
  }
}

// Formatar telefone para exibição
function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 13 && clean.startsWith('55')) {
    // 55 11 99999-9999
    return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  if (clean.length === 12 && clean.startsWith('55')) {
    // 55 11 9999-9999
    return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`;
  }
  return phone;
}
