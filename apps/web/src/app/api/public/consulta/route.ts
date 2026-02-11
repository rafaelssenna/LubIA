import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        createdAt: true,
        itens: {
          select: {
            servico: {
              select: { nome: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    console.log('[CONSULTA] Ordens encontradas:', ordens.length);

    // Formatar resposta com tratamento seguro para itens
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
