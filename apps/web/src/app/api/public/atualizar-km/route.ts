import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const MAX_KM = 999999; // Limite máximo de km

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { placa, km } = body;

    console.log('[ATUALIZAR-KM] Recebido:', { placa, km });

    // Validações
    if (!placa) {
      return NextResponse.json({ error: 'Placa é obrigatória' }, { status: 400 });
    }

    if (!km || typeof km !== 'number') {
      return NextResponse.json({ error: 'KM é obrigatório e deve ser um número' }, { status: 400 });
    }

    if (km < 0) {
      return NextResponse.json({ error: 'KM não pode ser negativo' }, { status: 400 });
    }

    if (km > MAX_KM) {
      return NextResponse.json({ error: `KM não pode ser maior que ${MAX_KM.toLocaleString('pt-BR')}` }, { status: 400 });
    }

    // Normalizar placa
    const placaNormalizada = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // Buscar veículo
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

    if (!veiculo) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    // Validar que km não está diminuindo (a menos que seja 0)
    if (veiculo.kmAtual && km < veiculo.kmAtual) {
      return NextResponse.json({
        error: `KM não pode ser menor que o atual (${veiculo.kmAtual.toLocaleString('pt-BR')} km)`,
      }, { status: 400 });
    }

    // Atualizar km do veículo
    const veiculoAtualizado = await prisma.veiculo.update({
      where: { id: veiculo.id },
      data: { kmAtual: km },
      select: {
        id: true,
        placa: true,
        marca: true,
        modelo: true,
        ano: true,
        kmAtual: true,
      },
    });

    console.log('[ATUALIZAR-KM] Veículo atualizado:', veiculoAtualizado);

    // Intervalos de manutenção
    const INTERVALO_TROCA_OLEO = 5000;
    const INTERVALO_ALINHAMENTO = 10000;
    const INTERVALO_FILTROS = 10000;

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
      const faltando = proximaKm - kmAtual;
      // Retorna valor negativo se estiver atrasado (não reseta para próximo intervalo)
      return { km: proximaKm, kmFaltando: faltando };
    };

    // Buscar últimos serviços de cada categoria
    const [ultimaTrocaOleo, ultimoAlinhamento, ultimaTrocaFiltros] = await Promise.all([
      buscarUltimoServico('TROCA_OLEO'),
      buscarUltimoServico('PNEUS'),
      buscarUltimoServico('FILTROS'),
    ]);

    // Calcular próximas manutenções
    const proximaTrocaOleo = calcularProximaManutencao(ultimaTrocaOleo?.kmEntrada || null, INTERVALO_TROCA_OLEO, km);
    const proximoAlinhamento = calcularProximaManutencao(ultimoAlinhamento?.kmEntrada || null, INTERVALO_ALINHAMENTO, km);
    const proximaTrocaFiltros = calcularProximaManutencao(ultimaTrocaFiltros?.kmEntrada || null, INTERVALO_FILTROS, km);

    return NextResponse.json({
      success: true,
      veiculo: {
        placa: veiculoAtualizado.placa,
        marca: veiculoAtualizado.marca,
        modelo: veiculoAtualizado.modelo,
        ano: veiculoAtualizado.ano,
        kmAtual: veiculoAtualizado.kmAtual,
      },
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
    console.error('[ATUALIZAR-KM] Erro:', error?.message);
    console.error('[ATUALIZAR-KM] Stack:', error?.stack);
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 });
  }
}
