import { GoogleGenerativeAI, FunctionDeclarationsTool, SchemaType } from '@google/generative-ai';
import { prisma } from './prisma';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ==========================================
// TRANSCRIÇÃO DE ÁUDIO COM GEMINI
// ==========================================

// Transcrever áudio usando Gemini
export async function transcribeAudio(audioUrl: string, token: string): Promise<string | null> {
  try {
    console.log('[CHATBOT] Iniciando transcrição de áudio:', audioUrl);

    // Baixar o áudio da UazAPI
    const audioResponse = await fetch(audioUrl, {
      headers: { 'token': token },
    });

    if (!audioResponse.ok) {
      console.error('[CHATBOT] Erro ao baixar áudio:', audioResponse.status);
      return null;
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    // Detectar mimetype do áudio
    const contentType = audioResponse.headers.get('content-type') || 'audio/ogg';
    console.log('[CHATBOT] Áudio baixado, tipo:', contentType, 'tamanho:', audioBuffer.byteLength);

    // Usar Gemini para transcrever
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: contentType,
          data: audioBase64,
        },
      },
      {
        text: 'Transcreva este áudio em português brasileiro. Retorne APENAS o texto transcrito, sem explicações ou formatação adicional. Se não conseguir entender, retorne apenas "Não consegui entender o áudio".',
      },
    ]);

    const transcription = result.response.text().trim();
    console.log('[CHATBOT] Transcrição:', transcription.substring(0, 100));

    return transcription || null;
  } catch (error: any) {
    console.error('[CHATBOT] Erro na transcrição:', error?.message);
    return null;
  }
}

// ==========================================
// FUNCTION CALLING - Definição das ferramentas
// ==========================================

const chatbotTools: FunctionDeclarationsTool[] = [{
  functionDeclarations: [
    {
      name: 'iniciar_agendamento',
      description: 'Inicia o processo de agendamento quando o cliente quer marcar/agendar um serviço. Use quando o cliente demonstrar intenção de agendar, marcar horário, fazer revisão, trocar óleo, etc. Exemplos: "quero agendar", "pode sim", "vamos marcar", "preciso trocar o óleo", "qual horário tem?", "posso ir amanhã?". IMPORTANTE: sempre extraia o serviço mencionado pelo cliente.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          servico: {
            type: SchemaType.STRING,
            description: 'O serviço que o cliente quer agendar (ex: troca de óleo, revisão, filtro, alinhamento). Extraia da mensagem do cliente.'
          }
        },
        required: []
      }
    },
    {
      name: 'selecionar_veiculo',
      description: 'Seleciona um veículo específico do cliente para o agendamento. Use quando o cliente indicar qual carro quer trazer.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          veiculoIndex: {
            type: SchemaType.NUMBER,
            description: 'Índice do veículo na lista (0 para primeiro, 1 para segundo, etc). Use -1 para todos os veículos.'
          }
        },
        required: ['veiculoIndex']
      }
    },
    {
      name: 'selecionar_horario',
      description: 'Seleciona um horário para o agendamento. Use quando o cliente escolher ou indicar preferência de dia/horário.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          horarioIndex: {
            type: SchemaType.NUMBER,
            description: 'Índice do horário na lista de horários disponíveis (0 para primeiro, 1 para segundo, etc)'
          },
          diaSemana: {
            type: SchemaType.STRING,
            description: 'Dia da semana mencionado pelo cliente (segunda, terça, quarta, quinta, sexta, sábado)'
          },
          periodo: {
            type: SchemaType.STRING,
            description: 'Período do dia (manhã ou tarde)'
          },
          hora: {
            type: SchemaType.NUMBER,
            description: 'Hora específica mencionada (8, 9, 10, 11, 14, 15, 16, 17)'
          }
        },
        required: []
      }
    },
    {
      name: 'confirmar_agendamento',
      description: 'Confirma e finaliza o agendamento. Use quando o cliente confirmar que quer prosseguir.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {},
        required: []
      }
    },
    {
      name: 'cancelar_agendamento',
      description: 'Cancela o processo de agendamento em andamento. Use quando o cliente desistir ou quiser cancelar.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {},
        required: []
      }
    },
    // ==========================================
    // FUNÇÕES DE CADASTRO DE CLIENTE/VEÍCULO
    // ==========================================
    {
      name: 'iniciar_cadastro',
      description: 'Inicia o cadastro de um cliente novo. Use APENAS quando o cliente não está cadastrado (CLIENTE NÃO CADASTRADO) e quer agendar um serviço. Não use para clientes já cadastrados.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {},
        required: []
      }
    },
    {
      name: 'salvar_nome_cliente',
      description: 'Salva o nome do cliente durante o cadastro. Use quando o cliente informar seu nome completo.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          nome: {
            type: SchemaType.STRING,
            description: 'Nome completo do cliente'
          }
        },
        required: ['nome']
      }
    },
    {
      name: 'salvar_dados_veiculo',
      description: 'Salva os dados do veículo durante o cadastro. Use quando o cliente informar dados do carro (placa, modelo, marca, ano, km). Pode salvar parcialmente.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          placa: {
            type: SchemaType.STRING,
            description: 'Placa do veículo (formato ABC1234 ou ABC1D23)'
          },
          marca: {
            type: SchemaType.STRING,
            description: 'Marca do veículo (Fiat, Volkswagen, Chevrolet, etc)'
          },
          modelo: {
            type: SchemaType.STRING,
            description: 'Modelo do veículo (Uno, Gol, Onix, etc)'
          },
          ano: {
            type: SchemaType.NUMBER,
            description: 'Ano do veículo'
          },
          kmAtual: {
            type: SchemaType.NUMBER,
            description: 'Quilometragem atual do veículo'
          }
        },
        required: []
      }
    },
    {
      name: 'confirmar_cadastro',
      description: 'Finaliza o cadastro e cria o cliente e veículo no sistema. Use quando todos os dados obrigatórios (nome, placa, marca, modelo) estiverem preenchidos e o cliente confirmar.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {},
        required: []
      }
    },
    {
      name: 'responder_texto',
      description: 'Envia uma resposta de texto normal para o cliente. Use para saudações, dúvidas gerais, informações sobre preços, horários de funcionamento, etc.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          mensagem: {
            type: SchemaType.STRING,
            description: 'A mensagem de texto para enviar ao cliente'
          }
        },
        required: ['mensagem']
      }
    },
    // ==========================================
    // FUNÇÕES INTELIGENTES
    // ==========================================
    {
      name: 'consultar_status_veiculo',
      description: 'Consulta o status do veículo/serviço do cliente. Use quando o cliente perguntar se o carro ficou pronto, qual o status, quando fica pronto, etc. Exemplos: "meu carro já ficou pronto?", "como está meu carro?", "já posso buscar?", "qual o status?"',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          veiculoIndex: {
            type: SchemaType.NUMBER,
            description: 'Índice do veículo na lista (opcional, se não especificado busca todos)'
          }
        },
        required: []
      }
    },
    {
      name: 'consultar_agendamentos',
      description: 'Lista os agendamentos futuros do cliente. Use quando o cliente perguntar sobre seus agendamentos, quando é a próxima marcação, etc.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {},
        required: []
      }
    },
    {
      name: 'cancelar_ou_remarcar',
      description: 'Inicia o processo de cancelamento ou remarcação de um agendamento. Use quando o cliente quiser cancelar, remarcar, reagendar, mudar horário, etc.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          acao: {
            type: SchemaType.STRING,
            description: 'A ação desejada: "cancelar" ou "remarcar"'
          }
        },
        required: ['acao']
      }
    },
    {
      name: 'consultar_preco',
      description: 'Consulta o preço de um serviço específico. Use quando o cliente perguntar quanto custa, qual o valor, preço de troca de óleo, filtro, etc.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          servico: {
            type: SchemaType.STRING,
            description: 'O serviço que o cliente quer saber o preço (óleo, filtro, fluido, revisão, etc)'
          }
        },
        required: []
      }
    },
    {
      name: 'agendar_multiplos_servicos',
      description: 'Agenda múltiplos serviços na mesma visita. Use quando o cliente quiser fazer mais de um serviço (ex: troca de óleo + filtro + alinhamento)',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          servicos: {
            type: SchemaType.ARRAY,
            description: 'Lista de serviços desejados',
            items: { type: SchemaType.STRING }
          }
        },
        required: ['servicos']
      }
    },
    {
      name: 'registrar_preferencia',
      description: 'Registra uma preferência ou informação do cliente para lembrar no futuro. Use quando o cliente mencionar preferências como: tipo de óleo preferido, horário preferido, dia preferido, etc.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          tipo: {
            type: SchemaType.STRING,
            description: 'Tipo da preferência: oleo, horario, dia, observacao'
          },
          valor: {
            type: SchemaType.STRING,
            description: 'O valor da preferência'
          }
        },
        required: ['tipo', 'valor']
      }
    },
    {
      name: 'consultar_historico',
      description: 'Consulta o histórico de serviços do cliente. Use quando o cliente perguntar sobre serviços anteriores, última troca, quando fez o último serviço, etc.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {},
        required: []
      }
    }
  ]
}];

// Timezone de Brasília (UTC-3)
const TIMEZONE = 'America/Sao_Paulo';

// Helper para criar data no fuso de Brasília
function createDateInBrazil(year: number, month: number, day: number, hour: number = 0, minute: number = 0): Date {
  // Cria a data local e ajusta para UTC considerando o offset de Brasília (-3h)
  const date = new Date(Date.UTC(year, month, day, hour + 3, minute, 0, 0));
  return date;
}

// Helper para obter "hoje" no horário de Brasília
function getTodayInBrazil(): Date {
  const now = new Date();
  // Converte para string no timezone de Brasília e extrai componentes
  const brazilStr = now.toLocaleString('en-US', { timeZone: TIMEZONE });
  return new Date(brazilStr);
}

