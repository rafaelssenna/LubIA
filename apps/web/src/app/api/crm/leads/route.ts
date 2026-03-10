import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getConversations, parseMessages } from '@/lib/crmDatabase';
import { classifyFromConversation, getScoreLabel } from '@/lib/leadClassifier';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !session.isSuperAdmin) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search') || '';
    const scoreFilter = searchParams.get('score') || 'all';

    // Filtro de score agora é aplicado no SQL (não mais client-side)
    const { conversations, total } = await getConversations({
      page, limit, search,
      scoreFilter: scoreFilter !== 'all' ? scoreFilter : undefined,
    });

    // Classificar cada conversa
    const data = conversations.map(c => {
      const messages = parseMessages(c.messages_history);
      const classification = classifyFromConversation(messages, c.demo_scheduled, c.activated, c.message_count);
      const scoreLabel = getScoreLabel(classification.score);
      const lastClientMsg = [...messages].reverse().find(m => m.role === 'user');

      return {
        id: c.id,
        phone: c.phone,
        name: c.name || c.whatsapp_name || null,
        lastMessage: lastClientMsg?.content?.substring(0, 100) || null,
        lastMessageAt: c.last_message_at,
        messageCount: c.message_count,
        score: classification.score,
        scoreLabel,
        confidence: classification.confidence,
        reasons: classification.reasons,
        suggestedAction: classification.suggestedAction,
        activated: c.activated,
        demoScheduled: c.demo_scheduled,
        followUpStep: c.follow_up_step,
        agentId: c.agent_id,
        adminLocked: c.admin_locked,
        createdAt: c.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error: any) {
    console.error('[CRM] Erro ao listar leads:', error?.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
