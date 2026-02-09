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
  veiculoIds?: number[]; // Para múltiplos veículos
  veiculoNomes?: string[]; // Para múltiplos veículos
  dataHora?: Date;
  servico?: string;
  etapa: 'inicio' | 'escolher_veiculo' | 'escolher_data' | 'confirmar';
  horariosDisponiveis?: { data: Date; label: string }[];
}
const agendamentoState: Map<string, AgendamentoState> = new Map();

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

// Buscar histórico recente de mensagens do banco
async function getRecentMessages(phoneNumber: string): Promise<string[]> {
  try {
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    const conversa = await prisma.conversa.findFirst({
      where: {
        OR: [
          { telefone: { contains: cleanPhone.slice(-11) } },
          { telefone: { contains: cleanPhone } },
          { telefone: cleanPhone },
        ],
      },
      include: {
        mensagens: {
          orderBy: { dataEnvio: 'desc' },
          take: 5, // Últimas 5 mensagens para contexto
        },
      },
    });

    if (!conversa?.mensagens) return [];

    // Retornar mensagens em ordem cronológica
    return conversa.mensagens
      .reverse()
      .map(m => `${m.enviada ? '[Bot]' : '[Cliente]'}: ${m.conteudo}`);
  } catch (error: any) {
    console.error('[CHATBOT] Erro ao buscar histórico:', error?.message);
    return [];
  }
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

// Buscar horários disponíveis nos próximos dias
async function getHorariosDisponiveis(): Promise<{ data: Date; label: string }[]> {
  try {
    const config = await prisma.configuracao.findUnique({ where: { id: 1 } });
    const horarioConfig = config?.chatbotHorario;

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

    // Buscar agendamentos existentes nos próximos 7 dias
    const hoje = new Date();
    const fim = new Date(hoje);
    fim.setDate(fim.getDate() + 7);

    const agendamentosExistentes = await prisma.ordemServico.findMany({
      where: {
        dataAgendada: { gte: hoje, lte: fim },
        status: { in: ['AGENDADO', 'EM_ANDAMENTO'] },
      },
      select: { dataAgendada: true },
    });

    // Criar set de horários já ocupados
    const ocupados = new Set(
      agendamentosExistentes
        .filter(a => a.dataAgendada)
        .map(a => a.dataAgendada!.toISOString())
    );

    // Gerar slots disponíveis
    const slots: { data: Date; label: string }[] = [];
    const diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

    for (let d = 1; d <= 5 && slots.length < 4; d++) {
      const data = new Date(hoje);
      data.setDate(data.getDate() + d);
      const diaSemana = data.getDay();

      const horario = horariosPorDia[diaSemana];
      if (!horario) continue;

      // Gerar slots de hora em hora
      for (let hora = horario.abertura; hora < horario.fechamento && slots.length < 4; hora += 2) {
        const slot = new Date(data);
        slot.setHours(hora, 0, 0, 0);

        if (!ocupados.has(slot.toISOString())) {
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
    const primeiroNomeCliente = customerData.nome.split(' ')[0];
    contextoCliente = `
## Dados do Cliente (OBRIGATÓRIO usar estes dados)
- Nome do cliente: ${customerData.nome}
- IMPORTANTE: Chame o cliente de "${primeiroNomeCliente}" (NUNCA use outro nome!)
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
      const slots = agendamento.horariosDisponiveis || [];
      const slotsTexto = slots.map((s, i) => `${i + 1}. ${s.label}`).join('\n');
      contextoAgendamento += `
- Veículo escolhido: ${agendamento.veiculoNome}
- Etapa atual: OFERECER HORÁRIOS DISPONÍVEIS
- IMPORTANTE: Ofereça estas opções numeradas:
${slotsTexto || '(sem horários disponíveis)'}
- Pergunte qual opção o cliente prefere (1, 2, 3 ou 4)`;
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
): Promise<ChatResponse> {
  try {
    const config = await prisma.configuracao.findUnique({
      where: { id: 1 },
    });

    if (config && config.chatbotEnabled === false) {
      console.log('[CHATBOT] Chatbot desabilitado');
      return { type: 'text', message: '' };
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('[CHATBOT] GEMINI_API_KEY não configurada');
      return { type: 'text', message: 'Desculpe, estou com problemas técnicos. Por favor, ligue para a oficina.' };
    }

    const customerData = await getCustomerData(phoneNumber);
    const servicos = await getServicos();
    const servicosFormatados = formatServicosParaPrompt(servicos);

    // Gerenciar estado de agendamento
    let agendamento = agendamentoState.get(phoneNumber) || { ativo: false, etapa: 'inicio' as const };
    const msgLower = userMessage.toLowerCase();

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
          agendamento.horariosDisponiveis = await getHorariosDisponiveis();
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
          agendamento.horariosDisponiveis = await getHorariosDisponiveis();
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

        const dataFormatada = dataEscolhida.toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        });

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
      const dataFormatada = agendamento.dataHora?.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Múltiplos veículos
      if (agendamento.veiculoIds && agendamento.veiculoIds.length > 0 && agendamento.dataHora) {
        const resultados: { success: boolean; veiculo: string; numero?: string }[] = [];

        for (let i = 0; i < agendamento.veiculoIds.length; i++) {
          const veiculoId = agendamento.veiculoIds[i];
          const veiculoNome = agendamento.veiculoNomes?.[i] || 'Veículo';
          const resultado = await criarOrdemServico(veiculoId, agendamento.dataHora, 'Troca de Óleo');
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

    // Detectar intenção de agendar (mais inteligente)
    const querAgendar = (
      // Frases diretas de agendamento
      /quer[oe]?\s*(sim|agendar|marcar)|sim.*agendar|vamos\s*l[áa]|pode\s*ser|bora|fechado|quero|vou|marca|agenda|combina/i.test(msgLower) ||
      // Perguntas sobre horário/disponibilidade = quer agendar
      /qual\s*hor[aá]rio|que\s*hora|tem\s*(hor[aá]rio|vaga|disponibilidade)|quando\s*(posso|pode|d[aá])|posso\s*ir|d[aá]\s*pra|consigo\s*(ir|levar)|levo\s*(ele|o\s*carro)|preciso\s*(marcar|agendar)/i.test(msgLower) ||
      // Respostas afirmativas após oferta de agendamento (incluindo typos comuns)
      /^(sim+|zim|sin|sn|s|quero|vamos|bora|pode|ok|beleza|isso|claro|com\s*certeza|vamo|ss|sss)!*$/i.test(msgLower.trim())
    );
    const confirmacao = /^(sim|isso|ok|pode|certo|confirma|fechado|perfeito|combinado|bora|vamos)$/i.test(msgLower.trim()) ||
                       /confirm[ao]|t[áa]\s*(certo|bom|[óo]timo)|pode\s*ser|fechado/i.test(msgLower);

    // Iniciar agendamento se cliente quiser
    if (querAgendar && !agendamento.ativo && customerData && customerData.veiculos.length > 0) {
      agendamento = {
        ativo: true,
        etapa: customerData.veiculos.length > 1 ? 'escolher_veiculo' : 'escolher_data',
      };

      const primeiroNome = customerData.nome.split(' ')[0];

      // Se tem mais de 1 veículo, enviar lista para escolha
      if (customerData.veiculos.length > 1) {
        agendamentoState.set(phoneNumber, agendamento);
        console.log('[CHATBOT] Iniciando agendamento - escolha de veículo para:', customerData.nome);

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

      // Se só tem 1 veículo, já seleciona e oferece horários
      const v = customerData.veiculos[0];
      agendamento.veiculoId = v.id;
      agendamento.veiculoNome = `${v.marca} ${v.modelo}`;
      agendamento.horariosDisponiveis = await getHorariosDisponiveis();
      agendamentoState.set(phoneNumber, agendamento);
      console.log('[CHATBOT] Iniciando agendamento - horários para:', customerData.nome);

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
          text: `Oi ${primeiroNome}! Vamos agendar a troca de óleo do seu ${agendamento.veiculoNome}? 🚗\n\nEscolha um horário que fica bom pra você:`,
          listButton: 'Ver Horários',
          footerText: 'Escolha o melhor horário',
          choices,
        };
      } else {
        return {
          type: 'text',
          message: `Oi ${primeiroNome}! Quero agendar seu ${agendamento.veiculoNome}, mas não encontrei horários disponíveis essa semana. 😅\n\nPode ligar pra oficina que a gente encontra um horário?`,
        };
      }
    }

    // Processar escolha de veículo por texto (fallback)
    if (agendamento.ativo && agendamento.etapa === 'escolher_veiculo' && customerData) {
      for (const v of customerData.veiculos) {
        if (msgLower.includes(v.modelo.toLowerCase()) ||
            msgLower.includes(v.marca.toLowerCase()) ||
            msgLower.includes(v.placa.toLowerCase())) {
          agendamento.veiculoId = v.id;
          agendamento.veiculoNome = `${v.marca} ${v.modelo}`;
          agendamento.etapa = 'escolher_data';
          agendamento.horariosDisponiveis = await getHorariosDisponiveis();
          agendamentoState.set(phoneNumber, agendamento);
          console.log('[CHATBOT] Veículo selecionado por texto:', agendamento.veiculoNome);

          // Retornar lista de horários
          if (agendamento.horariosDisponiveis.length > 0) {
            const primeiroNome = customerData.nome.split(' ')[0];
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
          break;
        }
      }
    }

    // Processar escolha de horário por texto (fallback)
    if (agendamento.ativo && agendamento.etapa === 'escolher_data' && agendamento.horariosDisponiveis) {
      const slots = agendamento.horariosDisponiveis;
      let slotEscolhido: { data: Date; label: string } | null = null;

      // Tentar por número (1, 2, 3, 4)
      const numMatch = msgLower.match(/^[^\d]*(\d)[^\d]*$/);
      if (numMatch) {
        const num = parseInt(numMatch[1]);
        if (num >= 1 && num <= slots.length) {
          slotEscolhido = slots[num - 1];
        }
      }

      // Tentar por nome do dia ou palavra-chave
      if (!slotEscolhido) {
        for (const slot of slots) {
          const labelLower = slot.label.toLowerCase();
          if (msgLower.includes('segunda') && labelLower.includes('segunda')) slotEscolhido = slot;
          else if (msgLower.includes('terça') && labelLower.includes('terça')) slotEscolhido = slot;
          else if (msgLower.includes('quarta') && labelLower.includes('quarta')) slotEscolhido = slot;
          else if (msgLower.includes('quinta') && labelLower.includes('quinta')) slotEscolhido = slot;
          else if (msgLower.includes('sexta') && labelLower.includes('sexta')) slotEscolhido = slot;
          else if (msgLower.includes('sábado') && labelLower.includes('sábado')) slotEscolhido = slot;
          else if (msgLower.includes('sabado') && labelLower.includes('sábado')) slotEscolhido = slot;
          else if (msgLower.includes('manhã') && labelLower.includes('manhã')) slotEscolhido = slot;
          else if (msgLower.includes('tarde') && labelLower.includes('tarde')) slotEscolhido = slot;
          if (slotEscolhido) break;
        }
      }

      // Fallback: tentar interpretar data livremente
      if (!slotEscolhido) {
        const dataInterpretada = interpretarDataHora(userMessage);
        if (dataInterpretada) {
          slotEscolhido = { data: dataInterpretada, label: '' };
        }
      }

      if (slotEscolhido) {
        agendamento.dataHora = slotEscolhido.data;
        agendamento.etapa = 'confirmar';
        agendamentoState.set(phoneNumber, agendamento);
        console.log('[CHATBOT] Horário selecionado por texto:', slotEscolhido.label || slotEscolhido.data);

        const dataFormatada = slotEscolhido.data.toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        });

        const primeiroNome = customerData?.nome.split(' ')[0] || 'Cliente';

        return {
          type: 'button',
          text: `Perfeito, ${primeiroNome}! 📋\n\n*Confirme seu agendamento:*\n\n🚗 Veículo: ${agendamento.veiculoNome}\n📅 Data: ${dataFormatada}\n🔧 Serviço: Troca de Óleo`,
          footerText: 'Confirma o agendamento?',
          choices: ['✅ Confirmar|confirmar_sim', '❌ Cancelar|cancelar'],
        };
      }
    }

    // Processar confirmação final por texto (fallback)
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
          return {
            type: 'text',
            message: `Pronto, ${customerData?.nome.split(' ')[0]}! ✅\n\nSeu ${agendamento.veiculoNome} está agendado para ${dataFormatada}.\n\nTe esperamos! Qualquer coisa é só chamar aqui. 😊`,
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

    // Gerar resposta via Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    let history = conversationHistory.get(phoneNumber) || [];

    if (history.length > 20) {
      history = history.slice(-20);
    }

    // Se não temos histórico em memória, buscar do banco de dados
    let historicoDobanco = '';
    if (history.length === 0) {
      const mensagensRecentes = await getRecentMessages(phoneNumber);
      if (mensagensRecentes.length > 0) {
        historicoDobanco = `\n\n## Histórico Recente de Mensagens (contexto importante!)
As mensagens abaixo foram enviadas ANTES desta conversa começar. Use este contexto para entender o que o cliente está respondendo:

${mensagensRecentes.join('\n')}

---
`;
        console.log('[CHATBOT] Carregado histórico do banco:', mensagensRecentes.length, 'mensagens');
      }
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
      ? `${systemPrompt}${historicoDobanco}\n\n--- Início da Conversa ---\n\n${contextMessage}`
      : contextMessage;

    const result = await chat.sendMessage(fullMessage);
    const response = result.response.text();

    history.push({ role: 'user', parts: [{ text: fullMessage }] });
    history.push({ role: 'model', parts: [{ text: response }] });
    conversationHistory.set(phoneNumber, history);

    return { type: 'text', message: response };
  } catch (error: any) {
    console.error('[CHATBOT] Erro ao gerar resposta:', error?.message);
    return { type: 'text', message: 'Desculpe, não consegui processar sua mensagem. Tente novamente ou ligue para a oficina.' };
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