// Formatar data para exibição em português
function formatDateBrazil(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    timeZone: TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Histórico de conversas por número (cache simples em memória)
const conversationHistory: Map<string, { role: string; parts: { text: string }[] }[]> = new Map();

// Estado de agendamento por número
interface AgendamentoState {
  ativo: boolean;
  veiculoId?: number;
  veiculoNome?: string;
  veiculoIds?: number[]; // Para múltiplos veículos
  veiculoNomes?: string[]; // Para múltiplos veículos
  dataHora?: Date;
  servico?: string;
  etapa: 'inicio' | 'escolher_veiculo' | 'escolher_data' | 'confirmar';
  horariosDisponiveis?: { data: Date; label: string }[];
  timestamp?: number; // Para timeout de estados antigos
}
const agendamentoState: Map<string, AgendamentoState> = new Map();

// Estado de cadastro por número (para clientes novos)
interface CadastroState {
  ativo: boolean;
  etapa: 'nome' | 'veiculo' | 'confirmar';
  nome?: string;
  placa?: string;
  marca?: string;
  modelo?: string;
  ano?: number;
  kmAtual?: number;
  timestamp?: number;
}
const cadastroState: Map<string, CadastroState> = new Map();

// Timeout de estado de agendamento (30 minutos)
const STATE_TIMEOUT_MS = 30 * 60 * 1000;

// Verificar se estado está expirado
function isStateExpired(state: AgendamentoState): boolean {
  if (!state.timestamp) return false;
  return Date.now() - state.timestamp > STATE_TIMEOUT_MS;
}

// Tipos de resposta do chatbot
export interface ChatResponseText {
  type: 'text';
  message: string;
}

export interface ChatResponseList {
  type: 'list';
  text: string;
  listButton: string;
  footerText?: string;
  choices: string[]; // formato: "[Seção]" ou "Título|id|descrição"
}

export interface ChatResponseButton {
  type: 'button';
  text: string;
  footerText?: string;
  choices: string[]; // formato: "Texto|id"
}

export type ChatResponse = ChatResponseText | ChatResponseList | ChatResponseButton;

// Interface para dados do cliente
interface CustomerData {
  id: number;
  nome: string;
  veiculos: {
    id: number;
    marca: string;
    modelo: string;
    ano: number | null;
    placa: string;
    kmAtual: number | null;
  }[];
  ultimoServico?: {
    data: Date;
    tipo: string;
    km: number | null;
  };
  historicoServicos: string[];
  isNewCustomer: boolean;
  preferencias?: {
    oleo?: string;
    horario?: string;
    dia?: string;
    observacoes?: string;
  };
  ordensEmAndamento?: {
    id: number;
    numero: string;
    status: string;
    veiculo: string;
    servicos: string;
    dataAgendada?: Date;
  }[];
  agendamentosFuturos?: {
    id: number;
    dataAgendada: Date;
    veiculo: string;
    servicos: string;
  }[];
}

// Interface para serviços
interface ServicoData {
  id: number;
  nome: string;
  categoria: string;
  preco: number;
}

// Buscar serviços ativos do banco
async function getServicos(empresaId: number): Promise<ServicoData[]> {
  try {
    const servicos = await prisma.servico.findMany({
      where: { ativo: true, empresaId },
      orderBy: { categoria: 'asc' },
    });

    return servicos.map(s => ({
      id: s.id,
      nome: s.nome,
      categoria: s.categoria,
      preco: Number(s.precoBase),
    }));
  } catch (error: any) {
    console.error('[CHATBOT] Erro ao buscar serviços:', error?.message);
    return [];
  }
}

// Formatar serviços para o prompt
function formatServicosParaPrompt(servicos: ServicoData[]): string {
  if (servicos.length === 0) {
    return 'troca de óleo, filtros, fluidos';
  }

  const porCategoria: Record<string, ServicoData[]> = {};
  for (const s of servicos) {
    if (!porCategoria[s.categoria]) {
      porCategoria[s.categoria] = [];
    }
    porCategoria[s.categoria].push(s);
  }

  const linhas: string[] = [];
  for (const [categoria, items] of Object.entries(porCategoria)) {
    const categoriaFormatada = categoria.replace(/_/g, ' ').toLowerCase();
    const servicosLista = items.map(s =>
      `  - ${s.nome}: R$ ${s.preco.toFixed(2).replace('.', ',')}`
    ).join('\n');
    linhas.push(`${categoriaFormatada}:\n${servicosLista}`);
  }

  return linhas.join('\n');
}

// Buscar histórico recente de mensagens do banco
async function getRecentMessages(phoneNumber: string, empresaId: number): Promise<{ role: 'user' | 'bot'; text: string }[]> {
  try {
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    const conversa = await prisma.conversa.findFirst({
      where: {
        empresaId,
        OR: [
          { telefone: { contains: cleanPhone.slice(-11) } },
          { telefone: { contains: cleanPhone } },
          { telefone: cleanPhone },
        ],
      },
      include: {
        mensagens: {
          orderBy: { dataEnvio: 'desc' },
          take: 10, // Últimas 10 mensagens para contexto
        },
      },
    });

    if (!conversa?.mensagens) return [];

    // Retornar mensagens em ordem cronológica (mais antiga primeiro)
    return conversa.mensagens
      .reverse()
      .map(m => ({
        role: m.enviada ? 'bot' as const : 'user' as const,
        text: m.conteudo,
      }));
  } catch (error: any) {
    console.error('[CHATBOT] Erro ao buscar histórico:', error?.message);
    return [];
  }
}

// Buscar dados do cliente pelo telefone
async function getCustomerData(phoneNumber: string, empresaId: number): Promise<CustomerData | null> {
  try {
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    const cliente = await prisma.cliente.findFirst({
      where: {
        empresaId,
        OR: [
          { telefone: { contains: cleanPhone.slice(-11) } },
          { telefone: { contains: cleanPhone.slice(-10) } },
          { telefone: cleanPhone },
        ],
      },
      include: {
        veiculos: {
          include: {
            ordens: {
              orderBy: { createdAt: 'desc' },
              take: 10,
              include: {
                itens: {
                  include: { servico: true },
                },
              },
            },
          },
        },
      },
    });

    if (!cliente) {
      return null;
    }

    const veiculoPrincipal = cliente.veiculos[0];
    const ultimaOrdem = veiculoPrincipal?.ordens[0];

    const historicoServicos: string[] = [];
    const ordensEmAndamento: CustomerData['ordensEmAndamento'] = [];
    const agendamentosFuturos: CustomerData['agendamentosFuturos'] = [];
    const agora = new Date();

    // Processar todas as ordens de todos os veículos
    for (const veiculo of cliente.veiculos) {
      for (const ordem of veiculo.ordens) {
        const servicosNomes = ordem.itens.map(i => i.servico.nome).join(', ');
        const data = ordem.createdAt.toLocaleDateString('pt-BR');
        const veiculoNome = `${veiculo.marca} ${veiculo.modelo}`;

        // Ordens em andamento (não finalizadas)
        if (['AGENDADO', 'EM_ANDAMENTO', 'AGUARDANDO_PECAS'].includes(ordem.status)) {
          ordensEmAndamento.push({
            id: ordem.id,
            numero: ordem.id.toString(),
            status: ordem.status,
            veiculo: veiculoNome,
            servicos: servicosNomes || 'Serviço',
            dataAgendada: ordem.dataAgendada || undefined,
          });
        }

        // Agendamentos futuros
        if (ordem.status === 'AGENDADO' && ordem.dataAgendada && ordem.dataAgendada > agora) {
          agendamentosFuturos.push({
            id: ordem.id,
            dataAgendada: ordem.dataAgendada,
            veiculo: veiculoNome,
            servicos: servicosNomes || 'Serviço',
          });
        }

        // Histórico (últimos 5 serviços)
        if (historicoServicos.length < 5 && ordem.status === 'CONCLUIDO') {
          historicoServicos.push(`${data}: ${veiculoNome} - ${servicosNomes}`);
        }
      }
    }

    // Ordenar agendamentos por data
    agendamentosFuturos.sort((a, b) => a.dataAgendada.getTime() - b.dataAgendada.getTime());

    // Extrair preferências das observações do cliente
    let preferencias: CustomerData['preferencias'];
    if (cliente.observacoes) {
      try {
        // Formato JSON nas observações
        if (cliente.observacoes.startsWith('{')) {
          preferencias = JSON.parse(cliente.observacoes);
        } else {
          // Extrair preferências do texto livre
          preferencias = { observacoes: cliente.observacoes };
          const obs = cliente.observacoes.toLowerCase();
          if (obs.includes('sintético') || obs.includes('sintetico')) preferencias.oleo = 'sintético';
          if (obs.includes('semi-sintético') || obs.includes('semi sintetico')) preferencias.oleo = 'semi-sintético';
          if (obs.includes('mineral')) preferencias.oleo = 'mineral';
          if (obs.includes('manhã') || obs.includes('manha')) preferencias.horario = 'manhã';
          if (obs.includes('tarde')) preferencias.horario = 'tarde';
        }
      } catch {
        preferencias = { observacoes: cliente.observacoes };
      }
    }

    return {
      id: cliente.id,
      nome: cliente.nome,
      veiculos: cliente.veiculos.map(v => ({
        id: v.id,
        marca: v.marca,
        modelo: v.modelo,
        ano: v.ano,
        placa: v.placa,
        kmAtual: v.kmAtual,
      })),
      ultimoServico: ultimaOrdem ? {
        data: ultimaOrdem.createdAt,
        tipo: ultimaOrdem.itens.map(i => i.servico.nome).join(', ') || 'Serviço',
        km: ultimaOrdem.kmEntrada,
      } : undefined,
      historicoServicos,
      isNewCustomer: false,
      preferencias,
      ordensEmAndamento: ordensEmAndamento.length > 0 ? ordensEmAndamento : undefined,
      agendamentosFuturos: agendamentosFuturos.length > 0 ? agendamentosFuturos : undefined,
    };
  } catch (error: any) {
    console.error('[CHATBOT] Erro ao buscar dados do cliente:', error?.message);
    return null;
  }
}

// Converter JSON de horário para string legível
function parseHorarioParaString(horarioJson: string | null): string {
  if (!horarioJson) return 'Segunda a Sexta 8h-18h, Sábado 8h-12h';

  try {
    if (!horarioJson.startsWith('{')) {
      return horarioJson;
    }

    const horario = JSON.parse(horarioJson);
    const DIAS = [
      { key: 'seg', label: 'Segunda' },
      { key: 'ter', label: 'Terça' },
      { key: 'qua', label: 'Quarta' },
      { key: 'qui', label: 'Quinta' },
      { key: 'sex', label: 'Sexta' },
      { key: 'sab', label: 'Sábado' },
      { key: 'dom', label: 'Domingo' },
    ];

    const grupos: { dias: string[]; abertura: string; fechamento: string }[] = [];

    for (const dia of DIAS) {
      const h = horario[dia.key];
      if (!h?.ativo) continue;

      const ultimoGrupo = grupos[grupos.length - 1];
      if (ultimoGrupo && ultimoGrupo.abertura === h.abertura && ultimoGrupo.fechamento === h.fechamento) {
        ultimoGrupo.dias.push(dia.label);
      } else {
        grupos.push({ dias: [dia.label], abertura: h.abertura, fechamento: h.fechamento });
      }
    }

    if (grupos.length === 0) return 'Horário não definido';

    return grupos.map(g => {
      const diasStr = g.dias.length > 2
        ? `${g.dias[0]} a ${g.dias[g.dias.length - 1]}`
        : g.dias.join(' e ');
      return `${diasStr} ${g.abertura.replace(':', 'h')}-${g.fechamento.replace(':', 'h')}`;
    }).join(', ');
  } catch {
    return horarioJson || 'Segunda a Sexta 8h-18h, Sábado 8h-12h';
  }
}

// Buscar horários disponíveis nos próximos dias
async function getHorariosDisponiveis(empresaId: number): Promise<{ data: Date; label: string }[]> {
  try {
    const config = await prisma.configuracao.findUnique({ where: { empresaId } });
    const horarioConfig = config?.chatbotHorario;

    // Buscar duração do serviço de troca de óleo (padrão: 60 minutos)
    const servicoTrocaOleo = await prisma.servico.findFirst({
      where: {
        empresaId,
        OR: [
          { categoria: 'TROCA_OLEO' },
          { nome: { contains: 'Troca de Óleo', mode: 'insensitive' } },
        ],
        ativo: true,
      },
      select: { duracaoMin: true },
    });
    const duracaoServico = servicoTrocaOleo?.duracaoMin || 60; // minutos

    // Parse do horário de funcionamento
    let horariosPorDia: Record<number, { abertura: number; fechamento: number }> = {
      1: { abertura: 8, fechamento: 18 }, // Segunda
      2: { abertura: 8, fechamento: 18 }, // Terça
      3: { abertura: 8, fechamento: 18 }, // Quarta
      4: { abertura: 8, fechamento: 18 }, // Quinta
      5: { abertura: 8, fechamento: 18 }, // Sexta
      6: { abertura: 8, fechamento: 12 }, // Sábado
    };

    if (horarioConfig && horarioConfig.startsWith('{')) {
      try {
        const h = JSON.parse(horarioConfig);
        const diasMap: Record<string, number> = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, dom: 0 };
        for (const [dia, num] of Object.entries(diasMap)) {
          if (h[dia]?.ativo) {
            horariosPorDia[num] = {
              abertura: parseInt(h[dia].abertura.split(':')[0]),
              fechamento: parseInt(h[dia].fechamento.split(':')[0]),
            };
          } else {
            delete horariosPorDia[num];
          }
        }
      } catch {}
    }

    // Buscar agendamentos existentes nos próximos 7 dias com duração dos serviços
    const hoje = getTodayInBrazil();
    const fim = new Date(hoje);
    fim.setDate(fim.getDate() + 7);

    const agendamentosExistentes = await prisma.ordemServico.findMany({
      where: {
        empresaId,
        dataAgendada: { gte: hoje, lte: fim },
        status: { in: ['AGENDADO', 'EM_ANDAMENTO'] },
      },
      include: {
        itens: {
          include: {
            servico: true,
          },
        },
      },
    });

    // Criar lista de períodos ocupados (início e fim de cada agendamento)
    const periodosOcupados: { inicio: Date; fim: Date }[] = [];
    for (const ag of agendamentosExistentes) {
      if (!ag.dataAgendada) continue;

      // Calcular duração total dos serviços da O.S. (ou usar padrão de 60min)
      const duracaoTotal = ag.itens.reduce((acc: number, item) => acc + (item.servico.duracaoMin || 60), 0) || 60;

      const inicio = new Date(ag.dataAgendada);
      const fim = new Date(inicio.getTime() + duracaoTotal * 60 * 1000);

      periodosOcupados.push({ inicio, fim });
    }

    // Função para verificar se um slot está disponível
    const slotDisponivel = (slotInicio: Date): boolean => {
      const slotFim = new Date(slotInicio.getTime() + duracaoServico * 60 * 1000);

      for (const periodo of periodosOcupados) {
        // Verifica se há sobreposição
        if (slotInicio < periodo.fim && slotFim > periodo.inicio) {
          return false;
        }
      }
      return true;
    };

    // Gerar slots disponíveis
    const slots: { data: Date; label: string }[] = [];
    const diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

    for (let d = 1; d <= 7 && slots.length < 8; d++) {
      const data = new Date(hoje);
      data.setDate(data.getDate() + d);
      const diaSemana = data.getDay();

      const horario = horariosPorDia[diaSemana];
      if (!horario) continue;

      // Gerar slots de hora em hora
      for (let hora = horario.abertura; hora < horario.fechamento && slots.length < 8; hora++) {
        // Criar data com timezone correto (UTC, já que Brasília = UTC-3 e adicionamos 3h)
        const slot = createDateInBrazil(
          data.getFullYear(),
          data.getMonth(),
          data.getDate(),
          hora,
          0
        );

        if (slotDisponivel(slot)) {
          const diaNome = diasSemana[diaSemana];
          const periodo = hora < 12 ? 'manhã' : 'tarde';
          slots.push({
            data: slot,
            label: `${diaNome} às ${hora}h (${periodo})`,
          });
        }
      }
    }

    return slots;
  } catch (error: any) {
    console.error('[CHATBOT] Erro ao buscar horários:', error?.message);
    return [];
  }
}

