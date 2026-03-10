import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CrmMessage } from './crmDatabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ─── Tipos ───

export interface LeadClassification {
  score: 'qualified' | 'interested' | 'new_lead';
  confidence: number;       // 0-100
  reasons: string[];
  suggestedAction: string;
}

export interface LeadScoreLabel {
  label: string;
  emoji: string;
  color: string;
}

// ─── Labels ───

export function getScoreLabel(score: string | null): LeadScoreLabel {
  switch (score) {
    case 'qualified':
      return { label: 'Qualificado', emoji: '🟢', color: 'green' };
    case 'interested':
      return { label: 'Interessado', emoji: '🟡', color: 'yellow' };
    case 'new_lead':
      return { label: 'Novo Lead', emoji: '🔵', color: 'blue' };
    default:
      return { label: 'Sem classificação', emoji: '⚪', color: 'gray' };
  }
}

// ─── Classificacao por IA ───

export async function classifyLead(
  mensagens: CrmMessage[],
  nomeCliente: string | null,
): Promise<LeadClassification> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Limita historico
  let sliced = mensagens;
  if (mensagens.length > 30) {
    sliced = [...mensagens.slice(0, 5), ...mensagens.slice(-25)];
  }

  const conversa = sliced
    .map(m => `${m.role === 'user' ? 'Cliente' : 'Atendente'}: ${m.content}`)
    .join('\n');

  const nome = nomeCliente || 'Nao informado';

  try {
    const result = await Promise.race([
      model.generateContent([
        {
          text: `Analise esta conversa de prospecção comercial (venda de sistema/software) e classifique o lead.

Nome do cliente: ${nome}

Conversa:
${conversa}

Classifique retornando APENAS um JSON valido (sem markdown, sem explicacao):
{
  "score": "qualified" | "interested" | "new_lead",
  "confidence": <numero de 0 a 100>,
  "reasons": ["razao 1", "razao 2"],
  "suggestedAction": "acao sugerida"
}

Criterios:
- "qualified": Cliente agendou demo, pediu proposta, confirmou interesse em contratar, perguntou sobre precos/planos, deu dados de contato. Confianca >= 70.
- "interested": Cliente fez perguntas sobre o sistema, demonstrou curiosidade, pediu mais informacoes, mas nao tomou acao concreta. Confianca 40-69.
- "new_lead": Apenas saudacao, poucas mensagens, respostas vagas, nao demonstrou interesse claro, ou nao respondeu os follow-ups. Confianca < 40.

Responda APENAS o JSON.`,
        },
      ]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout classificacao')), 30000)
      ),
    ]);

    const text = result.response.text().trim();
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const parsed = JSON.parse(cleaned) as LeadClassification;

    const validScores = ['qualified', 'interested', 'new_lead'] as const;
    if (!validScores.includes(parsed.score as any)) parsed.score = 'new_lead';
    parsed.confidence = Math.max(0, Math.min(100, Math.round(parsed.confidence || 0)));
    if (!Array.isArray(parsed.reasons)) parsed.reasons = [];
    if (typeof parsed.suggestedAction !== 'string') parsed.suggestedAction = '';

    return parsed;
  } catch (error) {
    console.error('[CRM] Erro ao classificar lead via IA:', error);
    return classifyByKeywords(mensagens);
  }
}

// ─── Fallback por palavras-chave ───

function classifyByKeywords(mensagens: CrmMessage[]): LeadClassification {
  const textoCliente = mensagens
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' ')
    .toLowerCase();

  const qualifiedKw = [
    'quero agendar', 'pode agendar', 'vamos marcar', 'demo',
    'quanto custa', 'qual o valor', 'plano', 'contratar',
    'proposta', 'fechar', 'pode ser', 'combinado', 'preco',
    'tenho interesse', 'quero comecar', 'assinar',
  ];

  const interestedKw = [
    'como funciona', 'me explica', 'quero saber', 'interessado',
    'mais informacoes', 'o que vocês fazem', 'sistema', 'software',
    'beneficios', 'vantagens', 'diferencial',
  ];

  const qHits = qualifiedKw.filter(k => textoCliente.includes(k)).length;
  const iHits = interestedKw.filter(k => textoCliente.includes(k)).length;

  if (qHits >= 2) {
    return {
      score: 'qualified',
      confidence: Math.min(90, 50 + qHits * 10),
      reasons: ['Classificacao por palavras-chave (fallback)', `${qHits} termos de compra detectados`],
      suggestedAction: 'Entrar em contato para fechar proposta',
    };
  }

  if (iHits >= 1 || qHits === 1) {
    return {
      score: 'interested',
      confidence: Math.min(65, 30 + iHits * 10 + qHits * 15),
      reasons: ['Classificacao por palavras-chave (fallback)', `${iHits} termos de interesse detectados`],
      suggestedAction: 'Continuar nutrindo o lead',
    };
  }

  return {
    score: 'new_lead',
    confidence: 20,
    reasons: ['Classificacao por palavras-chave (fallback)', 'Poucas interacoes ou sem termos relevantes'],
    suggestedAction: 'Aguardar mais interacoes ou enviar follow-up',
  };
}

// ─── Classificar por dados da conversa (sem banco - tudo in-memory) ───

export function classifyFromConversation(
  messages: CrmMessage[],
  demoScheduled: boolean,
  activated: boolean,
  messageCount: number,
): LeadClassification {
  // Se agendou demo, é qualificado
  if (demoScheduled) {
    return {
      score: 'qualified',
      confidence: 95,
      reasons: ['Cliente agendou demonstracao'],
      suggestedAction: 'Confirmar presenca na demo',
    };
  }

  // Se tem muitas mensagens e está ativo, possivelmente interessado
  if (activated && messageCount >= 5) {
    // Verificar se há sinais de interesse nas mensagens do cliente
    const clientMsgs = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase()).join(' ');
    const hasInterest = ['interesse', 'quero', 'como funciona', 'valor', 'preco', 'plano', 'agendar', 'demo'].some(k => clientMsgs.includes(k));
    if (hasInterest) {
      return {
        score: 'interested',
        confidence: 60,
        reasons: ['Conversa ativa com sinais de interesse', `${messageCount} mensagens trocadas`],
        suggestedAction: 'Propor agendamento de demonstracao',
      };
    }
  }

  // Default
  return {
    score: 'new_lead',
    confidence: 20,
    reasons: [messageCount <= 2 ? 'Poucas interacoes' : 'Sem sinais claros de interesse'],
    suggestedAction: messageCount <= 2 ? 'Enviar follow-up' : 'Tentar nova abordagem',
  };
}
