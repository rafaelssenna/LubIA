import { prisma } from '@/lib/prisma';

// Mapeamento: CategoriaServico → TipoLembrete
const CATEGORIA_TO_TIPO: Record<string, string> = {
  TROCA_OLEO: 'TROCA_OLEO',
  FILTROS: 'FILTROS',
  FREIOS: 'FREIOS',
  PNEUS: 'PNEUS',
  REVISOES: 'REVISAO',
  AR_CONDICIONADO: 'OUTRO',
  ELETRICA: 'OUTRO',
  SUSPENSAO: 'OUTRO',
  OUTROS: 'OUTRO',
};

// Calcular média de km/mês baseado no histórico de ordens
export function calcularMediaKmMes(ordens: { kmEntrada: number | null; createdAt: Date }[]): number {
  const ordensComKm = ordens
    .filter(o => o.kmEntrada !== null)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (ordensComKm.length < 2) {
    return 1000; // Padrão: 1000 km/mês
  }

  const primeiraOrdem = ordensComKm[0];
  const ultimaOrdem = ordensComKm[ordensComKm.length - 1];

  const kmTotal = ultimaOrdem.kmEntrada! - primeiraOrdem.kmEntrada!;
  const diasTotal = Math.max(1,
    (new Date(ultimaOrdem.createdAt).getTime() - new Date(primeiraOrdem.createdAt).getTime())
    / (1000 * 60 * 60 * 24)
  );

  const kmPorMes = (kmTotal / diasTotal) * 30;
  return Math.max(500, Math.min(5000, kmPorMes));
}

export interface LembreteGerado {
  veiculoId: number;
  placa: string;
  tipo: string;
  servicoNome: string;
  kmLembrete: number | null;
  motivo: 'km' | 'dias' | 'ambos';
}

/**
 * Gera lembretes automáticos para uma empresa, baseado nos intervalos
 * reais configurados nos serviços (intervaloKm e intervaloDias).
 */