// Criar cliente e veículo automaticamente (para cadastro via chatbot)
async function criarClienteEVeiculo(
  empresaId: number,
  telefone: string,
  nome: string,
  placa: string,
  marca: string,
  modelo: string,
  ano?: number,
  kmAtual?: number
): Promise<{ success: boolean; clienteId?: number; veiculoId?: number; error?: string }> {
  try {
    // Limpar telefone
    const telefoneLimpo = telefone.replace(/\D/g, '');

    // Verificar se já existe cliente com esse telefone
    const clienteExistente = await prisma.cliente.findFirst({
      where: {
        empresaId,
        OR: [
          { telefone: { contains: telefoneLimpo.slice(-11) } },
          { telefone: { contains: telefoneLimpo.slice(-10) } },
          { telefone: telefoneLimpo },
        ],
      },
    });

    if (clienteExistente) {
      // Cliente já existe, só criar o veículo
      const veiculo = await prisma.veiculo.create({
        data: {
          empresaId,
          clienteId: clienteExistente.id,
          placa: placa.toUpperCase().replace(/[^A-Z0-9]/g, ''),
          marca,
          modelo,
          ano,
          kmAtual,
        },
      });

      console.log('[CHATBOT] Veículo criado para cliente existente:', veiculo.id);
      return { success: true, clienteId: clienteExistente.id, veiculoId: veiculo.id };
    }

    // Criar cliente e veículo
    const cliente = await prisma.cliente.create({
      data: {
        empresaId,
        nome,
        telefone: telefoneLimpo,
        veiculos: {
          create: {
            empresaId,
            placa: placa.toUpperCase().replace(/[^A-Z0-9]/g, ''),
            marca,
            modelo,
            ano,
            kmAtual,
          },
        },
      },
      include: { veiculos: true },
    });

    console.log('[CHATBOT] Cliente e veículo criados:', cliente.id, cliente.veiculos[0]?.id);
    return { success: true, clienteId: cliente.id, veiculoId: cliente.veiculos[0]?.id };
  } catch (error: any) {
    console.error('[CHATBOT] Erro ao criar cliente/veículo:', error?.message);

    // Verificar se é erro de placa duplicada
    if (error?.code === 'P2002') {
      return { success: false, error: 'Placa já cadastrada' };
    }

    return { success: false, error: error?.message };
  }
}

// Salvar preferência do cliente
async function salvarPreferenciaCliente(
  clienteId: number,
  tipo: string,
  valor: string
): Promise<boolean> {
  try {
    // Buscar observações atuais
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { observacoes: true },
    });

    let preferencias: Record<string, string> = {};

    // Tentar parsear JSON existente
    if (cliente?.observacoes) {
      try {
        if (cliente.observacoes.startsWith('{')) {
          preferencias = JSON.parse(cliente.observacoes);
        } else {
          preferencias = { observacoes: cliente.observacoes };
        }
      } catch {
        preferencias = { observacoes: cliente.observacoes };
      }
    }

    // Adicionar nova preferência
    preferencias[tipo] = valor;

    // Salvar
    await prisma.cliente.update({
      where: { id: clienteId },
      data: { observacoes: JSON.stringify(preferencias) },
    });

    console.log('[CHATBOT] Preferência salva:', tipo, '=', valor);
    return true;
  } catch (error: any) {
    console.error('[CHATBOT] Erro ao salvar preferência:', error?.message);
    return false;
  }
}

// Atualizar status de ordem de serviço (para cancelamento)
async function cancelarOrdemServico(ordemId: number): Promise<boolean> {
  try {
    await prisma.ordemServico.update({
      where: { id: ordemId },
      data: { status: 'CANCELADO' },
    });
    console.log('[CHATBOT] Ordem cancelada:', ordemId);
    return true;
  } catch (error: any) {
    console.error('[CHATBOT] Erro ao cancelar ordem:', error?.message);
    return false;
  }
}

// Remarcar ordem de serviço
async function remarcarOrdemServico(ordemId: number, novaData: Date): Promise<boolean> {
  try {
    await prisma.ordemServico.update({
      where: { id: ordemId },
      data: { dataAgendada: novaData },
    });
    console.log('[CHATBOT] Ordem remarcada:', ordemId, 'para', novaData);
    return true;
  } catch (error: any) {
    console.error('[CHATBOT] Erro ao remarcar ordem:', error?.message);
    return false;
  }
}

// Criar ordem de serviço automaticamente
async function criarOrdemServico(
  veiculoId: number,
  dataAgendada: Date,
  empresaId: number,
  servico: string = 'Troca de Óleo'
): Promise<{ success: boolean; numero?: string; error?: string }> {
  try {
    // Buscar veículo com cliente
    const veiculo = await prisma.veiculo.findUnique({
      where: { id: veiculoId },
      include: { cliente: true },
    });

    if (!veiculo) {
      return { success: false, error: 'Veículo não encontrado' };
    }

    // Buscar serviço de troca de óleo
    const servicoTrocaOleo = await prisma.servico.findFirst({
      where: {
        empresaId,
        OR: [
          { categoria: 'TROCA_OLEO' },
          { nome: { contains: 'Troca de Óleo' } },
        ],
        ativo: true,
      },
    });

    if (!servicoTrocaOleo) {
      return { success: false, error: 'Serviço não encontrado' };
    }

    // Criar ordem de serviço
    const ordem = await prisma.ordemServico.create({
      data: {
        empresaId,
        veiculoId: veiculo.id,
        status: 'AGENDADO',
        dataAgendada,
        kmEntrada: veiculo.kmAtual,
        observacoes: `Agendamento automático via WhatsApp - ${servico}`,
        itens: {
          create: {
            servicoId: servicoTrocaOleo.id,
            quantidade: 1,
            precoUnitario: servicoTrocaOleo.precoBase,
            subtotal: servicoTrocaOleo.precoBase,
          },
        },
      },
    });

    console.log('[CHATBOT] Ordem criada:', ordem.id);
    return { success: true, numero: ordem.id.toString() };
  } catch (error: any) {
    console.error('[CHATBOT] Erro ao criar ordem:', error?.message);
    return { success: false, error: error?.message };
  }
}



