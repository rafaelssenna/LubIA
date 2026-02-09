import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from './prisma';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Histórico de conversas por número (cache simples em memória)
const conversationHistory: Map<string, { role: string; parts: { text: string }[] }[]> = new Map();

// Interface para dados do cliente
interface CustomerData {
  nome: string;
  veiculo?: {
    marca: string;
    modelo: string;
    ano: number | null;
    placa: string;
    kmAtual: number | null;
  };
  ultimoServico?: {
    data: Date;
    tipo: string;
    km: number | null;
  };
  historicoServicos: string[];
  isNewCustomer: boolean;
}

// Buscar dados do cliente pelo telefone
async function getCustomerData(phoneNumber: string): Promise<CustomerData | null> {
  try {
    // Formatar telefone para busca (pode vir como 5511999999999 ou 11999999999)
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    // Buscar cliente por telefone (tentando com e sem código do país)
    const cliente = await prisma.cliente.findFirst({
      where: {
        OR: [
          { telefone: { contains: cleanPhone.slice(-11) } }, // últimos 11 dígitos
          { telefone: { contains: cleanPhone.slice(-10) } }, // últimos 10 dígitos
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

    // Pegar o veículo principal (primeiro cadastrado ou mais recente com serviço)
    const veiculoPrincipal = cliente.veiculos[0];

    // Pegar última ordem de serviço
    const ultimaOrdem = veiculoPrincipal?.ordens[0];

    // Montar histórico de serviços
    const historicoServicos: string[] = [];
    if (veiculoPrincipal?.ordens) {
      for (const ordem of veiculoPrincipal.ordens.slice(0, 3)) {
        const servicos = ordem.itens.map(i => i.servico.nome).join(', ');
        const data = ordem.createdAt.toLocaleDateString('pt-BR');
        historicoServicos.push(`${data}: ${servicos}`);
      }
    }

    return {
      nome: cliente.nome,
      veiculo: veiculoPrincipal ? {
        marca: veiculoPrincipal.marca,
        modelo: veiculoPrincipal.modelo,
        ano: veiculoPrincipal.ano,
        placa: veiculoPrincipal.placa,
        kmAtual: veiculoPrincipal.kmAtual,
      } : undefined,
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

function buildSystemPrompt(
  config: {
    chatbotNome?: string | null;
    chatbotHorario?: string | null;
    chatbotServicos?: string | null;
    nomeOficina?: string | null;
  },
  customerData: CustomerData | null
) {
  const nome = config.chatbotNome || 'LoopIA';
  const horario = config.chatbotHorario || 'Segunda a Sexta 8h-18h, Sábado 8h-12h';
  const servicos = config.chatbotServicos || 'troca de óleo, filtros, fluidos';
  const oficina = config.nomeOficina || 'nossa oficina';

  // Contexto do cliente
  let contextoCliente = '';
  if (customerData && !customerData.isNewCustomer) {
    contextoCliente = `
## Dados do Cliente (USE para personalizar as respostas)
- Nome: ${customerData.nome}`;

    if (customerData.veiculo) {
      const v = customerData.veiculo;
      contextoCliente += `
- Veículo: ${v.marca} ${v.modelo}${v.ano ? ` ${v.ano}` : ''} (Placa: ${v.placa})`;

      if (v.kmAtual) {
        contextoCliente += `
- KM Atual: ${v.kmAtual.toLocaleString('pt-BR')} km`;

        const proximaTroca = calcularProximaTroca(v.kmAtual, customerData.ultimoServico?.km || null);
        if (proximaTroca) {
          contextoCliente += `
- ${proximaTroca}`;
        }
      }
    }

    if (customerData.ultimoServico) {
      const diasDesdeUltimo = Math.floor(
        (Date.now() - customerData.ultimoServico.data.getTime()) / (1000 * 60 * 60 * 24)
      );
      contextoCliente += `
- Último serviço: ${customerData.ultimoServico.tipo} (há ${diasDesdeUltimo} dias)`;
    }

    if (customerData.historicoServicos.length > 0) {
      contextoCliente += `
- Histórico recente:
  ${customerData.historicoServicos.join('\n  ')}`;
    }
  } else {
    contextoCliente = `
## Cliente Novo
Este cliente ainda não está cadastrado no sistema. Seja acolhedor e convide-o a conhecer a oficina!`;
  }

  return `Você é a ${nome}, assistente virtual inteligente de ${oficina}.

## Sua Personalidade
- Simpática, profissional e objetiva
- Fala de forma natural, como um atendente humano experiente
- Usa emojis ocasionalmente para deixar a conversa leve
- Nunca é robótica ou excessivamente formal

## Suas Capacidades
- Responder sobre serviços: ${servicos}
- Informar horários de funcionamento: ${horario}
- Consultar dados do cliente se disponíveis
- Sugerir agendamentos e lembretes de manutenção
- Tirar dúvidas sobre manutenção preventiva
${contextoCliente}

## Regras de Comportamento
1. SEMPRE use o nome do cliente quando disponível
2. Se o cliente tem veículo cadastrado, mencione o modelo naturalmente
3. Se está perto da km de troca, sugira agendar
4. Seja breve - máximo 2-3 frases por resposta
5. Se não souber algo específico (preços exatos, disponibilidade), sugira entrar em contato
6. NUNCA invente informações
7. Se o cliente parece frustrado, seja empático

## Exemplos de Respostas Personalizadas
- "Oi João! Vi que seu Civic já está com 48.000 km. Está na hora da troca de óleo! Quer agendar?"
- "Bom dia Maria! Faz 4 meses desde a última revisão do seu Corolla. Tudo certo com ele?"
- "Olá! Ainda não te conheço, mas fico feliz em ajudar! Em que posso ser útil?"

## Formato das Respostas
- Use linguagem informal mas profissional
- Quebre linhas para facilitar leitura no WhatsApp
- Emojis são bem-vindos, mas com moderação
`;
}

export async function generateChatResponse(
  userMessage: string,
  phoneNumber: string,
  userName?: string
): Promise<string> {
  try {
    // Buscar configurações do banco
    const config = await prisma.configuracao.findUnique({
      where: { id: 1 },
    });

    // Verificar se chatbot está habilitado
    if (config && config.chatbotEnabled === false) {
      console.log('[CHATBOT] Chatbot desabilitado');
      return ''; // Retorna vazio para não responder
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('[CHATBOT] GEMINI_API_KEY não configurada');
      return 'Desculpe, estou com problemas técnicos no momento. Por favor, ligue para a oficina.';
    }

    // Buscar dados do cliente pelo telefone
    const customerData = await getCustomerData(phoneNumber);

    if (customerData) {
      console.log('[CHATBOT] Cliente encontrado:', customerData.nome);
    } else {
      console.log('[CHATBOT] Cliente novo (não cadastrado)');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Recuperar ou iniciar histórico
    let history = conversationHistory.get(phoneNumber) || [];

    // Limitar histórico a últimas 20 mensagens para economizar tokens
    if (history.length > 20) {
      history = history.slice(-20);
    }

    // Criar chat com histórico
    const chat = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    });

    // Montar mensagem com contexto do usuário
    const nomeCliente = customerData?.nome || userName || 'Cliente';
    const contextMessage = `[${nomeCliente}]: ${userMessage}`;

    // Primeira mensagem inclui o system prompt
    const systemPrompt = buildSystemPrompt(config || {}, customerData);
    const fullMessage = history.length === 0
      ? `${systemPrompt}\n\n--- Início da Conversa ---\n\n${contextMessage}`
      : contextMessage;

    console.log('[CHATBOT] Enviando para Gemini:', fullMessage.substring(0, 150) + '...');

    const result = await chat.sendMessage(fullMessage);
    const response = result.response.text();

    console.log('[CHATBOT] Resposta Gemini:', response.substring(0, 100) + '...');

    // Atualizar histórico
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
}

// Limpar todo o histórico (útil para liberar memória)
export function clearAllHistory() {
  conversationHistory.clear();
}
