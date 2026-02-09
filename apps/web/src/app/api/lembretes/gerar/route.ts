import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Calcular média de km/mês baseado no histórico de ordens
function calcularMediaKmMes(ordens: { kmEntrada: number | null; createdAt: Date }[]): number {
  // Filtrar ordens com km registrado e ordenar por data
  const ordensComKm = ordens
    .filter(o => o.kmEntrada !== null)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (ordensComKm.length < 2) {
    // Sem histórico suficiente, usar média padrão de 1000 km/mês
    return 1000;
  }

  // Calcular diferença total de km e tempo
  const primeiraOrdem = ordensComKm[0];
  const ultimaOrdem = ordensComKm[ordensComKm.length - 1];

  const kmTotal = ultimaOrdem.kmEntrada! - primeiraOrdem.kmEntrada!;
  const diasTotal = Math.max(1,
    (new Date(ultimaOrdem.createdAt).getTime() - new Date(primeiraOrdem.createdAt).getTime())
    / (1000 * 60 * 60 * 24)
  );

  // Converter para km/mês
  const kmPorDia = kmTotal / diasTotal;
  const kmPorMes = kmPorDia * 30;

  // Limitar entre 500 e 5000 km/mês (valores razoáveis)
  return Math.max(500, Math.min(5000, kmPorMes));
}

// POST - Gerar lembretes automáticos baseado no KM dos veículos
export async function POST() {
  try {
    // Buscar configuração de antecedência
    const config = await prisma.configuracao.findUnique({
      where: { id: 1 },
    });

    const diasAntecedencia = config?.lembreteAntecedencia || 7;
    const kmAntecedencia = 500; // Avisar 500km antes

    // Buscar todos os veículos com km cadastrado
    const veiculos = await prisma.veiculo.findMany({
      where: {
        kmAtual: { not: null },
      },
      include: {
        cliente: true,
        ordens: {
          where: {
            status: { in: ['CONCLUIDO', 'ENTREGUE'] },
          },
          orderBy: { createdAt: 'desc' },
          include: {
            itens: {
              include: { servico: true },
            },
          },
        },
        lembretes: {
          where: {
            enviado: false,
            tipo: 'TROCA_OLEO',
          },
        },
      },
    });

    const lembretesGerados: { veiculoId: number; placa: string; kmLembrete: number; mediaKmMes: number; diasEstimados: number }[] = [];

    for (const veiculo of veiculos) {
      // Se já tem lembrete pendente de troca de óleo, pular
      if (veiculo.lembretes.length > 0) {
        continue;
      }

      const kmAtual = veiculo.kmAtual!;
      const ultimaOrdem = veiculo.ordens[0];

      // Calcular próxima troca baseado na última ordem ou km atual
      let kmBase = kmAtual;
      let foiTrocaOleo = false;

      if (ultimaOrdem) {
        // Verificar se a última ordem incluiu troca de óleo
        const temTrocaOleo = ultimaOrdem.itens.some(
          item => item.servico.categoria === 'TROCA_OLEO'
        );

        if (temTrocaOleo && ultimaOrdem.kmEntrada) {
          kmBase = ultimaOrdem.kmEntrada;
          foiTrocaOleo = true;
        }
      }

      // Próxima troca a cada 5000km
      const proximaTroca = Math.ceil((kmBase + 5000) / 5000) * 5000;
      const kmRestantes = proximaTroca - kmAtual;

      // Se faltam menos de 500km, criar lembrete
      if (kmRestantes <= kmAntecedencia && kmRestantes > -1000) {
        // Calcular média de km/mês baseada no histórico REAL do veículo
        const mediaKmMes = calcularMediaKmMes(veiculo.ordens);
        const kmPorDia = mediaKmMes / 30;

        // Estimar quantos dias até atingir o km da próxima troca
        const diasEstimados = kmRestantes > 0 ? Math.max(1, Math.ceil(kmRestantes / kmPorDia)) : 1;

        const dataLembrete = new Date();
        dataLembrete.setDate(dataLembrete.getDate() + Math.min(diasEstimados, diasAntecedencia));

        // Criar lembrete
        await prisma.lembrete.create({
          data: {
            veiculoId: veiculo.id,
            tipo: 'TROCA_OLEO',
            dataLembrete,
            kmLembrete: proximaTroca,
            mensagem: null,
          },
        });

        lembretesGerados.push({
          veiculoId: veiculo.id,
          placa: veiculo.placa,
          kmLembrete: proximaTroca,
          mediaKmMes: Math.round(mediaKmMes),
          diasEstimados,
        });
      }
    }

    console.log(`[LEMBRETES GERAR] Gerados ${lembretesGerados.length} lembretes`);

    return NextResponse.json({
      success: true,
      total: lembretesGerados.length,
      lembretes: lembretesGerados,
    });
  } catch (error: any) {
    console.error('[LEMBRETES GERAR] Erro:', error?.message);
    return NextResponse.json({
      error: 'Erro ao gerar lembretes',
      details: error?.message,
    }, { status: 500 });
  }
}

// GET - Preview de lembretes que seriam gerados (sem criar)
export async function GET() {
  try {
    const kmAntecedencia = 500;

    const veiculos = await prisma.veiculo.findMany({
      where: {
        kmAtual: { not: null },
      },
      include: {
        cliente: true,
        ordens: {
          where: {
            status: { in: ['CONCLUIDO', 'ENTREGUE'] },
          },
          orderBy: { createdAt: 'desc' },
          include: {
            itens: {
              include: { servico: true },
            },
          },
        },
        lembretes: {
          where: {
            enviado: false,
            tipo: 'TROCA_OLEO',
          },
        },
      },
    });

    const preview: {
      veiculo: string;
      cliente: string;
      telefone: string;
      kmAtual: number;
      proximaTroca: number;
      kmRestantes: number;
      mediaKmMes: number;
      diasEstimados: number;
      jaTemLembrete: boolean;
    }[] = [];

    for (const veiculo of veiculos) {
      const kmAtual = veiculo.kmAtual!;
      const ultimaOrdem = veiculo.ordens[0];

      let kmBase = kmAtual;
      if (ultimaOrdem?.kmEntrada) {
        const temTrocaOleo = ultimaOrdem.itens.some(
          item => item.servico.categoria === 'TROCA_OLEO'
        );
        if (temTrocaOleo) {
          kmBase = ultimaOrdem.kmEntrada;
        }
      }

      const proximaTroca = Math.ceil((kmBase + 5000) / 5000) * 5000;
      const kmRestantes = proximaTroca - kmAtual;

      // Mostrar veículos que precisam de lembrete em breve
      if (kmRestantes <= kmAntecedencia) {
        // Calcular média baseada no histórico
        const mediaKmMes = calcularMediaKmMes(veiculo.ordens);
        const kmPorDia = mediaKmMes / 30;
        const diasEstimados = kmRestantes > 0 ? Math.max(1, Math.ceil(kmRestantes / kmPorDia)) : 1;

        preview.push({
          veiculo: `${veiculo.marca} ${veiculo.modelo} (${veiculo.placa})`,
          cliente: veiculo.cliente.nome,
          telefone: veiculo.cliente.telefone || 'Sem telefone',
          kmAtual,
          proximaTroca,
          kmRestantes,
          mediaKmMes: Math.round(mediaKmMes),
          diasEstimados,
          jaTemLembrete: veiculo.lembretes.length > 0,
        });
      }
    }

    return NextResponse.json({
      total: preview.length,
      veiculos: preview,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Erro ao verificar veículos',
    }, { status: 500 });
  }
}