export async function gerarLembretesParaEmpresa(empresaId: number): Promise<LembreteGerado[]> {
  // 1. Buscar serviços da empresa que têm intervalo configurado
  const servicos = await prisma.servico.findMany({
    where: {
      empresaId,
      ativo: true,
      OR: [
        { intervaloKm: { not: null } },
        { intervaloDias: { not: null } },
      ],
    },
  });

  if (servicos.length === 0) return [];

  // Data limite: não criar se já enviou nos últimos 30 dias
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  const hoje = new Date();

  // 2. Buscar todos os veículos da empresa
  const veiculos = await prisma.veiculo.findMany({
    where: { empresaId },
    include: {
      cliente: true,
      ordens: {
        where: { status: { in: ['CONCLUIDO', 'ENTREGUE'] } },
        orderBy: { createdAt: 'desc' },
        include: {
          itens: { include: { servico: true } },
        },
      },
      lembretes: {
        where: {
          OR: [
            { enviado: false },
            { enviado: true, dataEnvio: { gte: trintaDiasAtras } },
          ],
        },
      },
    },
  });

  const lembretesGerados: LembreteGerado[] = [];

  // 3. Para cada veículo, verificar cada serviço com intervalo
  for (const veiculo of veiculos) {
    const kmAtual = veiculo.kmAtual;

    for (const servico of servicos) {
      const tipoLembrete = CATEGORIA_TO_TIPO[servico.categoria] || 'OUTRO';

      // Verificar se já tem lembrete pendente/recente pro mesmo tipo
      const jaTemLembrete = veiculo.lembretes.some(l => l.tipo === tipoLembrete);
      if (jaTemLembrete) continue;

      let precisaPorKm = false;
      let precisaPorDias = false;
      let kmProximaManutencao: number | null = null;

      // --- Verificação por KM ---
      if (servico.intervaloKm && kmAtual) {
        // Buscar última OS que contenha esse serviço (pela categoria)
        const ultimaOSComServico = veiculo.ordens.find(ordem =>
          ordem.itens.some(item => item.servico.categoria === servico.categoria)
        );

        if (ultimaOSComServico?.kmEntrada) {
          // Tem OS anterior com km → próxima = km da OS + intervalo
          kmProximaManutencao = ultimaOSComServico.kmEntrada + servico.intervaloKm;
        } else if (veiculo.kmInicial) {
          // Sem OS mas tem kmInicial → assume que fez na hora do cadastro
          kmProximaManutencao = veiculo.kmInicial + servico.intervaloKm;
        } else {
          // Sem referência de km → não dá pra calcular por km
          kmProximaManutencao = null;
        }

        if (kmProximaManutencao !== null) {
          // Threshold: 10% do intervalo, mínimo 500km
          const threshold = Math.max(500, Math.round(servico.intervaloKm * 0.1));
          const kmRestantes = kmProximaManutencao - kmAtual;

          // Gerar se faltam menos que o threshold (ou já passou)
          if (kmRestantes <= threshold && kmRestantes > -(servico.intervaloKm)) {
            precisaPorKm = true;
          }
        }
      }

      // --- Verificação por DIAS ---
      if (servico.intervaloDias) {
        const ultimaOSComServico = veiculo.ordens.find(ordem =>
          ordem.itens.some(item => item.servico.categoria === servico.categoria)
        );

        let dataReferencia: Date;
        if (ultimaOSComServico?.dataConclusao) {
          dataReferencia = new Date(ultimaOSComServico.dataConclusao);
        } else if (ultimaOSComServico?.createdAt) {
          dataReferencia = new Date(ultimaOSComServico.createdAt);
        } else {
          // Sem OS → usar data de cadastro do veículo
          dataReferencia = new Date(veiculo.createdAt);
        }

        const proximaData = new Date(dataReferencia);
        proximaData.setDate(proximaData.getDate() + servico.intervaloDias);

        // Gerar se faltam 7 dias ou menos (ou já passou)
        const diasRestantes = Math.ceil(
          (proximaData.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diasRestantes <= 7) {
          precisaPorDias = true;
        }
      }

      // --- Criar lembrete se necessário ---
      if (precisaPorKm || precisaPorDias) {
        const motivo = precisaPorKm && precisaPorDias ? 'ambos' : precisaPorKm ? 'km' : 'dias';

        await prisma.lembrete.create({
          data: {
            veiculoId: veiculo.id,
            tipo: tipoLembrete as any,
            dataLembrete: hoje,
            kmLembrete: kmProximaManutencao,
            mensagem: servico.nome, // Nome real do serviço pra mensagem
            empresaId,
          },
        });

        lembretesGerados.push({
          veiculoId: veiculo.id,
          placa: veiculo.placa || 'sem placa',
          tipo: tipoLembrete,
          servicoNome: servico.nome,
          kmLembrete: kmProximaManutencao,
          motivo,
        });
      }
    }
  }

  return lembretesGerados;
}

// ========================================
// MENSAGENS HUMANIZADAS PARA WHATSAPP
// ========================================

export interface VeiculoLembrete {
  lembreteId: number;
  modelo: string;
  marca: string;
  kmLembrete: number | null;
  servicoNome: string; // Nome real do serviço
}

export interface GrupoCliente {
  clienteNome: string;
  telefone: string;
  veiculos: VeiculoLembrete[];
  lembreteIds: number[];
}

export function gerarMensagemHumanizada(grupo: GrupoCliente): string {
  const primeiroNome = grupo.clienteNome.split(' ')[0];

  const saudacoes = [
    `Oi ${primeiroNome}! Tudo bem? 😊`,
    `E aí ${primeiroNome}, tudo certo?`,
    `Oi ${primeiroNome}! Como você está?`,
  ];
  const saudacao = saudacoes[Math.floor(Math.random() * saudacoes.length)];

  // Agrupar por veículo (modelo)
  const porVeiculo = new Map<string, VeiculoLembrete[]>();
  for (const v of grupo.veiculos) {
    const key = `${v.marca} ${v.modelo}`;
    if (!porVeiculo.has(key)) porVeiculo.set(key, []);
    porVeiculo.get(key)!.push(v);
  }

  const veiculosArr = Array.from(porVeiculo.entries());

  if (veiculosArr.length === 1) {
    const [nomeVeiculo, servicos] = veiculosArr[0];

    if (servicos.length === 1) {
      // 1 veículo, 1 serviço
      const s = servicos[0];
      const kmInfo = s.kmLembrete ? ` nos ${s.kmLembrete.toLocaleString('pt-BR')} km` : '';

      return `${saudacao}

Passando pra te dar um toque: vi aqui que o ${s.modelo} está chegando na hora da *${s.servicoNome}*${kmInfo}.

Fazer no prazo certo ajuda a evitar dor de cabeça lá na frente.

Quer que eu reserve um horário? Consigo encaixar ainda essa semana!`;
    }

    // 1 veículo, vários serviços
    const lista = servicos.map(s => {
      const kmInfo = s.kmLembrete ? ` — ${s.kmLembrete.toLocaleString('pt-BR')} km` : '';
      return `🔧 ${s.servicoNome}${kmInfo}`;
    }).join('\n');

    return `${saudacao}

Passando pra te dar um toque: vi aqui que o ${servicos[0].modelo} precisa de atenção:

${lista}

Fazer no prazo certo ajuda a evitar dor de cabeça lá na frente.

Quer que eu reserve um horário pra gente dar uma olhada? Consigo encaixar ainda essa semana!`;
  }

  // Vários veículos
  const blocos = veiculosArr.map(([nomeVeiculo, servicos]) => {
    const lista = servicos.map(s => {
      const kmInfo = s.kmLembrete ? ` — ${s.kmLembrete.toLocaleString('pt-BR')} km` : '';
      return `  🔧 ${s.servicoNome}${kmInfo}`;
    }).join('\n');
    return `🚗 *${nomeVeiculo}*\n${lista}`;
  }).join('\n\n');

  return `${saudacao}

Passando pra te dar um toque: vi aqui que seus veículos precisam de atenção:

${blocos}

Fazer no prazo certo ajuda a evitar dor de cabeça lá na frente.

Quer que eu reserve um horário pra gente dar uma olhada neles? Consigo encaixar ainda essa semana!`;
}
