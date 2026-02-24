import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const INTERVALO_TROCA_OLEO = 5000; // km entre trocas de óleo
const INTERVALO_ALINHAMENTO = 10000; // km entre alinhamentos
const INTERVALO_FILTROS = 10000; // km entre troca de filtros

// Palavras-chave para identificar tipo de serviço pelo nome
const KEYWORDS_OLEO = ['óleo', 'oleo', 'lubrificante', 'troca de óleo', 'troca de oleo'];
const KEYWORDS_ALINHAMENTO = ['alinhamento', 'balanceamento', 'pneu', 'rodas', 'roda'];
const KEYWORDS_FILTROS = ['filtro', 'filtros', 'ar condicionado', 'ar-condicionado'];

// Categorias de produtos que indicam tipo de manutenção
const PRODUTOS_OLEO = ['OLEO_LUBRIFICANTE', 'ADITIVO', 'GRAXA'];
const PRODUTOS_FILTROS = ['FILTRO_OLEO', 'FILTRO_AR', 'FILTRO_AR_CONDICIONADO', 'FILTRO_COMBUSTIVEL'];

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

    // Buscar TODAS as ordens de serviço do veículo (sem limite de data)
    const ordens = await prisma.ordemServico.findMany({
      where: {
        veiculoId: veiculo.id,
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
        itensProduto: {
          select: {
            produto: {
              select: { nome: true, categoria: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('[CONSULTA] Ordens encontradas:', ordens.length);

    // Função para verificar se serviço/produto é de um tipo específico
    const matchKeywords = (nome: string, keywords: string[]) => {
      const nomeLower = nome.toLowerCase();
      return keywords.some(k => nomeLower.includes(k.toLowerCase()));
    };

    // Função para buscar última manutenção por tipo (mais flexível)
    const buscarUltimaManutencao = (
      tipo: 'oleo' | 'alinhamento' | 'filtros'
    ): { dataConclusao: Date | null; kmEntrada: number | null } | null => {
      const categoriaServico = tipo === 'oleo' ? 'TROCA_OLEO' : tipo === 'alinhamento' ? 'PNEUS' : 'FILTROS';
      const keywords = tipo === 'oleo' ? KEYWORDS_OLEO : tipo === 'alinhamento' ? KEYWORDS_ALINHAMENTO : KEYWORDS_FILTROS;
      const categoriasProdutos = tipo === 'oleo' ? PRODUTOS_OLEO : tipo === 'filtros' ? PRODUTOS_FILTROS : [];

      // Filtrar ordens concluídas/entregues
      const ordensConcluidas = ordens.filter(o => o.status === 'CONCLUIDO' || o.status === 'ENTREGUE');

      for (const ordem of ordensConcluidas) {
        // Verificar por categoria do serviço
        const temServicoCategoria = ordem.itens?.some(
          item => item.servico?.categoria === categoriaServico
        );

        // Verificar por nome do serviço (keywords)
        const temServicoNome = ordem.itens?.some(
          item => item.servico?.nome && matchKeywords(item.servico.nome, keywords)
        );

        // Verificar por categoria do produto usado
        const temProdutoCategoria = ordem.itensProduto?.some(
          item => item.produto?.categoria && categoriasProdutos.includes(item.produto.categoria)
        );

        // Verificar por nome do produto usado
        const temProdutoNome = ordem.itensProduto?.some(
          item => item.produto?.nome && matchKeywords(item.produto.nome, keywords)
        );

        if (temServicoCategoria || temServicoNome || temProdutoCategoria || temProdutoNome) {
          console.log(`[CONSULTA] Encontrou ${tipo}:`, {
            ordemId: ordem.id,
            temServicoCategoria,
            temServicoNome,
            temProdutoCategoria,
            temProdutoNome,
          });
          return {
            dataConclusao: ordem.dataConclusao,
            kmEntrada: ordem.kmEntrada,
          };
        }
      }

      return null;
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

    const kmAtual = veiculo.kmAtual || 0;

    // Buscar últimos serviços de cada tipo (usando lógica flexível)
    const ultimaTrocaOleo = buscarUltimaManutencao('oleo');
    const ultimoAlinhamento = buscarUltimaManutencao('alinhamento');
    const ultimaTrocaFiltros = buscarUltimaManutencao('filtros');

    console.log('[CONSULTA] Últimas manutenções:', {
      oleo: ultimaTrocaOleo,
      alinhamento: ultimoAlinhamento,
      filtros: ultimaTrocaFiltros,
    });

    // Calcular próximas manutenções
    const proximaTrocaOleo = calcularProximaManutencao(ultimaTrocaOleo?.kmEntrada || null, INTERVALO_TROCA_OLEO, kmAtual);
    const proximoAlinhamento = calcularProximaManutencao(ultimoAlinhamento?.kmEntrada || null, INTERVALO_ALINHAMENTO, kmAtual);
    const proximaTrocaFiltros = calcularProximaManutencao(ultimaTrocaFiltros?.kmEntrada || null, INTERVALO_FILTROS, kmAtual);

    // Limitar ordens para histórico (últimas 20)
    const ordensHistorico = ordens.slice(0, 20);

    // Formatar resposta
    return NextResponse.json({
      veiculo: {
        placa: veiculo.placa,
        marca: veiculo.marca,
        modelo: veiculo.modelo,
        ano: veiculo.ano,
        kmAtual: veiculo.kmAtual,
      },
      ordens: ordensHistorico.map((o) => {
        // Combinar serviços e produtos para exibição
        const servicosNomes = o.itens
          ?.filter((i) => i.servico?.nome)
          .map((i) => i.servico.nome) || [];
        const produtosNomes = o.itensProduto
          ?.filter((i) => i.produto?.nome)
          .map((i) => i.produto.nome) || [];

        return {
          numero: o.numero?.slice(-8).toUpperCase() || 'N/A',
          status: o.status,
          dataAgendada: o.dataAgendada,
          dataInicio: o.dataInicio,
          dataConclusao: o.dataConclusao,
          kmEntrada: o.kmEntrada,
          createdAt: o.createdAt,
          servicos: [...servicosNomes, ...produtosNomes],
        };
      }),
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
