import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const INTERVALO_TROCA_OLEO = 5000; // km entre trocas de óleo
const INTERVALO_ALINHAMENTO = 10000; // km entre alinhamentos
const INTERVALO_FILTROS = 10000; // km entre troca de filtros

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

    // Função auxiliar para buscar último serviço por categoria
    const buscarUltimoServico = async (categoria: 'TROCA_OLEO' | 'PNEUS' | 'FILTROS') => {
      return prisma.ordemServico.findFirst({
        where: {
          veiculoId: veiculo.id,
          status: { in: ['CONCLUIDO', 'ENTREGUE'] },
          itens: {
            some: {
              servico: { categoria },
            },
          },
        },
        select: {
          dataConclusao: true,
          kmEntrada: true,
        },
        orderBy: { dataConclusao: 'desc' },
      });
    };

    // Função auxiliar para calcular próxima manutenção
    const calcularProximaManutencao = (ultimoKm: number | null, intervalo: number, kmAtual: number) => {
      let proximaKm: number;
      if (ultimoKm) {
        proximaKm = ultimoKm + intervalo;
      } else {
        proximaKm = Math.ceil((kmAtual + 1) / intervalo) * intervalo;
      }
      let faltando = proximaKm - kmAtual;
      if (faltando <= 0) {
        proximaKm = Math.ceil((kmAtual + 1) / intervalo) * intervalo;
        faltando = proximaKm - kmAtual;
      }
      return { km: proximaKm, kmFaltando: faltando };
    };

    const kmAtual = veiculo.kmAtual || 0;

    // Buscar últimos serviços de cada categoria
    const [ultimaTrocaOleo, ultimoAlinhamento, ultimaTrocaFiltros] = await Promise.all([
      buscarUltimoServico('TROCA_OLEO'),
      buscarUltimoServico('PNEUS'),
      buscarUltimoServico('FILTROS'),
    ]);

    // Calcular próximas manutenções
    const proximaTrocaOleo = calcularProximaManutencao(ultimaTrocaOleo?.kmEntrada || null, INTERVALO_TROCA_OLEO, kmAtual);
    const proximoAlinhamento = calcularProximaManutencao(ultimoAlinhamento?.kmEntrada || null, INTERVALO_ALINHAMENTO, kmAtual);
    const proximaTrocaFiltros = calcularProximaManutencao(ultimaTrocaFiltros?.kmEntrada || null, INTERVALO_FILTROS, kmAtual);

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
        proximaTrocaOleo: proximaTrocaOleo,
        ultimoAlinhamento: ultimoAlinhamento ? {
          data: ultimoAlinhamento.dataConclusao,
          km: ultimoAlinhamento.kmEntrada,
        } : null,
        proximoAlinhamento: proximoAlinhamento,
        ultimaTrocaFiltros: ultimaTrocaFiltros ? {
          data: ultimaTrocaFiltros.dataConclusao,
          km: ultimaTrocaFiltros.kmEntrada,
        } : null,
        proximaTrocaFiltros: proximaTrocaFiltros,
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
