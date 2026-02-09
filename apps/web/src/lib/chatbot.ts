import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `Você é a LubIA, assistente virtual de uma oficina de troca de óleo e serviços automotivos.

Suas funções são:
- Responder dúvidas sobre serviços (troca de óleo, filtros, fluidos, etc.)
- Informar sobre agendamentos e horários
- Tirar dúvidas sobre manutenção preventiva de veículos
- Ser cordial e profissional

Regras:
- Seja breve e direto nas respostas (máximo 2-3 frases quando possível)
- Use linguagem informal mas profissional
- Se não souber algo específico, sugira que o cliente entre em contato pelo telefone
- Não invente preços ou informações que não tenha certeza
- Sempre seja educado e prestativo

Contexto da oficina:
- Trabalhamos com troca de óleo, filtros, fluidos de freio, arrefecimento, direção hidráulica
- Atendemos carros, motos e utilitários leves
- Horário de funcionamento: Segunda a Sexta 8h-18h, Sábado 8h-12h
`;

// Histórico de conversas por número (cache simples em memória)
const conversationHistory: Map<string, { role: string; parts: { text: string }[] }[]> = new Map();

export async function generateChatResponse(
  userMessage: string,
  phoneNumber: string,
  userName?: string
): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('[CHATBOT] GEMINI_API_KEY não configurada');
      return 'Desculpe, estou com problemas técnicos no momento. Por favor, ligue para a oficina.';
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Recuperar ou iniciar histórico
    let history = conversationHistory.get(phoneNumber) || [];

    // Limitar histórico a últimas 10 mensagens para economizar tokens
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
    const contextMessage = userName
      ? `[Cliente: ${userName}] ${userMessage}`
      : userMessage;

    // Primeira mensagem inclui o system prompt
    const fullMessage = history.length === 0
      ? `${SYSTEM_PROMPT}\n\nMensagem do cliente:\n${contextMessage}`
      : contextMessage;

    console.log('[CHATBOT] Enviando para Gemini:', fullMessage.substring(0, 100) + '...');

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
