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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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
      description: 'Inicia o processo de agendamento quando o cliente quer marcar/agendar um serviço. Use quando o cliente demonstrar intenção de agendar, marcar horário, fazer revisão, trocar óleo, etc. Exemplos: "quero agendar", "pode sim", "vamos marcar", "preciso trocar o óleo", "qual horário tem?", "posso ir amanhã?"',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {},
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
              take: 5,
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
    if (veiculoPrincipal?.ordens) {
      for (const ordem of veiculoPrincipal.ordens.slice(0, 3)) {
        const servicos = ordem.itens.map(i => i.servico.nome).join(', ');
        const data = ordem.createdAt.toLocaleDateString('pt-BR');
        historicoServicos.push(`${data}: ${servicos}`);
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
    const msgLower = userMessage.toLowerCase().trim();

    // Verificar se o estado expirou (30 min)
    if (agendamento.ativo && isStateExpired(agendamento)) {
      console.log('[CHATBOT] Estado de agendamento expirado, resetando');
      agendamentoState.delete(phoneNumber);
      agendamento = { ativo: false, etapa: 'inicio' as const };
    }

    // Tratar áudio não transcrito
    if (userMessage === '[AUDIO_NAO_TRANSCRITO]' || userMessage === '[AUDIO_SEM_URL]') {
      const primeiroNome = customerData?.nome.split(' ')[0] || userName || 'Cliente';
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

    // Detectar se é resposta de botão/lista (buttonOrListid)
    const isButtonResponse = /^(veiculo_|horario_|confirmar_|cancelar)/.test(userMessage);

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
              text: `Ótimo, ${primeiroNome}! 🚗\n\nVou agendar a troca de óleo dos seus veículos:\n${listaVeiculos}\n\nQual horário fica bom pra você?`,
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
              text: `Ótimo, ${primeiroNome}! 🚗\n\nVou agendar a troca de óleo do seu ${agendamento.veiculoNome}.\n\nQual horário fica bom pra você?`,
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
            text: `Perfeito, ${primeiroNome}! 📋\n\n*Confirme seu agendamento:*\n\n🚗 Veículos:\n${listaVeiculos}\n📅 Data: ${dataFormatada}\n🔧 Serviço: Troca de Óleo`,
            footerText: 'Confirma o agendamento?',
            choices: ['✅ Confirmar|confirmar_sim', '❌ Cancelar|cancelar'],
          };
        }

        // Veículo único
        return {
          type: 'button',
          text: `Perfeito, ${primeiroNome}! 📋\n\n*Confirme seu agendamento:*\n\n🚗 Veículo: ${agendamento.veiculoNome}\n📅 Data: ${dataFormatada}\n🔧 Serviço: Troca de Óleo`,
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
          const resultado = await criarOrdemServico(veiculoId, agendamento.dataHora, empresaId, 'Troca de Óleo');
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
          'Troca de Óleo'
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

    // ==========================================
    // FUNCTION CALLING - Gemini decide a ação
    // ==========================================

    // Preparar contexto para o modelo
    const primeiroNome = customerData?.nome.split(' ')[0] || userName || 'Cliente';

    // Buscar histórico recente de mensagens para contexto
    const recentMessages = await getRecentMessages(phoneNumber, empresaId);
    let historicoConversa = '';
    if (recentMessages.length > 0) {
      historicoConversa = `\n\n[HISTÓRICO DA CONVERSA - Use este contexto para entender o que o cliente está respondendo]`;
      for (const msg of recentMessages.slice(-6)) { // Últimas 6 mensagens
        const remetente = msg.role === 'bot' ? 'Você (bot)' : 'Cliente';
        historicoConversa += `\n${remetente}: ${msg.text.substring(0, 200)}`;
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
      contextoCliente = `\n\n[DADOS DO CLIENTE]`;
      contextoCliente += `\n- Nome: ${customerData.nome}`;
      contextoCliente += `\n- Veículos: ${customerData.veiculos.map((v, i) => `${i}: ${v.marca} ${v.modelo} (${v.placa})`).join(', ')}`;
      if (customerData.ultimoServico) {
        contextoCliente += `\n- Último serviço: ${customerData.ultimoServico.tipo}`;
      }
    } else {
      contextoCliente = `\n\n[CLIENTE NÃO CADASTRADO]`;
    }

    // Construir prompt para function calling
    const systemPromptFC = `Você é a assistente virtual de uma oficina mecânica. Seu nome é ${config?.chatbotNome || 'LoopIA'}.
Oficina: ${config?.nomeOficina || 'Oficina'}
Horário: ${parseHorarioParaString(config?.chatbotHorario || null)}

Serviços disponíveis:
${servicosFormatados}
${contextoCliente}
${contextoAgendamento}
${historicoConversa}

REGRAS IMPORTANTES:
1. Chame o cliente pelo primeiro nome: "${primeiroNome}"
2. Seja simpática e objetiva (máximo 2-3 frases)
3. Use a função apropriada baseado na intenção do cliente
4. IMPORTANTE: Leia o HISTÓRICO DA CONVERSA para entender o contexto
5. Se a última mensagem do bot mencionou um veículo específico e o cliente confirma (sim, pode, ok), use iniciar_agendamento
6. Para agendar: use iniciar_agendamento
7. Para selecionar veículo: use selecionar_veiculo com o índice correto
8. Para selecionar horário: use selecionar_horario
9. Para confirmar: use confirmar_agendamento
10. Para cancelar: use cancelar_agendamento
11. Para responder normalmente: use responder_texto

Mensagem atual do cliente: "${userMessage}"`;

    // Chamar Gemini com function calling
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      tools: chatbotTools,
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
  primeiroNome: string,
  recentMessages?: { role: 'user' | 'bot'; text: string }[]
): Promise<ChatResponse> {
  console.log('[CHATBOT] Executando função:', functionName, args);

  switch (functionName) {
    case 'iniciar_agendamento': {
      if (!customerData || customerData.veiculos.length === 0) {
        return {
          type: 'text',
          message: `Oi ${primeiroNome}! Para agendar, preciso que você tenha um veículo cadastrado. Pode ligar pra oficina que a gente te cadastra rapidinho! 😊`,
        };
      }

      // Iniciar novo agendamento
      agendamento.ativo = true;
      agendamento.timestamp = Date.now();

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
            text: `Ótimo, ${primeiroNome}! 🚗\n\nVou agendar a troca de óleo do seu ${agendamento.veiculoNome}.\n\nQual horário fica bom?`,
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
          text: `Oi ${primeiroNome}! Vamos agendar a troca de óleo do seu ${agendamento.veiculoNome}? 🚗\n\nEscolha um horário:`,
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
          text: `Ótimo, ${primeiroNome}! 🚗\n\nVou agendar a troca de óleo do seu ${agendamento.veiculoNome}.\n\nQual horário fica bom?`,
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
        text: `Perfeito, ${primeiroNome}! 📋\n\n*Confirme seu agendamento:*\n\n🚗 Veículo: ${agendamento.veiculoNome}\n📅 Data: ${dataFormatada}\n🔧 Serviço: Troca de Óleo`,
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
          primeiroNome,
          recentMessages
        );
      }

      const resultado = await criarOrdemServico(
        agendamento.veiculoId,
        agendamento.dataHora,
        empresaId,
        'Troca de Óleo'
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

    case 'responder_texto': {
      const mensagem = args.mensagem as string;
      return { type: 'text', message: mensagem || `Olá ${primeiroNome}! Como posso ajudar?` };
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
}

// Limpar todo o histórico
export function clearAllHistory() {
  conversationHistory.clear();
  agendamentoState.clear();
}
