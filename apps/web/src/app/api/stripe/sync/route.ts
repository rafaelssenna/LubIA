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

    const stripe = getStripe();
    let customerId = empresa.stripeCustomerId;

    // Se não tem customerId, buscar pelo email
    if (!customerId) {
      console.log('[STRIPE SYNC] Buscando customer pelo email:', session.email);

      const customers = await stripe.customers.list({
        email: session.email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log('[STRIPE SYNC] Customer encontrado:', customerId);

        // Salvar o customerId
        await prisma.empresa.update({
          where: { id: empresa.id },
          data: { stripeCustomerId: customerId },
        });
      } else {
        return NextResponse.json({
          error: 'Nenhum cliente encontrado no Stripe com esse email',
          debug: { email: session.email }
        }, { status: 404 });
      }
    }

    // Buscar assinaturas do customer no Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Customer sincronizado, mas sem assinatura ativa',
        debug: {
          stripeCustomerId: customerId,
          subscriptionsFound: 0
        }
      });
    }

    const subscription = subscriptions.data[0] as any;
    const periodEnd = subscription.current_period_end || subscription.trial_end;

    // Atualizar dados no banco
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: mapStripeStatus(subscription.status),
        subscriptionEndsAt: periodEnd ? new Date(periodEnd * 1000) : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Dados sincronizados com sucesso',
      data: {
        customerId: customerId,
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
