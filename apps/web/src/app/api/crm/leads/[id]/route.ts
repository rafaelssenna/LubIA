import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getConversationById, parseMessages } from '@/lib/crmDatabase';
import { classifyLead, getScoreLabel } from '@/lib/leadClassifier';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !session.isSuperAdmin) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const conversa = await getConversationById(id);

    if (!conversa) {
      return NextResponse.json({ error: 'Lead nao encontrado' }, { status: 404 });
    }

    const messages = parseMessages(conversa.messages_history);

    // Classificar via IA (blocking - detail view merece precisão)
    const classification = await classifyLead(messages, conversa.name || conversa.whatsapp_name);
    const scoreLabel = getScoreLabel(classification.score);

    return NextResponse.json({
      success: true,
      data: {
        id: conversa.id,
        phone: conversa.phone,
        name: conversa.name || conversa.whatsapp_name || null,
        messages: messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        messageCount: conversa.message_count,
        score: classification.score,
        scoreLabel,
        confidence: classification.confidence,
        reasons: classification.reasons,
        suggestedAction: classification.suggestedAction,
        activated: conversa.activated,
        demoScheduled: conversa.demo_scheduled,
        followUpStep: conversa.follow_up_step,
        agentId: conversa.agent_id,
        adminLocked: conversa.admin_locked,
        lastMessageAt: conversa.last_message_at,
        createdAt: conversa.created_at,
      },
    });
  } catch (error: any) {
    console.error('[CRM] Erro ao buscar lead:', error?.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
