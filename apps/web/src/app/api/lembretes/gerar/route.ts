import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
          take: 1,
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

    const lembretesGerados: { veiculoId: number; placa: string; kmLembrete: number }[] = [];

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
        // Calcular data estimada (assumindo ~1000km/mês)
        const diasEstimados = Math.max(1, Math.floor(kmRestantes / 33)); // ~33km/dia
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
          take: 1,
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
        preview.push({
          veiculo: `${veiculo.marca} ${veiculo.modelo} (${veiculo.placa})`,
          cliente: veiculo.cliente.nome,
          telefone: veiculo.cliente.telefone || 'Sem telefone',
          kmAtual,
          proximaTroca,
          kmRestantes,
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
