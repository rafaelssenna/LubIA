import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';
import { SubscriptionStatus } from '@prisma/client';

// Mapeia status do Stripe para nosso enum
function mapStripeStatus(status: string): SubscriptionStatus {
  const mapping: Record<string, SubscriptionStatus> = {
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    unpaid: 'UNPAID',
    trialing: 'TRIAL',
    incomplete: 'UNPAID',
    incomplete_expired: 'UNPAID',
    paused: 'CANCELED',
  };
  return mapping[status] || 'UNPAID';
}

// POST - Sincroniza dados da assinatura do Stripe
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: session.empresaId },
    });

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    if (!empresa.stripeCustomerId) {
      return NextResponse.json({
        error: 'Empresa não tem customerId do Stripe',
        debug: { stripeCustomerId: null, stripeSubscriptionId: empresa.stripeSubscriptionId }
      }, { status: 400 });
    }

    const stripe = getStripe();

    // Buscar assinaturas do customer no Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: empresa.stripeCustomerId,
      status: 'all',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({
        message: 'Nenhuma assinatura encontrada no Stripe',
        debug: {
          stripeCustomerId: empresa.stripeCustomerId,
          subscriptionsFound: 0
        }
      });
    }

    const subscription = subscriptions.data[0];
    const periodEnd = subscription.current_period_end || subscription.trial_end;

    // Atualizar dados no banco
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: {
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: mapStripeStatus(subscription.status),
        subscriptionEndsAt: periodEnd ? new Date(periodEnd * 1000) : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Dados sincronizados com sucesso',
      data: {
        subscriptionId: subscription.id,
        status: subscription.status,
        mappedStatus: mapStripeStatus(subscription.status),
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      }
    });
  } catch (error: any) {
    console.error('[STRIPE SYNC] Erro:', error?.message);
    return NextResponse.json({
      error: 'Erro ao sincronizar',
      details: error?.message
    }, { status: 500 });
  }
}
