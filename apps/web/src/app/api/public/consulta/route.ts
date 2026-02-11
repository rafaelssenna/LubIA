import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const INTERVALO_TROCA_OLEO = 5000; // km entre trocas de óleo

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { placa } = body;

    console.log('[CONSULTA] Recebido:', { placa });

    if (!placa) {
      return NextResponse.json({ error: 'Placa é obrigatória' }, { status: 400 });
    }

    // Normalizar placa (uppercase, sem caracteres especiais)
    const placaNormalizada = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    console.log('[CONSULTA] Placa normalizada:', placaNormalizada);

    if (placaNormalizada.length < 6) {
      return NextResponse.json({ error: 'Placa inválida' }, { status: 400 });
    }

    // Buscar veículo pela placa
    const veiculo = await prisma.veiculo.findFirst({
      where: { placa: placaNormalizada },
      select: {
        id: true,
        placa: true,
        marca: true,
        modelo: true,
        ano: true,
        kmAtual: true,
      },
    });

    console.log('[CONSULTA] Veículo encontrado:', veiculo);

    if (!veiculo) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    // Buscar ordens de serviço do veículo (últimos 12 meses)
    const dozeMesesAtras = new Date();
    dozeMesesAtras.setMonth(dozeMesesAtras.getMonth() - 12);

    const ordens = await prisma.ordemServico.findMany({
      where: {
        veiculoId: veiculo.id,
        createdAt: { gte: dozeMesesAtras },
      },
      select: {
        id: true,
        numero: true,
        status: true,
        dataAgendada: true,
        dataInicio: true,
        dataConclusao: true,
        kmEntrada: true,
        createdAt: true,
        itens: {
          select: {
            servico: {
              select: { nome: true, categoria: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    console.log('[CONSULTA] Ordens encontradas:', ordens.length);

    // Buscar última troca de óleo (ordem concluída/entregue com serviço TROCA_OLEO)
    const ultimaTrocaOleo = await prisma.ordemServico.findFirst({
      where: {
        veiculoId: veiculo.id,
        status: { in: ['CONCLUIDO', 'ENTREGUE'] },
        itens: {
          some: {
            servico: {
              categoria: 'TROCA_OLEO',
            },
          },
        },
      },
      select: {
        dataConclusao: true,
        kmEntrada: true,
      },
      orderBy: { dataConclusao: 'desc' },
    });

    // Calcular próxima troca de óleo
    let proximaTrocaKm: number;
    let kmFaltando: number;
    const kmAtual = veiculo.kmAtual || 0;

    if (ultimaTrocaOleo?.kmEntrada) {
      // Se tem histórico: próxima = última + 5000
      proximaTrocaKm = ultimaTrocaOleo.kmEntrada + INTERVALO_TROCA_OLEO;
    } else {
      // Se não tem histórico: arredondar para próximo múltiplo de 5000
      proximaTrocaKm = Math.ceil((kmAtual + 1) / INTERVALO_TROCA_OLEO) * INTERVALO_TROCA_OLEO;
    }

    kmFaltando = proximaTrocaKm - kmAtual;

    // Se km faltando for negativo, calcular próxima troca a partir do km atual
    if (kmFaltando <= 0) {
      proximaTrocaKm = Math.ceil((kmAtual + 1) / INTERVALO_TROCA_OLEO) * INTERVALO_TROCA_OLEO;
      kmFaltando = proximaTrocaKm - kmAtual;
    }

    // Formatar resposta
    return NextResponse.json({
      veiculo: {
        placa: veiculo.placa,
        marca: veiculo.marca,
        modelo: veiculo.modelo,
        ano: veiculo.ano,
        kmAtual: veiculo.kmAtual,
      },
      ordens: ordens.map((o) => ({
        numero: o.numero?.slice(-8).toUpperCase() || 'N/A',
        status: o.status,
        dataAgendada: o.dataAgendada,
        dataInicio: o.dataInicio,
        dataConclusao: o.dataConclusao,
        createdAt: o.createdAt,
        servicos: o.itens
          ?.filter((i) => i.servico?.nome)
          .map((i) => i.servico.nome) || [],
      })),
      manutencao: {
        ultimaTrocaOleo: ultimaTrocaOleo ? {
          data: ultimaTrocaOleo.dataConclusao,
          km: ultimaTrocaOleo.kmEntrada,
        } : null,
        proximaTrocaOleo: {
          km: proximaTrocaKm,
          kmFaltando: kmFaltando,
        },
      },
    });
  } catch (error: any) {
    console.error('[CONSULTA] Erro:', error?.message);
    console.error('[CONSULTA] Stack:', error?.stack);
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 });
  }
}
