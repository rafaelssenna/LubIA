import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getConversationById, parseMessages } from '@/lib/crmDatabase';
import { classifyLead, getScoreLabel } from '@/lib/leadClassifier';

export async function POST(
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
    const classification = await classifyLead(messages, conversa.name || conversa.whatsapp_name);
    const scoreLabel = getScoreLabel(classification.score);

    return NextResponse.json({
      success: true,
      data: {
        id: conversa.id,
        score: classification.score,
        scoreLabel,
        confidence: classification.confidence,
        reasons: classification.reasons,
        suggestedAction: classification.suggestedAction,
      },
    });
  } catch (error: any) {
    console.error('[CRM] Erro ao reclassificar:', error?.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
