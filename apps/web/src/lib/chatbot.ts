import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from './prisma';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Histórico de conversas por número (cache simples em memória)
const conversationHistory: Map<string, { role: string; parts: { text: string }[] }[]> = new Map();

// Estado de agendamento por número
interface AgendamentoState {
  ativo: boolean;
  veiculoId?: number;
  veiculoNome?: string;
  dataHora?: Date;
  servico?: string;
  etapa: 'inicio' | 'escolher_veiculo' | 'escolher_data' | 'confirmar';
}
const agendamentoState: Map<string, AgendamentoState> = new Map();

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
async function getServicos(): Promise<ServicoData[]> {
  try {
    const servicos = await prisma.servico.findMany({
      where: { ativo: true },
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

// Buscar dados do cliente pelo telefone
async function getCustomerData(phoneNumber: string): Promise<CustomerData | null> {
  try {
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    const cliente = await prisma.cliente.findFirst({
      where: {
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

// Calcular próxima troca baseado no KM
function calcularProximaTroca(kmAtual: number | null, kmUltimaOrdem: number | null): string | null {
  if (!kmAtual) return null;

  const kmBase = kmUltimaOrdem || kmAtual;
  const proximaTroca = Math.ceil((kmBase + 5000) / 5000) * 5000;
  const kmRestantes = proximaTroca - kmAtual;

  if (kmRestantes <= 0) {
    return `Já passou da km de troca (${proximaTroca.toLocaleString('pt-BR')} km)`;
  } else if (kmRestantes <= 500) {
    return `Próxima troca em breve: ${proximaTroca.toLocaleString('pt-BR')} km (faltam ${kmRestantes} km)`;
  }

  return `Próxima troca: ${proximaTroca.toLocaleString('pt-BR')} km`;
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

// Criar ordem de serviço automaticamente
async function criarOrdemServico(
  veiculoId: number,
  dataAgendada: Date,
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

// Interpretar data/hora do texto do usuário
function interpretarDataHora(texto: string): Date | null {
  const hoje = new Date();
  const textoLower = texto.toLowerCase();

  // Padrões de dia da semana
  const diasSemana: Record<string, number> = {
    'domingo': 0, 'segunda': 1, 'terça': 2, 'terca': 2, 'quarta': 3,
    'quinta': 4, 'sexta': 5, 'sábado': 6, 'sabado': 6,
  };

  // Verificar "hoje", "amanhã"
  if (textoLower.includes('hoje')) {
    return hoje;
  }
  if (textoLower.includes('amanhã') || textoLower.includes('amanha')) {
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    return amanha;
  }

  // Verificar dia da semana
  for (const [dia, numero] of Object.entries(diasSemana)) {
    if (textoLower.includes(dia)) {
      const data = new Date(hoje);
      const diasAteProximo = (numero - hoje.getDay() + 7) % 7 || 7;
      data.setDate(data.getDate() + diasAteProximo);

      // Extrair hora se mencionada
      const horaMatch = texto.match(/(\d{1,2})\s*(h|hora|:)/i);
      if (horaMatch) {
        data.setHours(parseInt(horaMatch[1]), 0, 0, 0);
      } else if (textoLower.includes('manhã') || textoLower.includes('manha')) {
        data.setHours(9, 0, 0, 0);
      } else if (textoLower.includes('tarde')) {
        data.setHours(14, 0, 0, 0);
      } else {
        data.setHours(9, 0, 0, 0); // Padrão: 9h
      }

      return data;
    }
  }

  // Verificar padrão de data DD/MM
  const dataMatch = texto.match(/(\d{1,2})[\/\-](\d{1,2})/);
  if (dataMatch) {
    const dia = parseInt(dataMatch[1]);
    const mes = parseInt(dataMatch[2]) - 1;
    const data = new Date(hoje.getFullYear(), mes, dia);
    if (data < hoje) {
      data.setFullYear(data.getFullYear() + 1);
    }

    const horaMatch = texto.match(/(\d{1,2})\s*(h|hora|:)/i);
    if (horaMatch) {
      data.setHours(parseInt(horaMatch[1]), 0, 0, 0);
    } else {
      data.setHours(9, 0, 0, 0);
    }

    return data;
  }

  return null;
}

function buildSystemPrompt(
  config: {
    chatbotNome?: string | null;
    chatbotHorario?: string | null;
    nomeOficina?: string | null;
  },
  customerData: CustomerData | null,
  servicosFormatados: string,
  agendamento: AgendamentoState | null
) {
  const nome = config.chatbotNome || 'LoopIA';
  const horario = parseHorarioParaString(config.chatbotHorario || null);
  const oficina = config.nomeOficina || 'nossa oficina';

  let contextoCliente = '';
  if (customerData && !customerData.isNewCustomer) {
    contextoCliente = `
## Dados do Cliente (USE para personalizar as respostas)
- Nome: ${customerData.nome}
- Veículos cadastrados:`;

    for (const v of customerData.veiculos) {
      contextoCliente += `
  * ${v.marca} ${v.modelo}${v.ano ? ` ${v.ano}` : ''} (Placa: ${v.placa})${v.kmAtual ? ` - ${v.kmAtual.toLocaleString('pt-BR')} km` : ''}`;
    }

    if (customerData.ultimoServico) {
      const diasDesdeUltimo = Math.floor(
        (Date.now() - customerData.ultimoServico.data.getTime()) / (1000 * 60 * 60 * 24)
      );
      contextoCliente += `
- Último serviço: ${customerData.ultimoServico.tipo} (há ${diasDesdeUltimo} dias)`;
    }
  } else {
    contextoCliente = `
## Cliente Novo
Este cliente ainda não está cadastrado. Seja acolhedor!`;
  }

  // Contexto de agendamento em andamento
  let contextoAgendamento = '';
  if (agendamento?.ativo) {
    contextoAgendamento = `

## AGENDAMENTO EM ANDAMENTO
O cliente está no processo de agendar um serviço.`;

    if (agendamento.etapa === 'escolher_veiculo') {
      contextoAgendamento += `
- Etapa atual: ESCOLHER VEÍCULO
- Pergunte qual veículo ele quer trazer (liste as opções)`;
    } else if (agendamento.etapa === 'escolher_data') {
      contextoAgendamento += `
- Veículo escolhido: ${agendamento.veiculoNome}
- Etapa atual: ESCOLHER DATA/HORA
- Pergunte qual dia e horário fica bom`;
    } else if (agendamento.etapa === 'confirmar') {
      const dataFormatada = agendamento.dataHora?.toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
      });
      contextoAgendamento += `
- Veículo: ${agendamento.veiculoNome}
- Data/Hora: ${dataFormatada}
- Etapa atual: AGUARDANDO CONFIRMAÇÃO
- Peça confirmação do agendamento`;
    }
  }

  return `Você é a ${nome}, assistente virtual de ${oficina}.

## Sua Personalidade
- Simpática, profissional e objetiva
- Fala de forma natural, como um atendente humano
- Usa emojis ocasionalmente
- Nunca é robótica

## Serviços e Preços
${servicosFormatados}

## Horário de Funcionamento
${horario}
${contextoCliente}
${contextoAgendamento}

## IMPORTANTE - Fluxo de Agendamento
Quando o cliente quiser agendar/marcar:
1. Se tem mais de 1 veículo: pergunte qual
2. Pergunte dia e horário preferido
3. Confirme os dados antes de finalizar
4. Diga algo como "Vou agendar pra você!"

## Regras
1. SEMPRE use o nome do cliente
2. Seja breve - máximo 2-3 frases
3. PODE informar preços!
4. NUNCA invente serviços ou preços
5. Quando o cliente confirmar o agendamento, diga "Pronto, agendado!"
`;
}

export async function generateChatResponse(
  userMessage: string,
  phoneNumber: string,
  userName?: string
): Promise<string> {
  try {
    const config = await prisma.configuracao.findUnique({
      where: { id: 1 },
    });

    if (config && config.chatbotEnabled === false) {
      console.log('[CHATBOT] Chatbot desabilitado');
      return '';
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('[CHATBOT] GEMINI_API_KEY não configurada');
      return 'Desculpe, estou com problemas técnicos. Por favor, ligue para a oficina.';
    }

    const customerData = await getCustomerData(phoneNumber);
    const servicos = await getServicos();
    const servicosFormatados = formatServicosParaPrompt(servicos);

    // Gerenciar estado de agendamento
    let agendamento = agendamentoState.get(phoneNumber) || { ativo: false, etapa: 'inicio' as const };
    const msgLower = userMessage.toLowerCase();

    // Detectar intenção de agendar
    const querAgendar = /quer[oe]?\s*(sim|agendar|marcar)|sim.*agendar|vamos\s*l[áa]|pode\s*ser|bora|fechado|quero|vou|marca|agenda|combina/i.test(msgLower);
    const confirmacao = /^(sim|isso|ok|pode|certo|confirma|fechado|perfeito|combinado|bora|vamos)$/i.test(msgLower.trim()) ||
                       /confirm[ao]|t[áa]\s*(certo|bom|[óo]timo)|pode\s*ser|fechado/i.test(msgLower);

    // Iniciar agendamento se cliente quiser
    if (querAgendar && !agendamento.ativo && customerData && customerData.veiculos.length > 0) {
      agendamento = {
        ativo: true,
        etapa: customerData.veiculos.length > 1 ? 'escolher_veiculo' : 'escolher_data',
      };

      // Se só tem 1 veículo, já seleciona
      if (customerData.veiculos.length === 1) {
        const v = customerData.veiculos[0];
        agendamento.veiculoId = v.id;
        agendamento.veiculoNome = `${v.marca} ${v.modelo}`;
      }

      agendamentoState.set(phoneNumber, agendamento);
      console.log('[CHATBOT] Iniciando agendamento para:', customerData.nome);
    }

    // Processar escolha de veículo
    if (agendamento.ativo && agendamento.etapa === 'escolher_veiculo' && customerData) {
      for (const v of customerData.veiculos) {
        if (msgLower.includes(v.modelo.toLowerCase()) ||
            msgLower.includes(v.marca.toLowerCase()) ||
            msgLower.includes(v.placa.toLowerCase())) {
          agendamento.veiculoId = v.id;
          agendamento.veiculoNome = `${v.marca} ${v.modelo}`;
          agendamento.etapa = 'escolher_data';
          agendamentoState.set(phoneNumber, agendamento);
          console.log('[CHATBOT] Veículo selecionado:', agendamento.veiculoNome);
          break;
        }
      }
    }

    // Processar escolha de data
    if (agendamento.ativo && agendamento.etapa === 'escolher_data') {
      const dataInterpretada = interpretarDataHora(userMessage);
      if (dataInterpretada) {
        agendamento.dataHora = dataInterpretada;
        agendamento.etapa = 'confirmar';
        agendamentoState.set(phoneNumber, agendamento);
        console.log('[CHATBOT] Data selecionada:', dataInterpretada);
      }
    }

    // Processar confirmação final
    if (agendamento.ativo && agendamento.etapa === 'confirmar' && confirmacao) {
      if (agendamento.veiculoId && agendamento.dataHora) {
        const resultado = await criarOrdemServico(
          agendamento.veiculoId,
          agendamento.dataHora,
          'Troca de Óleo'
        );

        // Limpar estado
        agendamentoState.delete(phoneNumber);

        if (resultado.success) {
          const dataFormatada = agendamento.dataHora.toLocaleDateString('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
          });
          console.log('[CHATBOT] Agendamento criado! O.S.:', resultado.numero);
          return `Pronto, ${customerData?.nome.split(' ')[0]}! ✅

Seu ${agendamento.veiculoNome} está agendado para ${dataFormatada}.

Te esperamos! Qualquer coisa é só chamar aqui. 😊`;
        } else {
          console.error('[CHATBOT] Erro ao criar agendamento:', resultado.error);
          return `Ops, tive um probleminha pra criar o agendamento. 😅

Pode ligar pra oficina que a gente resolve rapidinho!`;
        }
      }
    }

    // Gerar resposta via Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    let history = conversationHistory.get(phoneNumber) || [];

    if (history.length > 20) {
      history = history.slice(-20);
    }

    const chat = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    });

    const nomeCliente = customerData?.nome || userName || 'Cliente';
    const contextMessage = `[${nomeCliente}]: ${userMessage}`;

    const systemPrompt = buildSystemPrompt(config || {}, customerData, servicosFormatados, agendamento.ativo ? agendamento : null);
    const fullMessage = history.length === 0
      ? `${systemPrompt}\n\n--- Início da Conversa ---\n\n${contextMessage}`
      : contextMessage;

    const result = await chat.sendMessage(fullMessage);
    const response = result.response.text();

    history.push({ role: 'user', parts: [{ text: fullMessage }] });
    history.push({ role: 'model', parts: [{ text: response }] });
    conversationHistory.set(phoneNumber, history);

    return response;
  } catch (error: any) {
    console.error('[CHATBOT] Erro ao gerar resposta:', error?.message);
    return 'Desculpe, não consegui processar sua mensagem. Tente novamente ou ligue para a oficina.';
  }
}

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