export async function generateChatResponse(
  userMessage: string,
  phoneNumber: string,
  empresaId: number,
  userName?: string
): Promise<ChatResponse> {
  try {
    const config = await prisma.configuracao.findUnique({
      where: { empresaId },
    });

    if (config && config.chatbotEnabled === false) {
      console.log('[CHATBOT] Chatbot desabilitado');
      return { type: 'text', message: '' };
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('[CHATBOT] GEMINI_API_KEY não configurada');
      return { type: 'text', message: 'Desculpe, estou com problemas técnicos. Por favor, ligue para a oficina.' };
    }

    const customerData = await getCustomerData(phoneNumber, empresaId);
    const servicos = await getServicos(empresaId);
    const servicosFormatados = formatServicosParaPrompt(servicos);

    // Gerenciar estado de agendamento
    let agendamento = agendamentoState.get(phoneNumber) || { ativo: false, etapa: 'inicio' as const };
    let cadastro = cadastroState.get(phoneNumber) || { ativo: false, etapa: 'nome' as const };
    const msgLower = userMessage.toLowerCase().trim();

    // Verificar se o estado expirou (30 min)
    if (agendamento.ativo && isStateExpired(agendamento)) {
      console.log('[CHATBOT] Estado de agendamento expirado, resetando');
      agendamentoState.delete(phoneNumber);
      agendamento = { ativo: false, etapa: 'inicio' as const };
    }

    // Verificar se estado de cadastro expirou
    if (cadastro.ativo && cadastro.timestamp && Date.now() - cadastro.timestamp > STATE_TIMEOUT_MS) {
      console.log('[CHATBOT] Estado de cadastro expirado, resetando');
      cadastroState.delete(phoneNumber);
      cadastro = { ativo: false, etapa: 'nome' as const };
    }

    // Tratar áudio não transcrito
    if (userMessage === '[AUDIO_NAO_TRANSCRITO]' || userMessage === '[AUDIO_SEM_URL]') {
      const primeiroNome = customerData?.nome.split(' ')[0] || (userName ? userName.split(' ')[0] : 'Cliente');
      return {
        type: 'text',
        message: `Oi ${primeiroNome}! Recebi seu áudio mas não consegui entender. 😅\n\nPode digitar ou enviar outro áudio mais claro?`,
      };
    }

    // Detectar cancelamento por texto
    const querCancelar = /^(cancelar?|n[aã]o|desist[io]|deixa|esquece|para|parar|sair|voltar)$/i.test(msgLower) ||
                         /cancel|desist|n[aã]o\s*quero|mudei\s*de\s*ideia|outro\s*dia/i.test(msgLower);

    if (agendamento.ativo && querCancelar) {
      agendamentoState.delete(phoneNumber);
      console.log('[CHATBOT] Agendamento cancelado pelo usuário');
      return {
        type: 'text',
        message: `Tudo bem! Cancelei o agendamento. 😊\n\nQuando quiser marcar, é só me chamar aqui!`,
      };
    }

    // Cancelamento de cadastro
    if (cadastro.ativo && querCancelar) {
      cadastroState.delete(phoneNumber);
      console.log('[CHATBOT] Cadastro cancelado pelo usuário');
      return {
        type: 'text',
        message: `Tudo bem! Cancelei o cadastro. 😊\n\nQuando quiser se cadastrar, é só me chamar!`,
      };
    }

    // Detectar se é resposta de botão/lista (buttonOrListid)
    const isButtonResponse = /^(veiculo_|horario_|confirmar_|cancelar|remarcar_)/.test(userMessage);

    // Processar resposta de seleção de veículo via botão
    if (isButtonResponse && userMessage.startsWith('veiculo_')) {
      if (customerData) {
        const primeiroNome = customerData.nome.split(' ')[0];

        // Opção "Todos os veículos"
        if (userMessage === 'veiculo_todos') {
          agendamento.veiculoIds = customerData.veiculos.map(v => v.id);
          agendamento.veiculoNomes = customerData.veiculos.map(v => `${v.marca} ${v.modelo}`);
          agendamento.veiculoNome = `${customerData.veiculos.length} veículos`;
          agendamento.etapa = 'escolher_data';
          agendamento.horariosDisponiveis = await getHorariosDisponiveis(empresaId);
          agendamentoState.set(phoneNumber, agendamento);
          console.log('[CHATBOT] Todos os veículos selecionados:', agendamento.veiculoNomes);

          if (agendamento.horariosDisponiveis.length > 0) {
            const listaVeiculos = agendamento.veiculoNomes.map(n => `• ${n}`).join('\n');
            const choices = [
              '[Horários Disponíveis]',
              ...agendamento.horariosDisponiveis.map(slot => {
                const diaNome = slot.label.split(' ')[0];
                const horaInfo = slot.label.replace(diaNome + ' ', '');
                return `${diaNome}|horario_${slot.data.toISOString()}|${horaInfo}`;
              }),
            ];

            return {
              type: 'list',
              text: `Ótimo, ${primeiroNome}! 🚗\n\nVou agendar ${agendamento.servico || 'o serviço'} dos seus veículos:\n${listaVeiculos}\n\nQual horário fica bom pra você?`,
              listButton: 'Ver Horários',
              footerText: 'Escolha o melhor horário',
              choices,
            };
          }
        }

        // Veículo específico
        const veiculoId = parseInt(userMessage.replace('veiculo_', ''));
        const veiculo = customerData.veiculos.find(v => v.id === veiculoId);
        if (veiculo) {
          agendamento.veiculoId = veiculo.id;
          agendamento.veiculoNome = `${veiculo.marca} ${veiculo.modelo}`;
          agendamento.etapa = 'escolher_data';
          agendamento.horariosDisponiveis = await getHorariosDisponiveis(empresaId);
          agendamentoState.set(phoneNumber, agendamento);
          console.log('[CHATBOT] Veículo selecionado via botão:', agendamento.veiculoNome);

          // Retornar lista de horários
          if (agendamento.horariosDisponiveis.length > 0) {
            const choices = [
              '[Horários Disponíveis]',
              ...agendamento.horariosDisponiveis.map(slot => {
                const diaNome = slot.label.split(' ')[0];
                const horaInfo = slot.label.replace(diaNome + ' ', '');
                return `${diaNome}|horario_${slot.data.toISOString()}|${horaInfo}`;
              }),
            ];

            return {
              type: 'list',
              text: `Ótimo, ${primeiroNome}! 🚗\n\nVou agendar ${agendamento.servico || 'o serviço'} do seu ${agendamento.veiculoNome}.\n\nQual horário fica bom pra você?`,
              listButton: 'Ver Horários',
              footerText: 'Escolha o melhor horário',
              choices,
            };
          }
        }
      }
    }

    // Processar resposta de seleção de horário via botão
    if (isButtonResponse && userMessage.startsWith('horario_')) {
      const dataISO = userMessage.replace('horario_', '');
      const dataEscolhida = new Date(dataISO);

      if (!isNaN(dataEscolhida.getTime())) {
        agendamento.dataHora = dataEscolhida;
        agendamento.etapa = 'confirmar';
        agendamentoState.set(phoneNumber, agendamento);

        const dataFormatada = formatDateBrazil(dataEscolhida);

        const primeiroNome = customerData?.nome.split(' ')[0] || 'Cliente';

        // Múltiplos veículos
        if (agendamento.veiculoIds && agendamento.veiculoIds.length > 1) {
          const listaVeiculos = agendamento.veiculoNomes?.map(n => `• ${n}`).join('\n') || '';
          return {
            type: 'button',
            text: `Perfeito, ${primeiroNome}! 📋\n\n*Confirme seu agendamento:*\n\n🚗 Veículos:\n${listaVeiculos}\n📅 Data: ${dataFormatada}\n🔧 Serviço: ${agendamento.servico || 'Serviço agendado'}`,
            footerText: 'Confirma o agendamento?',
            choices: ['✅ Confirmar|confirmar_sim', '❌ Cancelar|cancelar'],
          };
        }

        // Veículo único
        return {
          type: 'button',
          text: `Perfeito, ${primeiroNome}! 📋\n\n*Confirme seu agendamento:*\n\n🚗 Veículo: ${agendamento.veiculoNome}\n📅 Data: ${dataFormatada}\n🔧 Serviço: ${agendamento.servico || 'Serviço agendado'}`,
          footerText: 'Confirma o agendamento?',
          choices: ['✅ Confirmar|confirmar_sim', '❌ Cancelar|cancelar'],
        };
      }
    }

    // Processar confirmação via botão
    if (isButtonResponse && userMessage === 'confirmar_sim') {
      const primeiroNome = customerData?.nome.split(' ')[0] || 'Cliente';
      const dataFormatada = agendamento.dataHora ? formatDateBrazil(agendamento.dataHora) : '';

      // Múltiplos veículos
      if (agendamento.veiculoIds && agendamento.veiculoIds.length > 0 && agendamento.dataHora) {
        const resultados: { success: boolean; veiculo: string; numero?: string }[] = [];

        for (let i = 0; i < agendamento.veiculoIds.length; i++) {
          const veiculoId = agendamento.veiculoIds[i];
          const veiculoNome = agendamento.veiculoNomes?.[i] || 'Veículo';
          const resultado = await criarOrdemServico(veiculoId, agendamento.dataHora, empresaId, agendamento.servico || 'Serviço agendado');
          resultados.push({ success: resultado.success, veiculo: veiculoNome, numero: resultado.numero });
        }

        agendamentoState.delete(phoneNumber);

        const sucessos = resultados.filter(r => r.success);
        if (sucessos.length === resultados.length) {
          const listaVeiculos = agendamento.veiculoNomes?.map(n => `• ${n}`).join('\n') || '';
          console.log('[CHATBOT] Agendamentos criados:', sucessos.length);
          return {
            type: 'text',
            message: `Pronto, ${primeiroNome}! ✅\n\nSeus veículos estão agendados para ${dataFormatada}:\n${listaVeiculos}\n\nTe esperamos! Qualquer coisa é só chamar aqui. 😊`,
          };
        } else {
          return {
            type: 'text',
            message: `Ops, consegui agendar ${sucessos.length} de ${resultados.length} veículos. 😅\n\nPode ligar pra oficina que a gente resolve o resto!`,
          };
        }
      }

      // Veículo único
      if (agendamento.veiculoId && agendamento.dataHora) {
        const resultado = await criarOrdemServico(
          agendamento.veiculoId,
          agendamento.dataHora,
          empresaId,
          agendamento.servico || 'Serviço agendado'
        );

        agendamentoState.delete(phoneNumber);

        if (resultado.success) {
          console.log('[CHATBOT] Agendamento criado! O.S.:', resultado.numero);
          return {
            type: 'text',
            message: `Pronto, ${primeiroNome}! ✅\n\nSeu ${agendamento.veiculoNome} está agendado para ${dataFormatada}.\n\nTe esperamos! Qualquer coisa é só chamar aqui. 😊`,
          };
        } else {
          console.error('[CHATBOT] Erro ao criar agendamento:', resultado.error);
          return {
            type: 'text',
            message: `Ops, tive um probleminha pra criar o agendamento. 😅\n\nPode ligar pra oficina que a gente resolve rapidinho!`,
          };
        }
      }
    }

    // Processar cancelamento via botão
    if (isButtonResponse && userMessage === 'cancelar') {
      agendamentoState.delete(phoneNumber);
      return {
        type: 'text',
        message: `Tudo bem! Cancelei o agendamento. 😊\n\nQuando quiser marcar, é só me chamar aqui!`,
      };
    }

    // Processar confirmação de cadastro via botão
    if (isButtonResponse && userMessage === 'confirmar_cadastro') {
      // Verificar se tem cadastro em andamento com dados completos
      if (cadastro.ativo && cadastro.nome && cadastro.placa && cadastro.marca && cadastro.modelo) {
        // Criar cliente e veículo
        const resultado = await criarClienteEVeiculo(
          empresaId,
          phoneNumber,
          cadastro.nome,
          cadastro.placa,
          cadastro.marca,
          cadastro.modelo,
          cadastro.ano,
          cadastro.kmAtual
        );

        if (!resultado.success) {
          console.error('[CHATBOT] Erro ao criar cadastro via botão:', resultado.error);

          if (resultado.error === 'Placa já cadastrada') {
            return {
              type: 'text',
              message: `Ops! Essa placa já está cadastrada aqui. 😅\n\nSe for seu carro, pode ser que você já tenha cadastro com outro telefone. Liga pra oficina que a gente resolve!`,
            };
          }

          return {
            type: 'text',
            message: `Ops, tive um probleminha pra criar o cadastro. 😅\n\nPode ligar pra oficina que a gente resolve rapidinho!`,
          };
        }

        // Limpar estado de cadastro
        const primeiroNomeCadastro = cadastro.nome.split(' ')[0];
        cadastroState.delete(phoneNumber);

        console.log('[CHATBOT] Cadastro criado via botão! Cliente:', resultado.clienteId, 'Veículo:', resultado.veiculoId);

        // Buscar dados atualizados do cliente para iniciar agendamento
        const novoCustomerData = await getCustomerData(phoneNumber, empresaId);

        if (novoCustomerData && novoCustomerData.veiculos.length > 0) {
          // IMPORTANTE: Encontrar o veículo que ACABOU de ser cadastrado (pelo ID ou placa)
          let veiculoRecemCadastrado = novoCustomerData.veiculos.find(v => v.id === resultado.veiculoId);

          // Fallback: buscar pela placa que foi cadastrada
          if (!veiculoRecemCadastrado && cadastro.placa) {
            veiculoRecemCadastrado = novoCustomerData.veiculos.find(v =>
              v.placa.toUpperCase().replace(/[^A-Z0-9]/g, '') === cadastro.placa?.toUpperCase().replace(/[^A-Z0-9]/g, '')
            );
          }

          // Se ainda não encontrou, usar o mais recente (último da lista)
          if (!veiculoRecemCadastrado) {
            veiculoRecemCadastrado = novoCustomerData.veiculos[novoCustomerData.veiculos.length - 1];
          }

          // Iniciar agendamento automaticamente COM O VEÍCULO CORRETO
          agendamento.ativo = true;
          agendamento.timestamp = Date.now();
          agendamento.veiculoId = veiculoRecemCadastrado.id;
          agendamento.veiculoNome = `${veiculoRecemCadastrado.marca} ${veiculoRecemCadastrado.modelo}`;
          agendamento.etapa = 'escolher_data';
          agendamento.horariosDisponiveis = await getHorariosDisponiveis(empresaId);
          agendamentoState.set(phoneNumber, agendamento);

          console.log('[CHATBOT] Veículo selecionado para agendamento (botão):', agendamento.veiculoNome, agendamento.veiculoId);

          if (agendamento.horariosDisponiveis.length > 0) {
            const choices = [
              '[Horários Disponíveis]',
              ...agendamento.horariosDisponiveis.map(slot => {
                const diaNome = slot.label.split(' ')[0];
                const horaInfo = slot.label.replace(diaNome + ' ', '');
                return `${diaNome}|horario_${slot.data.toISOString()}|${horaInfo}`;
              }),
            ];

            return {
              type: 'list',
              text: `Pronto, ${primeiroNomeCadastro}! ✅ Cadastro feito!\n\nAgora vamos agendar ${agendamento.servico || 'o serviço'} do seu ${agendamento.veiculoNome}?\n\nEscolha um horário:`,
              listButton: 'Ver Horários',
              footerText: 'Escolha o melhor horário',
              choices,
            };
          }
        }

        return {
          type: 'text',
          message: `Pronto, ${primeiroNomeCadastro}! ✅ Seu cadastro foi criado com sucesso!\n\nAgora você pode agendar quando quiser. É só me chamar aqui! 😊`,
        };
      }
    }

    // Processar cancelamento de cadastro via botão
    if (isButtonResponse && userMessage === 'cancelar_cadastro') {
      cadastroState.delete(phoneNumber);
      return {
        type: 'text',
        message: `Tudo bem! Cancelei o cadastro. 😊\n\nQuando quiser se cadastrar, é só me chamar!`,
      };
    }

    // Processar remarcação via botão
    if (isButtonResponse && userMessage.startsWith('remarcar_')) {
      const primeiroNome = customerData?.nome.split(' ')[0] || (userName ? userName.split(' ')[0] : 'Cliente');

      // Verificar se é novo horário ou ID de agendamento
      if (userMessage.includes('T')) {
        // É uma data ISO - remarcar para esse horário
        const dataISO = userMessage.replace('remarcar_', '');
        const novaData = new Date(dataISO);

        if (!isNaN(novaData.getTime()) && (agendamento as any).ordemIdRemarcar) {
          const ordemId = (agendamento as any).ordemIdRemarcar;
          const sucesso = await remarcarOrdemServico(ordemId, novaData);
          agendamentoState.delete(phoneNumber);

          if (sucesso) {
            return {
              type: 'text',
              message: `Pronto, ${primeiroNome}! ✅\n\nRemarcado para ${formatDateBrazil(novaData)}.\n\nTe esperamos! 😊`,
            };
          }
          return {
            type: 'text',
            message: `Ops, tive um probleminha pra remarcar. 😅\n\nPode ligar pra oficina?`,
          };
        }
      } else {
        // É ID do agendamento - iniciar processo de remarcação
        const ordemId = parseInt(userMessage.replace('remarcar_', ''));
        if (customerData?.agendamentosFuturos) {
          const ag = customerData.agendamentosFuturos.find(a => a.id === ordemId);
          if (ag) {
            agendamento.ativo = true;
            agendamento.timestamp = Date.now();
            agendamento.veiculoNome = ag.veiculo;
            agendamento.etapa = 'escolher_data';
            agendamento.horariosDisponiveis = await getHorariosDisponiveis(empresaId);
            (agendamento as any).ordemIdRemarcar = ordemId;
            agendamentoState.set(phoneNumber, agendamento);

            if (agendamento.horariosDisponiveis.length > 0) {
              const choices = [
                '[Novos Horários]',
                ...agendamento.horariosDisponiveis.map(slot => {
                  const diaNome = slot.label.split(' ')[0];
                  const horaInfo = slot.label.replace(diaNome + ' ', '');
                  return `${diaNome}|remarcar_${slot.data.toISOString()}|${horaInfo}`;
                }),
              ];

              return {
                type: 'list',
                text: `${primeiroNome}, escolha o novo horário para seu ${ag.veiculo}:`,
                listButton: 'Ver Horários',
                footerText: 'Escolha o novo horário',
                choices,
              };
            }
          }
        }
      }
    }

    // Processar cancelamento de agendamento específico via botão
    if (isButtonResponse && userMessage.startsWith('cancelar_') && userMessage !== 'cancelar_cadastro') {
      const ordemId = parseInt(userMessage.replace('cancelar_', ''));
      const primeiroNome = customerData?.nome.split(' ')[0] || (userName ? userName.split(' ')[0] : 'Cliente');

      if (!isNaN(ordemId) && customerData?.agendamentosFuturos) {
        const ag = customerData.agendamentosFuturos.find(a => a.id === ordemId);
        if (ag) {
          const cancelou = await cancelarOrdemServico(ordemId);
          if (cancelou) {
            return {
              type: 'text',
              message: `Pronto, ${primeiroNome}! ❌\n\nCancelei o agendamento do ${ag.veiculo} que estava marcado pra ${formatDateBrazil(ag.dataAgendada)}.\n\nQuando quiser reagendar, é só me chamar! 😊`,
            };
          }
        }
      }

      return {
        type: 'text',
        message: `Ops, não consegui cancelar. 😅\n\nPode ligar pra oficina?`,
      };
    }

    // ==========================================
    // FUNCTION CALLING - Gemini decide a ação
    // ==========================================

    // Preparar contexto para o modelo
    const primeiroNome = customerData?.nome.split(' ')[0] || (userName ? userName.split(' ')[0] : 'Cliente');

    // Buscar histórico recente de mensagens para contexto
    const recentMessages = await getRecentMessages(phoneNumber, empresaId);
    let historicoConversa = '';
    if (recentMessages.length > 0) {
      historicoConversa = `\n\n[HISTÓRICO DA CONVERSA - Use este contexto para entender o que o cliente está respondendo]`;
      for (const msg of recentMessages.slice(-12)) { // Últimas 12 mensagens para manter contexto rico
        const remetente = msg.role === 'bot' ? 'Você (bot)' : 'Cliente';
        historicoConversa += `\n${remetente}: ${msg.text.substring(0, 500)}`;
      }
      historicoConversa += `\n[FIM DO HISTÓRICO]`;
    }

    // Informações de contexto para o modelo
    let contextoAgendamento = '';
    if (agendamento.ativo) {
      contextoAgendamento = `\n\n[ESTADO ATUAL: Agendamento em andamento]`;
      if (agendamento.etapa === 'escolher_veiculo') {
        contextoAgendamento += `\n- Etapa: Aguardando escolha de veículo`;
        contextoAgendamento += `\n- Veículos disponíveis: ${customerData?.veiculos.map((v, i) => `${i}: ${v.marca} ${v.modelo}`).join(', ')}`;
      } else if (agendamento.etapa === 'escolher_data') {
        contextoAgendamento += `\n- Etapa: Aguardando escolha de horário`;
        contextoAgendamento += `\n- Veículo selecionado: ${agendamento.veiculoNome}`;
        if (agendamento.horariosDisponiveis) {
          contextoAgendamento += `\n- Horários disponíveis: ${agendamento.horariosDisponiveis.map((h, i) => `${i}: ${h.label}`).join(', ')}`;
        }
      } else if (agendamento.etapa === 'confirmar') {
        contextoAgendamento += `\n- Etapa: Aguardando confirmação`;
        contextoAgendamento += `\n- Veículo: ${agendamento.veiculoNome}`;
        contextoAgendamento += `\n- Data/Hora: ${agendamento.dataHora ? formatDateBrazil(agendamento.dataHora) : 'não definida'}`;
      }
    }

    let contextoCliente = '';
    if (customerData) {
      contextoCliente = `\n\n[DADOS DO CLIENTE - JÁ CADASTRADO]`;
      contextoCliente += `\n- Nome: ${customerData.nome}`;
      contextoCliente += `\n- Veículos: ${customerData.veiculos.map((v, i) => `${i}: ${v.marca} ${v.modelo} (${v.placa})`).join(', ')}`;
      if (customerData.ultimoServico) {
        const diasDesdeUltimo = Math.floor((Date.now() - customerData.ultimoServico.data.getTime()) / (1000 * 60 * 60 * 24));
        contextoCliente += `\n- Último serviço: ${customerData.ultimoServico.tipo} (há ${diasDesdeUltimo} dias)`;
        if (diasDesdeUltimo > 180) {
          contextoCliente += ` ⚠️ ATENÇÃO: Já passou do tempo recomendado para revisão!`;
        }
      }
      if (customerData.ordensEmAndamento && customerData.ordensEmAndamento.length > 0) {
        contextoCliente += `\n- VEÍCULOS NA OFICINA AGORA: ${customerData.ordensEmAndamento.map(o => `${o.veiculo} (${o.status})`).join(', ')}`;
      }
      if (customerData.agendamentosFuturos && customerData.agendamentosFuturos.length > 0) {
        const proxAg = customerData.agendamentosFuturos[0];
        contextoCliente += `\n- Próximo agendamento: ${formatDateBrazil(proxAg.dataAgendada)} - ${proxAg.veiculo}`;
      }
      if (customerData.preferencias) {
        const prefs: string[] = [];
        if (customerData.preferencias.oleo) prefs.push(`óleo ${customerData.preferencias.oleo}`);
        if (customerData.preferencias.horario) prefs.push(`horário: ${customerData.preferencias.horario}`);
        if (customerData.preferencias.dia) prefs.push(`dia: ${customerData.preferencias.dia}`);
        if (prefs.length > 0) {
          contextoCliente += `\n- Preferências do cliente: ${prefs.join(', ')}`;
        }
      }
    } else {
      contextoCliente = `\n\n[CLIENTE NÃO CADASTRADO - Você pode cadastrar este cliente via chatbot!]`;
    }

    // Contexto de cadastro em andamento
    let contextoCadastro = '';
    if (cadastro.ativo) {
      contextoCadastro = `\n\n[ESTADO ATUAL: Cadastro em andamento]`;
      contextoCadastro += `\n- Etapa: ${cadastro.etapa}`;
      if (cadastro.nome) contextoCadastro += `\n- Nome: ${cadastro.nome}`;
      if (cadastro.placa) contextoCadastro += `\n- Placa: ${cadastro.placa}`;
      if (cadastro.marca) contextoCadastro += `\n- Marca: ${cadastro.marca}`;
      if (cadastro.modelo) contextoCadastro += `\n- Modelo: ${cadastro.modelo}`;
      if (cadastro.ano) contextoCadastro += `\n- Ano: ${cadastro.ano}`;
      if (cadastro.kmAtual) contextoCadastro += `\n- KM: ${cadastro.kmAtual}`;

      // Mostrar dados faltantes
      const faltantes: string[] = [];
      if (!cadastro.nome) faltantes.push('nome');
      if (!cadastro.placa) faltantes.push('placa');
      if (!cadastro.marca) faltantes.push('marca');
      if (!cadastro.modelo) faltantes.push('modelo');
      if (faltantes.length > 0) {
        contextoCadastro += `\n- DADOS FALTANTES: ${faltantes.join(', ')}`;
      } else {
        contextoCadastro += `\n- TODOS OS DADOS OBRIGATÓRIOS PREENCHIDOS - pronto para confirmar!`;
      }
    }

    // Construir prompt para function calling
    const systemPromptFC = `Você é a assistente virtual inteligente de uma oficina mecânica. Seu nome é ${config?.chatbotNome || 'LoopIA'}.
Oficina: ${config?.nomeOficina || 'Oficina'}
Horário: ${parseHorarioParaString(config?.chatbotHorario || null)}

Serviços disponíveis:
${servicosFormatados}
${contextoCliente}
${contextoCadastro}
${contextoAgendamento}
${historicoConversa}

🧠 SUA PERSONALIDADE:
- Você é uma atendente REAL de oficina mecânica, simpática e experiente
- Fale de forma NATURAL e HUMANA, como se fosse um WhatsApp entre amigos
- Use linguagem informal brasileira (pode usar "tá", "pra", "né", "beleza", "show")
- Chame o cliente sempre pelo primeiro nome: "${primeiroNome}"
- Seja CONCISA (máximo 2-3 frases curtas), ninguém gosta de textão no WhatsApp
- Use emojis com moderação (1-2 por mensagem, máximo)
- Evite parecer um robô: NÃO repita o nome do cliente em toda mensagem, NÃO use frases genéricas como "Como posso ajudar?"
- Lembre das preferências do cliente e use-as proativamente
- Se o cliente perguntar algo que você não sabe, seja honesta e ofereça ligar pra oficina

📋 REGRAS DE OURO:
1. SEMPRE leia o HISTÓRICO DA CONVERSA para entender o contexto
2. Se o cliente perguntou algo e você respondeu, e ele confirma (sim, pode, ok, isso, quero), EXECUTE a ação apropriada
3. Se o cliente mencionar um veículo específico e confirmar, não pergunte de novo qual veículo
4. Seja PROATIVA: se o cliente não faz serviço há muito tempo, sugira gentilmente uma revisão
5. Se o cliente tem preferências cadastradas, mencione-as (ex: "Vai querer o sintético de sempre?")
6. NUNCA responda de forma genérica a perguntas técnicas - se não sabe, diga que vai verificar com o mecânico
7. Adapte o tom: se o cliente é formal, seja mais formal. Se é descontraído, seja descontraída

⏰ HORÁRIO DE FUNCIONAMENTO:
- Nosso horário de atendimento é: ${parseHorarioParaString(config?.chatbotHorario || null)}
- NUNCA ofereça horários fora do expediente (ex: domingo, madrugada, feriados)
- Se o cliente pedir horário indisponível, sugira gentilmente um horário dentro do funcionamento
- Se não souber o horário exato, informe que vai verificar e ofereça os horários disponíveis na lista

⚠️ REGRAS CRÍTICAS DE CADASTRO:
6. Se o cliente INFORMA DADOS (placa, marca, modelo, ano, km), SEMPRE chame salvar_dados_veiculo COM TODOS os dados que ele informou!
   Exemplo: "Ford F150 placa HHW3243" → salvar_dados_veiculo(placa="HHW3243", marca="Ford", modelo="F150")
7. NUNCA peça um dado que o cliente JÁ INFORMOU - olhe os dados já salvos no cadastro!
8. Se o cliente já está cadastrado mas quer agendar um veículo que não tem, use iniciar_cadastro (vai pular o nome automaticamente)

🔧 FUNÇÕES INTELIGENTES:
- consultar_status_veiculo: "meu carro já ficou?", "como está meu carro?", "já posso buscar?"
- consultar_agendamentos: "quando é minha marcação?", "tenho agendamento?"
- cancelar_ou_remarcar: "preciso remarcar", "cancelar agendamento", "mudar horário"
- consultar_preco: "quanto custa?", "qual o valor?", "preço de..."
- agendar_multiplos_servicos: quando pedir 2+ serviços juntos (ex: "troca de óleo e filtro")
- registrar_preferencia: quando mencionar preferência (ex: "prefiro óleo sintético", "gosto de ir de manhã")
- consultar_historico: "quando fiz a última troca?", "meu histórico"

📅 FUNÇÕES DE AGENDAMENTO:
- iniciar_agendamento: quando cliente quer agendar/marcar serviço
- selecionar_veiculo: quando escolher veículo (índice 0, 1, 2... ou -1 para todos)
- selecionar_horario: quando escolher dia/horário
- confirmar_agendamento: quando confirmar
- cancelar_agendamento: quando desistir

📝 FUNÇÕES DE CADASTRO (veículo novo):
- iniciar_cadastro: quando cliente quer agendar um veículo que NÃO TEM cadastrado (funciona para cliente novo OU existente adicionando veículo)
- salvar_nome_cliente: informou nome completo (SÓ se cliente novo)
- salvar_dados_veiculo: EXTRAIA TODOS os dados que o cliente informou! Se ele disse "Ford F150 placa ABC1234 2024 50000km", chame com TODOS os parâmetros!
- confirmar_cadastro: quando TODOS os dados obrigatórios estão preenchidos (nome se novo, placa, marca, modelo)

💬 responder_texto: para saudações, dúvidas gerais, conversas normais

EXEMPLOS DE INTERPRETAÇÃO:
- "oi" → responder_texto (saudação)
- "quero agendar" → iniciar_agendamento
- "meu carro já tá pronto?" → consultar_status_veiculo
- "quanto custa trocar o óleo?" → consultar_preco
- "quero trocar óleo e filtro" → agendar_multiplos_servicos
- "prefiro de manhã" → registrar_preferencia
- "preciso remarcar" → cancelar_ou_remarcar
- "sim", "pode", "ok" (após pergunta) → executar ação do contexto

Mensagem atual: "${userMessage}"`;

    // Chamar Gemini com function calling e thinking habilitado
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: chatbotTools,
      generationConfig: {
        // Habilita thinking interno para melhor raciocínio
        // O modelo "pensa" antes de responder, melhorando a qualidade
        thinkingConfig: {
          thinkingBudget: 4096, // Tokens para raciocínio interno (aumentado para respostas mais inteligentes)
        },
      } as any, // Type assertion para suportar thinkingConfig
    });

    const result = await model.generateContent(systemPromptFC);
    const response = result.response;

    // Verificar se há function call
    const functionCall = response.functionCalls()?.[0];

    if (functionCall) {
      console.log('[CHATBOT] Function call:', functionCall.name, functionCall.args);

      // Executar a função apropriada
      return await executeFunctionCall(
        functionCall.name,
        (functionCall.args || {}) as Record<string, unknown>,
        phoneNumber,
        empresaId,
        customerData,
        agendamento,
        cadastro,
        primeiroNome,
        recentMessages
      );
    }

    // Se não houver function call, usar a resposta de texto
    const textResponse = response.text();
    if (textResponse) {
      return { type: 'text', message: textResponse };
    }

    // Fallback
    return { type: 'text', message: `Olá ${primeiroNome}! Como posso ajudar?` };
  } catch (error: any) {
    console.error('[CHATBOT] Erro ao gerar resposta:', error?.message);
    return { type: 'text', message: 'Desculpe, não consegui processar sua mensagem. Tente novamente ou ligue para a oficina.' };
  }
}

