import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { parseDateToBrazil } from '@/lib/timezone';

// GET - Listar lembretes com filtros
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const busca = searchParams.get('busca') || '';
    const status = searchParams.get('status') || ''; // pendente, enviado, vencido
    const tipo = searchParams.get('tipo') || '';

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const where: any = {
      empresaId: session.empresaId,
    };

    // Busca por cliente ou placa
    if (busca) {
      where.OR = [
        { veiculo: { placa: { contains: busca, mode: 'insensitive' } } },
        { veiculo: { cliente: { nome: { contains: busca, mode: 'insensitive' } } } },
      ];
    }

    // Filtro por tipo
    if (tipo) {
      where.tipo = tipo;
    }

    // Filtro por status
    if (status === 'pendente') {
      where.enviado = false;
      where.dataLembrete = { gte: hoje };
    } else if (status === 'enviado') {
      where.enviado = true;
    } else if (status === 'vencido') {
      where.enviado = false;
      where.dataLembrete = { lt: hoje };
    }

    const lembretes = await prisma.lembrete.findMany({
      where,
      include: {
        veiculo: {
          include: {
            cliente: true,
          },
        },
      },
      orderBy: { dataLembrete: 'asc' },
    });

    // Calcular stats
    const [totalPendentes, totalEnviados, totalVencidos, totalUrgentes] = await Promise.all([
      prisma.lembrete.count({
        where: { empresaId: session.empresaId, enviado: false, dataLembrete: { gte: hoje } },
      }),
      prisma.lembrete.count({
        where: { empresaId: session.empresaId, enviado: true },
      }),
      prisma.lembrete.count({
        where: { empresaId: session.empresaId, enviado: false, dataLembrete: { lt: hoje } },
      }),
      prisma.lembrete.count({
        where: {
          empresaId: session.empresaId,
          enviado: false,
          dataLembrete: {
            gte: hoje,
            lte: new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 dias
          },
        },
      }),
    ]);

    return NextResponse.json({
      data: lembretes.map((l) => {
        const diasRestantes = Math.ceil(
          (new Date(l.dataLembrete).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
        );

        let urgencia = 'baixa';
        if (diasRestantes < 0) urgencia = 'vencido';
        else if (diasRestantes <= 3) urgencia = 'alta';
        else if (diasRestantes <= 7) urgencia = 'media';

        return {
          id: l.id,
          tipo: l.tipo,
          dataLembrete: l.dataLembrete,
          kmLembrete: l.kmLembrete,
          mensagem: l.mensagem,
          enviado: l.enviado,
          dataEnvio: l.dataEnvio,
          createdAt: l.createdAt,
          diasRestantes,
          urgencia,
          veiculo: {
            id: l.veiculo.id,
            placa: l.veiculo.placa,
            marca: l.veiculo.marca,
            modelo: l.veiculo.modelo,
            ano: l.veiculo.ano,
            kmAtual: l.veiculo.kmAtual,
            cliente: {
              id: l.veiculo.cliente.id,
              nome: l.veiculo.cliente.nome,
              telefone: l.veiculo.cliente.telefone,
            },
          },
        };
      }),
      stats: {
        pendentes: totalPendentes,
        enviados: totalEnviados,
        vencidos: totalVencidos,
        urgentes: totalUrgentes,
      },
    });
  } catch (error: any) {
    console.error('[LEMBRETES API GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar lembretes' }, { status: 500 });
  }
}

// POST - Criar novo lembrete
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { veiculoId, tipo, dataLembrete, kmLembrete, mensagem } = body;

    if (!veiculoId || !tipo || !dataLembrete) {
      return NextResponse.json(
        { error: 'Veículo, tipo e data são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se veículo existe e pertence à empresa
    const veiculo = await prisma.veiculo.findFirst({
      where: { id: veiculoId, empresaId: session.empresaId },
      include: { cliente: true },
    });

    if (!veiculo) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    const lembrete = await prisma.lembrete.create({
      data: {
        veiculoId,
        tipo: tipo.toUpperCase(),
        dataLembrete: parseDateToBrazil(dataLembrete),
        kmLembrete: kmLembrete || null,
        mensagem: mensagem || null,
        empresaId: session.empresaId,
      },
      include: {
        veiculo: {
          include: {
            cliente: true,
          },
        },
      },
    });

    return NextResponse.json({
      data: {
        id: lembrete.id,
        tipo: lembrete.tipo,
        dataLembrete: lembrete.dataLembrete,
        veiculo: {
          placa: lembrete.veiculo.placa,
          cliente: lembrete.veiculo.cliente.nome,
        },
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[LEMBRETES API POST] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao criar lembrete' }, { status: 500 });
  }
}

// DELETE - Excluir lembretes
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');

    if (ids) {
      const idArray = ids.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      await prisma.lembrete.deleteMany({
        where: { id: { in: idArray }, empresaId: session.empresaId },
      });
      return NextResponse.json({ success: true, deleted: idArray.length });
    }

    // Se não passar ids, deletar todos os não enviados da empresa
    const result = await prisma.lembrete.deleteMany({
      where: { enviado: false, empresaId: session.empresaId },
    });

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error: any) {
    console.error('[LEMBRETES API DELETE] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao excluir lembretes' }, { status: 500 });
  }
}

// PATCH - Resetar lembretes (marcar como não enviados)
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, ids } = body;

    if (action === 'reset') {
      // Resetar lembretes específicos ou todos os enviados da empresa
      const where: any = { empresaId: session.empresaId };
      if (ids && ids.length > 0) {
        where.id = { in: ids };
      } else {
        where.enviado = true;
      }

      const result = await prisma.lembrete.updateMany({
        where,
        data: {
          enviado: false,
          dataEnvio: null,
        },
      });

      console.log(`[LEMBRETES API PATCH] Resetados ${result.count} lembretes`);

      return NextResponse.json({
        success: true,
        resetados: result.count,
      });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    console.error('[LEMBRETES API PATCH] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao resetar lembretes' }, { status: 500 });
  }
}