// ==========================================
// FUNÇÃO PARA EXECUTAR FUNCTION CALLS
// ==========================================

async function executeFunctionCall(
  functionName: string,
  args: Record<string, unknown>,
  phoneNumber: string,
  empresaId: number,
  customerData: CustomerData | null,
  agendamento: AgendamentoState,
  cadastro: CadastroState,
  primeiroNome: string,
  recentMessages?: { role: 'user' | 'bot'; text: string }[]
): Promise<ChatResponse> {
  console.log('[CHATBOT] Executando função:', functionName, args);

  switch (functionName) {
    case 'iniciar_agendamento': {
      // Capturar serviço mencionado pelo cliente
      const servicoMencionado = (args.servico as string) || '';

      // Se cliente não está cadastrado, redirecionar para cadastro
      if (!customerData || customerData.veiculos.length === 0) {
        console.log('[CHATBOT] Cliente não cadastrado, redirecionando para cadastro');
        return executeFunctionCall(
          'iniciar_cadastro',
          {},
          phoneNumber,
          empresaId,
          customerData,
          agendamento,
          cadastro,
          primeiroNome,
          recentMessages
        );
      }

      // Iniciar novo agendamento
      agendamento.ativo = true;
      agendamento.timestamp = Date.now();
      if (servicoMencionado) {
        agendamento.servico = servicoMencionado;
      }

      // Verificar se um veículo específico foi mencionado nas mensagens recentes
      let veiculoMencionado: typeof customerData.veiculos[0] | null = null;
      if (recentMessages && recentMessages.length > 0 && customerData.veiculos.length > 1) {
        // Pegar últimas mensagens do bot para ver se mencionou algum veículo
        const lastBotMessages = recentMessages.filter(m => m.role === 'bot').slice(-3);
        const textoBot = lastBotMessages.map(m => m.text.toLowerCase()).join(' ');

        // Procurar por placa ou modelo mencionado
        for (const v of customerData.veiculos) {
          const placaLower = v.placa.toLowerCase().replace('-', '');
          const modeloLower = v.modelo.toLowerCase();
          const marcaLower = v.marca.toLowerCase();

          if (textoBot.includes(placaLower) || textoBot.includes(v.placa.toLowerCase()) ||
              (textoBot.includes(modeloLower) && textoBot.includes(marcaLower))) {
            veiculoMencionado = v;
            console.log('[CHATBOT] Veículo detectado no histórico:', v.marca, v.modelo, v.placa);
            break;
          }
        }
      }

      // Se encontrou veículo mencionado, pular seleção
      if (veiculoMencionado) {
        agendamento.veiculoId = veiculoMencionado.id;
        agendamento.veiculoNome = `${veiculoMencionado.marca} ${veiculoMencionado.modelo}`;
        agendamento.etapa = 'escolher_data';
        agendamento.horariosDisponiveis = await getHorariosDisponiveis(empresaId);
        agendamentoState.set(phoneNumber, agendamento);

        if (agendamento.horariosDisponiveis.length > 0) {
          const choices = [
            '[Horários Disponíveis]',
            ...agendamento.horariosDisponiveis.map(slot => {
              const diaNome = slot.label.split(' ')[0];
              const horaInfo = slot.label.replace(diaNome + ' ', '');
              return `${diaNome}|horario_${slot.data.toISOString()}|${horaInfo}`;
            }),
          ];

          return {
            type: 'list',
            text: `Ótimo, ${primeiroNome}! 🚗\n\nVou agendar ${agendamento.servico || 'o serviço'} do seu ${agendamento.veiculoNome}.\n\nQual horário fica bom?`,
            listButton: 'Ver Horários',
            footerText: 'Escolha o melhor horário',
            choices,
          };
        }

        return {
          type: 'text',
          message: `Oi ${primeiroNome}! Quero agendar seu ${agendamento.veiculoNome}, mas não encontrei horários disponíveis essa semana. 😅\n\nPode ligar pra oficina?`,
        };
      }

      if (customerData.veiculos.length > 1) {
        agendamento.etapa = 'escolher_veiculo';
        agendamentoState.set(phoneNumber, agendamento);

        const choices = [
          '[Seus Veículos]',
          `Todos os veículos|veiculo_todos|Agendar para ${customerData.veiculos.length} veículos`,
          ...customerData.veiculos.map(v => {
            const descricao = v.kmAtual ? `${v.kmAtual.toLocaleString('pt-BR')} km` : v.placa;
            return `${v.marca} ${v.modelo}|veiculo_${v.id}|${descricao}`;
          }),
        ];

        return {
          type: 'list',
          text: `Oi ${primeiroNome}! Vamos agendar? 🚗\n\nVi que você tem ${customerData.veiculos.length} veículos cadastrados. Qual deles você quer trazer?`,
          listButton: 'Escolher Veículo',
          footerText: 'Selecione um ou todos',
          choices,
        };
      }

      // Se só tem 1 veículo
      const v = customerData.veiculos[0];
      agendamento.veiculoId = v.id;
      agendamento.veiculoNome = `${v.marca} ${v.modelo}`;
      agendamento.etapa = 'escolher_data';
      agendamento.horariosDisponiveis = await getHorariosDisponiveis(empresaId);
      agendamentoState.set(phoneNumber, agendamento);

      if (agendamento.horariosDisponiveis.length > 0) {
        const choices = [
          '[Horários Disponíveis]',
          ...agendamento.horariosDisponiveis.map(slot => {
            const diaNome = slot.label.split(' ')[0];
            const horaInfo = slot.label.replace(diaNome + ' ', '');
            return `${diaNome}|horario_${slot.data.toISOString()}|${horaInfo}`;
          }),
        ];

        return {
          type: 'list',
          text: `Oi ${primeiroNome}! Vamos agendar ${agendamento.servico || 'o serviço'} do seu ${agendamento.veiculoNome}? 🚗\n\nEscolha um horário:`,
          listButton: 'Ver Horários',
          footerText: 'Escolha o melhor horário',
          choices,
        };
      }

      return {
        type: 'text',
        message: `Oi ${primeiroNome}! Quero agendar seu ${agendamento.veiculoNome}, mas não encontrei horários disponíveis essa semana. 😅\n\nPode ligar pra oficina?`,
      };
    }

    case 'selecionar_veiculo': {
      if (!customerData) {
        return { type: 'text', message: 'Não encontrei seus dados. Pode ligar pra oficina?' };
      }

      const veiculoIndex = args.veiculoIndex as number;

      // Todos os veículos
      if (veiculoIndex === -1) {
        agendamento.veiculoIds = customerData.veiculos.map(v => v.id);
        agendamento.veiculoNomes = customerData.veiculos.map(v => `${v.marca} ${v.modelo}`);
        agendamento.veiculoNome = `${customerData.veiculos.length} veículos`;
      } else if (veiculoIndex >= 0 && veiculoIndex < customerData.veiculos.length) {
        const v = customerData.veiculos[veiculoIndex];
        agendamento.veiculoId = v.id;
        agendamento.veiculoNome = `${v.marca} ${v.modelo}`;
      } else {
        return { type: 'text', message: `Qual veículo você quer trazer, ${primeiroNome}?` };
      }

      agendamento.etapa = 'escolher_data';
      agendamento.horariosDisponiveis = await getHorariosDisponiveis(empresaId);
      agendamentoState.set(phoneNumber, agendamento);

      if (agendamento.horariosDisponiveis.length > 0) {
        const choices = [
          '[Horários Disponíveis]',
          ...agendamento.horariosDisponiveis.map(slot => {
            const diaNome = slot.label.split(' ')[0];
            const horaInfo = slot.label.replace(diaNome + ' ', '');
            return `${diaNome}|horario_${slot.data.toISOString()}|${horaInfo}`;
          }),
        ];

        return {
          type: 'list',
          text: `Ótimo, ${primeiroNome}! 🚗\n\nVou agendar ${agendamento.servico || 'o serviço'} do seu ${agendamento.veiculoNome}.\n\nQual horário fica bom?`,
          listButton: 'Ver Horários',
          footerText: 'Escolha o melhor horário',
          choices,
        };
      }

      return { type: 'text', message: 'Não encontrei horários disponíveis. Pode ligar pra oficina?' };
    }

    case 'selecionar_horario': {
      const slots = agendamento.horariosDisponiveis;
      if (!slots || slots.length === 0) {
        return { type: 'text', message: 'Não encontrei horários disponíveis. Pode ligar pra oficina?' };
      }

      let slotEscolhido: { data: Date; label: string } | null = null;

      // Tentar pelo índice
      const horarioIndex = args.horarioIndex as number | undefined;
      if (horarioIndex !== undefined && horarioIndex >= 0 && horarioIndex < slots.length) {
        slotEscolhido = slots[horarioIndex];
      }

      // Tentar pelo dia da semana e/ou hora
      if (!slotEscolhido) {
        const diaSemana = (args.diaSemana as string)?.toLowerCase();
        const hora = args.hora as number | undefined;
        const periodo = (args.periodo as string)?.toLowerCase();

        for (const slot of slots) {
          const labelLower = slot.label.toLowerCase();
          const slotHora = slot.data.getUTCHours() - 3; // UTC para Brasília

          // Match por dia + hora
          if (diaSemana && hora && labelLower.includes(diaSemana) && slotHora === hora) {
            slotEscolhido = slot;
            break;
          }
          // Match só por dia
          if (diaSemana && labelLower.includes(diaSemana)) {
            slotEscolhido = slot;
            break;
          }
          // Match só por hora
          if (hora && slotHora === hora) {
            slotEscolhido = slot;
            break;
          }
          // Match por período
          if (periodo && labelLower.includes(periodo)) {
            slotEscolhido = slot;
            break;
          }
        }
      }

      if (!slotEscolhido) {
        // Mostrar lista de horários novamente
        const choices = [
          '[Horários Disponíveis]',
          ...slots.map(slot => {
            const diaNome = slot.label.split(' ')[0];
            const horaInfo = slot.label.replace(diaNome + ' ', '');
            return `${diaNome}|horario_${slot.data.toISOString()}|${horaInfo}`;
          }),
        ];

        return {
          type: 'list',
          text: `${primeiroNome}, qual desses horários fica bom pra você?`,
          listButton: 'Ver Horários',
          footerText: 'Escolha o melhor horário',
          choices,
        };
      }

      // Horário selecionado - ir para confirmação
      agendamento.dataHora = slotEscolhido.data;
      agendamento.etapa = 'confirmar';
      agendamentoState.set(phoneNumber, agendamento);

      const dataFormatada = formatDateBrazil(slotEscolhido.data);

      return {
        type: 'button',
        text: `Perfeito, ${primeiroNome}! 📋\n\n*Confirme seu agendamento:*\n\n🚗 Veículo: ${agendamento.veiculoNome}\n📅 Data: ${dataFormatada}\n🔧 Serviço: ${agendamento.servico || 'Serviço agendado'}`,
        footerText: 'Confirma o agendamento?',
        choices: ['✅ Confirmar|confirmar_sim', '❌ Cancelar|cancelar'],
      };
    }

    case 'confirmar_agendamento': {
      // Se não tem agendamento em andamento, iniciar um novo
      if (!agendamento.ativo || !agendamento.veiculoId || !agendamento.dataHora) {
        console.log('[CHATBOT] Confirmação sem agendamento ativo, redirecionando para iniciar_agendamento');
        // Redirecionar para iniciar agendamento (passando o histórico para detectar veículo)
        return executeFunctionCall(
          'iniciar_agendamento',
          {},
          phoneNumber,
          empresaId,
          customerData,
          agendamento,
          cadastro,
          primeiroNome,
          recentMessages
        );
      }

      const resultado = await criarOrdemServico(
        agendamento.veiculoId,
        agendamento.dataHora,
        empresaId,
        agendamento.servico || 'Serviço agendado'
      );

      agendamentoState.delete(phoneNumber);

      if (resultado.success) {
        const dataFormatada = formatDateBrazil(agendamento.dataHora);
        return {
          type: 'text',
          message: `Pronto, ${primeiroNome}! ✅\n\nSeu ${agendamento.veiculoNome} está agendado para ${dataFormatada}.\n\nTe esperamos! 😊`,
        };
      }

      return {
        type: 'text',
        message: `Ops, tive um probleminha pra criar o agendamento. 😅\n\nPode ligar pra oficina que a gente resolve!`,
      };
    }

    case 'cancelar_agendamento': {
      agendamentoState.delete(phoneNumber);
      return {
        type: 'text',
        message: `Tudo bem! Cancelei o agendamento. 😊\n\nQuando quiser marcar, é só me chamar!`,
      };
    }

    // ==========================================
    // FUNÇÕES DE CADASTRO
    // ==========================================

    case 'iniciar_cadastro': {
      cadastro.ativo = true;
      cadastro.timestamp = Date.now();

      // Se o cliente JÁ EXISTE (tem customerData), só precisa cadastrar o veículo
      if (customerData && customerData.nome) {
        cadastro.nome = customerData.nome; // Usar nome existente
        cadastro.etapa = 'veiculo';
        cadastroState.set(phoneNumber, cadastro);

        console.log('[CHATBOT] Cliente existente, adicionando veículo novo');

        return {
          type: 'text',
          message: `${primeiroNome}, vou cadastrar seu novo veículo! 🚗\n\nQual a *placa*, *marca* e *modelo* do carro?\n\n_Exemplo: ABC1234, Ford F-150_`,
        };
      }

      // Cliente realmente novo - pedir nome
      cadastro.etapa = 'nome';
      cadastroState.set(phoneNumber, cadastro);

      console.log('[CHATBOT] Iniciando cadastro para cliente novo');

      return {
        type: 'text',
        message: `Oi${primeiroNome !== 'Cliente' ? ` ${primeiroNome}` : ''}! 😊\n\nVi que você ainda não está cadastrado(a) aqui. Vou te cadastrar rapidinho pra gente agendar!\n\nQual é o seu *nome completo*?`,
      };
    }

    case 'salvar_nome_cliente': {
      const nome = args.nome as string;
      if (!nome || nome.length < 2) {
        return {
          type: 'text',
          message: `Por favor, me diz seu nome completo pra eu te cadastrar! 😊`,
        };
      }

      cadastro.ativo = true;
      cadastro.nome = nome;
      cadastro.etapa = 'veiculo';
      cadastro.timestamp = Date.now();
      cadastroState.set(phoneNumber, cadastro);

      console.log('[CHATBOT] Nome salvo:', nome);

      return {
        type: 'text',
        message: `Prazer, ${nome.split(' ')[0]}! 😊\n\nAgora preciso dos dados do seu veículo.\n\nQual a *placa*, *marca* e *modelo* do seu carro?\n\n_Exemplo: ABC1234, Volkswagen Gol_`,
      };
    }

    case 'salvar_dados_veiculo': {
      // Se cliente já existe, usar o nome dele
      if (!cadastro.nome && customerData?.nome) {
        cadastro.nome = customerData.nome;
      }

      // Atualizar dados do veículo (pode ser parcial)
      if (args.placa) {
        const placa = (args.placa as string).toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (placa.length >= 7) {
          cadastro.placa = placa;
        }
      }
      if (args.marca) cadastro.marca = args.marca as string;
      if (args.modelo) cadastro.modelo = args.modelo as string;
      if (args.ano) cadastro.ano = args.ano as number;
      if (args.kmAtual) cadastro.kmAtual = args.kmAtual as number;

      cadastro.ativo = true;
      cadastro.timestamp = Date.now();
      cadastroState.set(phoneNumber, cadastro);

      console.log('[CHATBOT] Dados veículo salvos:', { placa: cadastro.placa, marca: cadastro.marca, modelo: cadastro.modelo, nome: cadastro.nome });

      // Verificar se faltam dados obrigatórios
      const faltantes: string[] = [];
      // Nome só é obrigatório se cliente não existe ainda
      if (!cadastro.nome && !customerData?.nome) faltantes.push('nome');
      if (!cadastro.placa) faltantes.push('placa');
      if (!cadastro.marca) faltantes.push('marca');
      if (!cadastro.modelo) faltantes.push('modelo');

      if (faltantes.length > 0) {
        const primeiroNomeCadastro = cadastro.nome?.split(' ')[0] || primeiroNome;
        const dadosInformados: string[] = [];
        if (cadastro.nome) dadosInformados.push(`Nome: ${cadastro.nome}`);
        if (cadastro.placa) dadosInformados.push(`Placa: ${cadastro.placa}`);
        if (cadastro.marca) dadosInformados.push(`Marca: ${cadastro.marca}`);
        if (cadastro.modelo) dadosInformados.push(`Modelo: ${cadastro.modelo}`);

        return {
          type: 'text',
          message: `${primeiroNomeCadastro}, ainda falta: *${faltantes.join(', ')}*\n\n${dadosInformados.length > 0 ? `✅ Já tenho:\n${dadosInformados.join('\n')}\n\n` : ''}Pode me informar o que falta?`,
        };
      }

      // Todos os dados obrigatórios preenchidos - pedir confirmação
      cadastro.etapa = 'confirmar';
      cadastroState.set(phoneNumber, cadastro);

      const primeiroNomeCadastro = cadastro.nome?.split(' ')[0] || primeiroNome;
      return {
        type: 'button',
        text: `Perfeito, ${primeiroNomeCadastro}! 📋\n\n*Confirme seus dados:*\n\n👤 Nome: ${cadastro.nome}\n🚗 Veículo: ${cadastro.marca} ${cadastro.modelo}\n📋 Placa: ${cadastro.placa}${cadastro.ano ? `\n📅 Ano: ${cadastro.ano}` : ''}${cadastro.kmAtual ? `\n🔢 KM: ${cadastro.kmAtual.toLocaleString('pt-BR')}` : ''}`,
        footerText: 'Tudo certo?',
        choices: ['✅ Confirmar|confirmar_cadastro', '❌ Corrigir|cancelar_cadastro'],
      };
    }

    case 'confirmar_cadastro': {
      // Verificar se todos os dados obrigatórios estão presentes
      if (!cadastro.nome || !cadastro.placa || !cadastro.marca || !cadastro.modelo) {
        return {
          type: 'text',
          message: `Ainda faltam alguns dados pra eu completar o cadastro. Me conta: qual a placa, marca e modelo do seu carro?`,
        };
      }

      // Criar cliente e veículo
      const resultado = await criarClienteEVeiculo(
        empresaId,
        phoneNumber,
        cadastro.nome,
        cadastro.placa,
        cadastro.marca,
        cadastro.modelo,
        cadastro.ano,
        cadastro.kmAtual
      );

      if (!resultado.success) {
        console.error('[CHATBOT] Erro ao criar cadastro:', resultado.error);

        if (resultado.error === 'Placa já cadastrada') {
          return {
            type: 'text',
            message: `Ops! Essa placa já está cadastrada aqui. 😅\n\nSe for seu carro, pode ser que você já tenha cadastro com outro telefone. Liga pra oficina que a gente resolve!`,
          };
        }

        return {
          type: 'text',
          message: `Ops, tive um probleminha pra criar o cadastro. 😅\n\nPode ligar pra oficina que a gente resolve rapidinho!`,
        };
      }

      // Limpar estado de cadastro
      const primeiroNomeCadastro = cadastro.nome.split(' ')[0];
      cadastroState.delete(phoneNumber);

      console.log('[CHATBOT] Cadastro criado! Cliente:', resultado.clienteId, 'Veículo:', resultado.veiculoId);

      // Buscar dados atualizados do cliente para iniciar agendamento
      const novoCustomerData = await getCustomerData(phoneNumber, empresaId);

      if (novoCustomerData && novoCustomerData.veiculos.length > 0) {
        // IMPORTANTE: Encontrar o veículo que ACABOU de ser cadastrado (pelo ID ou placa)
        let veiculoRecemCadastrado = novoCustomerData.veiculos.find(v => v.id === resultado.veiculoId);

        // Fallback: buscar pela placa que foi cadastrada
        if (!veiculoRecemCadastrado && cadastro.placa) {
          veiculoRecemCadastrado = novoCustomerData.veiculos.find(v =>
            v.placa.toUpperCase().replace(/[^A-Z0-9]/g, '') === cadastro.placa?.toUpperCase().replace(/[^A-Z0-9]/g, '')
          );
        }

        // Se ainda não encontrou, usar o mais recente (último da lista)
        if (!veiculoRecemCadastrado) {
          veiculoRecemCadastrado = novoCustomerData.veiculos[novoCustomerData.veiculos.length - 1];
        }

        // Iniciar agendamento automaticamente COM O VEÍCULO CORRETO
        agendamento.ativo = true;
        agendamento.timestamp = Date.now();
        agendamento.veiculoId = veiculoRecemCadastrado.id;
        agendamento.veiculoNome = `${veiculoRecemCadastrado.marca} ${veiculoRecemCadastrado.modelo}`;
        agendamento.etapa = 'escolher_data';
        agendamento.horariosDisponiveis = await getHorariosDisponiveis(empresaId);
        agendamentoState.set(phoneNumber, agendamento);

        console.log('[CHATBOT] Veículo selecionado para agendamento:', agendamento.veiculoNome, agendamento.veiculoId);

        if (agendamento.horariosDisponiveis.length > 0) {
          const choices = [
            '[Horários Disponíveis]',
            ...agendamento.horariosDisponiveis.map(slot => {
              const diaNome = slot.label.split(' ')[0];
              const horaInfo = slot.label.replace(diaNome + ' ', '');
              return `${diaNome}|horario_${slot.data.toISOString()}|${horaInfo}`;
            }),
          ];

          return {
            type: 'list',
            text: `Pronto, ${primeiroNomeCadastro}! ✅ Cadastro feito!\n\nAgora vamos agendar ${agendamento.servico || 'o serviço'} do seu ${agendamento.veiculoNome}?\n\nEscolha um horário:`,
            listButton: 'Ver Horários',
            footerText: 'Escolha o melhor horário',
            choices,
          };
        }
      }

      return {
        type: 'text',
        message: `Pronto, ${primeiroNomeCadastro}! ✅ Seu cadastro foi criado com sucesso!\n\nAgora você pode agendar quando quiser. É só me chamar aqui! 😊`,
      };
    }

    case 'responder_texto': {
      const mensagem = args.mensagem as string;
      return { type: 'text', message: mensagem || `Olá ${primeiroNome}! Como posso ajudar?` };
    }

    // ==========================================
    // FUNÇÕES INTELIGENTES
    // ==========================================

    case 'consultar_status_veiculo': {
      if (!customerData) {
        return {
          type: 'text',
          message: `Oi! Não encontrei seu cadastro aqui. 😅\n\nPode me passar seu telefone cadastrado ou ligar pra oficina?`,
        };
      }

      // Verificar se tem ordens em andamento
      if (!customerData.ordensEmAndamento || customerData.ordensEmAndamento.length === 0) {
        // Verificar agendamentos futuros
        if (customerData.agendamentosFuturos && customerData.agendamentosFuturos.length > 0) {
          const proximo = customerData.agendamentosFuturos[0];
          const dataFormatada = formatDateBrazil(proximo.dataAgendada);
          return {
            type: 'text',
            message: `${primeiroNome}, você não tem nenhum veículo aqui no momento. 🔍\n\nMas você tem um agendamento:\n📅 ${dataFormatada}\n🚗 ${proximo.veiculo}\n🔧 ${proximo.servicos}\n\nTe esperamos! 😊`,
          };
        }

        return {
          type: 'text',
          message: `${primeiroNome}, você não tem nenhum veículo aqui na oficina no momento. 🔍\n\nQuer agendar um serviço?`,
        };
      }

      // Tem ordens em andamento
      const statusMap: Record<string, string> = {
        'AGENDADO': '📅 Agendado - aguardando chegada',
        'EM_ANDAMENTO': '🔧 Em andamento - estamos trabalhando!',
        'AGUARDANDO_PECAS': '⏳ Aguardando peças',
        'CONCLUIDO': '✅ Pronto pra buscar!',
      };

      if (customerData.ordensEmAndamento.length === 1) {
        const ordem = customerData.ordensEmAndamento[0];
        const statusTexto = statusMap[ordem.status] || ordem.status;

        let mensagem = `${primeiroNome}, aqui está o status do seu ${ordem.veiculo}:\n\n${statusTexto}`;

        if (ordem.status === 'EM_ANDAMENTO') {
          mensagem += `\n\nAssim que ficar pronto, te aviso aqui! 😊`;
        } else if (ordem.status === 'CONCLUIDO') {
          mensagem += `\n\nPode vir buscar quando quiser! Estamos te esperando. 🎉`;
        } else if (ordem.dataAgendada) {
          mensagem += `\n\n📅 Agendado para: ${formatDateBrazil(ordem.dataAgendada)}`;
        }

        return { type: 'text', message: mensagem };
      }

      // Múltiplos veículos
      let mensagem = `${primeiroNome}, aqui está o status dos seus veículos:\n`;
      for (const ordem of customerData.ordensEmAndamento) {
        const statusTexto = statusMap[ordem.status] || ordem.status;
        mensagem += `\n🚗 *${ordem.veiculo}*\n   ${statusTexto}\n`;
      }

      return { type: 'text', message: mensagem };
    }

    case 'consultar_agendamentos': {
      if (!customerData) {
        return {
          type: 'text',
          message: `Oi! Não encontrei seu cadastro aqui. 😅\n\nPode me passar seu telefone cadastrado?`,
        };
      }

      if (!customerData.agendamentosFuturos || customerData.agendamentosFuturos.length === 0) {
        return {
          type: 'text',
          message: `${primeiroNome}, você não tem nenhum agendamento futuro. 📅\n\nQuer agendar um serviço agora?`,
        };
      }

      let mensagem = `${primeiroNome}, seus próximos agendamentos:\n`;
      for (const ag of customerData.agendamentosFuturos) {
        const dataFormatada = formatDateBrazil(ag.dataAgendada);
        mensagem += `\n📅 *${dataFormatada}*\n   🚗 ${ag.veiculo}\n   🔧 ${ag.servicos}\n`;
      }

      return { type: 'text', message: mensagem };
    }

    case 'cancelar_ou_remarcar': {
      if (!customerData) {
        return {
          type: 'text',
          message: `Oi! Não encontrei seu cadastro aqui. 😅\n\nPode ligar pra oficina pra resolver?`,
        };
      }

      const acao = (args.acao as string)?.toLowerCase() || 'cancelar';

      if (!customerData.agendamentosFuturos || customerData.agendamentosFuturos.length === 0) {
        return {
          type: 'text',
          message: `${primeiroNome}, você não tem nenhum agendamento pra ${acao === 'remarcar' ? 'remarcar' : 'cancelar'}. 📅`,
        };
      }

      // Se tem apenas um agendamento, processar direto
      if (customerData.agendamentosFuturos.length === 1) {
        const ag = customerData.agendamentosFuturos[0];

        if (acao === 'cancelar') {
          const cancelou = await cancelarOrdemServico(ag.id);
          if (cancelou) {
            return {
              type: 'text',
              message: `Pronto, ${primeiroNome}! ❌\n\nCancelei seu agendamento do ${ag.veiculo} que estava marcado pra ${formatDateBrazil(ag.dataAgendada)}.\n\nQuando quiser reagendar, é só me chamar! 😊`,
            };
          }
          return {
            type: 'text',
            message: `Ops, não consegui cancelar. 😅\n\nPode ligar pra oficina?`,
          };
        }

        // Remarcar - mostrar novos horários
        agendamento.ativo = true;
        agendamento.timestamp = Date.now();
        agendamento.veiculoId = customerData.veiculos.find(v => `${v.marca} ${v.modelo}` === ag.veiculo)?.id;
        agendamento.veiculoNome = ag.veiculo;
        agendamento.etapa = 'escolher_data';
        agendamento.horariosDisponiveis = await getHorariosDisponiveis(empresaId);
        (agendamento as any).ordemIdRemarcar = ag.id; // Guardar ID para remarcar
        agendamentoState.set(phoneNumber, agendamento);

        if (agendamento.horariosDisponiveis.length > 0) {
          const choices = [
            '[Novos Horários]',
            ...agendamento.horariosDisponiveis.map(slot => {
              const diaNome = slot.label.split(' ')[0];
              const horaInfo = slot.label.replace(diaNome + ' ', '');
              return `${diaNome}|remarcar_${slot.data.toISOString()}|${horaInfo}`;
            }),
          ];

          return {
            type: 'list',
            text: `${primeiroNome}, vamos remarcar o agendamento do seu ${ag.veiculo}! 📅\n\nAtualmente está marcado pra ${formatDateBrazil(ag.dataAgendada)}.\n\nEscolha uma nova data:`,
            listButton: 'Ver Horários',
            footerText: 'Escolha o novo horário',
            choices,
          };
        }
      }

      // Múltiplos agendamentos - perguntar qual
      const choices = customerData.agendamentosFuturos.map(ag => {
        const dataSimples = ag.dataAgendada.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
        return `${ag.veiculo}|${acao}_${ag.id}|${dataSimples}`;
      });

      return {
        type: 'list',
        text: `${primeiroNome}, qual agendamento você quer ${acao === 'remarcar' ? 'remarcar' : 'cancelar'}?`,
        listButton: 'Ver Agendamentos',
        footerText: 'Selecione um',
        choices: ['[Seus Agendamentos]', ...choices],
      };
    }

    case 'consultar_preco': {
      const servicoBuscado = (args.servico as string)?.toLowerCase() || '';
      const servicos = await getServicos(empresaId);

      if (servicos.length === 0) {
        return {
          type: 'text',
          message: `${primeiroNome}, ainda não temos os preços cadastrados no sistema. 😅\n\nPode ligar pra oficina pra saber os valores?`,
        };
      }

      // Buscar serviço específico
      let servicosEncontrados = servicos;
      if (servicoBuscado) {
        servicosEncontrados = servicos.filter(s => {
          const nomeLower = s.nome.toLowerCase();
          const categoriaLower = s.categoria.toLowerCase().replace(/_/g, ' ');
          return nomeLower.includes(servicoBuscado) ||
                 categoriaLower.includes(servicoBuscado) ||
                 servicoBuscado.includes(nomeLower.split(' ')[0]) ||
                 (servicoBuscado.includes('óleo') && categoriaLower.includes('oleo')) ||
                 (servicoBuscado.includes('oleo') && categoriaLower.includes('oleo')) ||
                 (servicoBuscado.includes('filtro') && nomeLower.includes('filtro'));
        });
      }

      if (servicosEncontrados.length === 0) {
        // Mostrar todos os serviços
        servicosEncontrados = servicos;
      }

      if (servicosEncontrados.length === 1) {
        const s = servicosEncontrados[0];
        return {
          type: 'text',
          message: `${primeiroNome}, o preço de *${s.nome}* é:\n\n💰 *R$ ${s.preco.toFixed(2).replace('.', ',')}*\n\nQuer agendar? 😊`,
        };
      }

      // Múltiplos serviços - formatar por categoria
      const porCategoria: Record<string, typeof servicosEncontrados> = {};
      for (const s of servicosEncontrados) {
        const cat = s.categoria.replace(/_/g, ' ');
        if (!porCategoria[cat]) porCategoria[cat] = [];
        porCategoria[cat].push(s);
      }

      let mensagem = `${primeiroNome}, aqui estão nossos preços:\n`;
      for (const [categoria, items] of Object.entries(porCategoria)) {
        mensagem += `\n*${categoria}*\n`;
        for (const s of items) {
          mensagem += `  • ${s.nome}: R$ ${s.preco.toFixed(2).replace('.', ',')}\n`;
        }
      }
      mensagem += `\nQuer agendar algum serviço? 😊`;

      return { type: 'text', message: mensagem };
    }

    case 'agendar_multiplos_servicos': {
      const servicosPedidos = args.servicos as string[] || [];

      if (!customerData || customerData.veiculos.length === 0) {
        // Redirecionar para cadastro
        return executeFunctionCall(
          'iniciar_cadastro',
          {},
          phoneNumber,
          empresaId,
          customerData,
          agendamento,
          cadastro,
          primeiroNome,
          recentMessages
        );
      }

      // Buscar serviços disponíveis
      const servicosDisponiveis = await getServicos(empresaId);

      // Encontrar serviços que correspondem aos pedidos
      const servicosEncontrados: ServicoData[] = [];
      for (const pedido of servicosPedidos) {
        const pedidoLower = pedido.toLowerCase();
        const encontrado = servicosDisponiveis.find(s => {
          const nomeLower = s.nome.toLowerCase();
          return nomeLower.includes(pedidoLower) || pedidoLower.includes(nomeLower.split(' ')[0]);
        });
        if (encontrado && !servicosEncontrados.some(e => e.id === encontrado.id)) {
          servicosEncontrados.push(encontrado);
        }
      }

      if (servicosEncontrados.length === 0) {
        return {
          type: 'text',
          message: `${primeiroNome}, não encontrei esses serviços. 😅\n\nPode me dizer novamente o que você precisa?\n\nExemplo: troca de óleo, filtro de ar, alinhamento...`,
        };
      }

      // Calcular total
      const total = servicosEncontrados.reduce((acc, s) => acc + s.preco, 0);
      const listaServicos = servicosEncontrados.map(s => `• ${s.nome}: R$ ${s.preco.toFixed(2).replace('.', ',')}`).join('\n');

      // Guardar serviços no estado para usar quando confirmar
      (agendamento as any).servicosMultiplos = servicosEncontrados;

      // Iniciar agendamento
      agendamento.ativo = true;
      agendamento.timestamp = Date.now();
      agendamento.servico = servicosEncontrados.map(s => s.nome).join(' + ');

      if (customerData.veiculos.length === 1) {
        const v = customerData.veiculos[0];
        agendamento.veiculoId = v.id;
        agendamento.veiculoNome = `${v.marca} ${v.modelo}`;
        agendamento.etapa = 'escolher_data';
        agendamento.horariosDisponiveis = await getHorariosDisponiveis(empresaId);
        agendamentoState.set(phoneNumber, agendamento);

        if (agendamento.horariosDisponiveis.length > 0) {
          const choices = [
            '[Horários Disponíveis]',
            ...agendamento.horariosDisponiveis.map(slot => {
              const diaNome = slot.label.split(' ')[0];
              const horaInfo = slot.label.replace(diaNome + ' ', '');
              return `${diaNome}|horario_${slot.data.toISOString()}|${horaInfo}`;
            }),
          ];

          return {
            type: 'list',
            text: `${primeiroNome}, vou agendar esses serviços no seu ${agendamento.veiculoNome}:\n\n${listaServicos}\n\n💰 *Total: R$ ${total.toFixed(2).replace('.', ',')}*\n\nEscolha um horário:`,
            listButton: 'Ver Horários',
            footerText: 'Escolha o melhor horário',
            choices,
          };
        }
      }

      // Múltiplos veículos
      agendamento.etapa = 'escolher_veiculo';
      agendamentoState.set(phoneNumber, agendamento);

      const choices = [
        '[Seus Veículos]',
        ...customerData.veiculos.map(v => {
          const descricao = v.kmAtual ? `${v.kmAtual.toLocaleString('pt-BR')} km` : v.placa;
          return `${v.marca} ${v.modelo}|veiculo_${v.id}|${descricao}`;
        }),
      ];

      return {
        type: 'list',
        text: `${primeiroNome}, vou agendar esses serviços:\n\n${listaServicos}\n\n💰 *Total: R$ ${total.toFixed(2).replace('.', ',')}*\n\nQual veículo você quer trazer?`,
        listButton: 'Escolher Veículo',
        footerText: 'Selecione um',
        choices,
      };
    }

    case 'registrar_preferencia': {
      if (!customerData) {
        return {
          type: 'text',
          message: `${primeiroNome}, vou lembrar disso! Mas você ainda não está cadastrado. Quer se cadastrar primeiro?`,
        };
      }

      const tipo = args.tipo as string;
      const valor = args.valor as string;

      const salvou = await salvarPreferenciaCliente(customerData.id, tipo, valor);

      if (salvou) {
        const tipoNome: Record<string, string> = {
          oleo: 'tipo de óleo',
          horario: 'horário preferido',
          dia: 'dia preferido',
          observacao: 'observação',
        };
        return {
          type: 'text',
          message: `Anotado, ${primeiroNome}! ✍️\n\nVou lembrar que você prefere ${tipoNome[tipo] || tipo}: *${valor}*\n\nPosso te ajudar com mais alguma coisa?`,
        };
      }

      return {
        type: 'text',
        message: `Opa, tive um probleminha pra anotar. 😅\n\nMas pode me lembrar quando vier, ok?`,
      };
    }

    case 'consultar_historico': {
      if (!customerData) {
        return {
          type: 'text',
          message: `Oi! Não encontrei seu cadastro aqui. 😅\n\nPode me passar seu telefone cadastrado?`,
        };
      }

      if (customerData.historicoServicos.length === 0) {
        return {
          type: 'text',
          message: `${primeiroNome}, você ainda não fez nenhum serviço aqui. 📋\n\nQuer agendar o primeiro? 😊`,
        };
      }

      let mensagem = `${primeiroNome}, aqui está seu histórico de serviços:\n`;
      for (const servico of customerData.historicoServicos) {
        mensagem += `\n📅 ${servico}`;
      }

      if (customerData.ultimoServico) {
        const diasDesdeUltimo = Math.floor((Date.now() - customerData.ultimoServico.data.getTime()) / (1000 * 60 * 60 * 24));
        if (diasDesdeUltimo > 180) {
          mensagem += `\n\n⚠️ Já faz ${diasDesdeUltimo} dias desde o último serviço. Hora de uma revisão?`;
        }
      }

      return { type: 'text', message: mensagem };
    }

    default: {
      return { type: 'text', message: `Olá ${primeiroNome}! Como posso ajudar?` };
    }
  }
}

// CÓDIGO ANTIGO REMOVIDO - Agora usa function calling

// Iniciar agendamento se cliente quiser - REMOVIDO
// A lógica agora está em executeFunctionCall('iniciar_agendamento')

// ==========================================
// FIM DO CHATBOT COM FUNCTION CALLING
// ==========================================

// Limpar histórico de um número específico
export function clearHistory(phoneNumber: string) {
  conversationHistory.delete(phoneNumber);
  agendamentoState.delete(phoneNumber);
  cadastroState.delete(phoneNumber);
}

// Limpar todo o histórico
export function clearAllHistory() {
  conversationHistory.clear();
  agendamentoState.clear();
  cadastroState.clear();
}
