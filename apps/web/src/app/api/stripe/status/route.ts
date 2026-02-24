import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';

// GET - Retorna status da assinatura da empresa
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: session.empresaId },
      select: {
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        trialEndsAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    // Calcular dias restantes
    let diasRestantes: number | null = null;

    if (empresa.subscriptionStatus === 'TRIAL' && empresa.trialEndsAt) {
      diasRestantes = Math.ceil(
        (empresa.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
    } else if (empresa.subscriptionStatus === 'ACTIVE' && empresa.subscriptionEndsAt) {
      diasRestantes = Math.ceil(
        (empresa.subscriptionEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
    }

    // Buscar informações detalhadas do Stripe
    let stripeDetails: {
      nextBillingDate: string | null;
      amount: number | null;
      currency: string | null;
      paymentMethod: {
        brand: string | null;
        last4: string | null;
      } | null;
      cancelAtPeriodEnd: boolean;
    } = {
      nextBillingDate: null,
      amount: null,
      currency: null,
      paymentMethod: null,
      cancelAtPeriodEnd: false,
    };

    if (empresa.stripeSubscriptionId) {
      try {
        const stripe = getStripe();
        const subscription = await stripe.subscriptions.retrieve(
          empresa.stripeSubscriptionId,
          { expand: ['default_payment_method'] }
        ) as any;

        stripeDetails.nextBillingDate = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;
        stripeDetails.cancelAtPeriodEnd = subscription.cancel_at_period_end || false;

        // Pegar valor da assinatura
        if (subscription.items?.data?.length > 0) {
          const item = subscription.items.data[0];
          stripeDetails.amount = item.price?.unit_amount || null;
          stripeDetails.currency = item.price?.currency || null;
        }

        // Pegar método de pagamento
        const pm = subscription.default_payment_method;
        if (pm && typeof pm !== 'string' && pm.card) {
          stripeDetails.paymentMethod = {
            brand: pm.card.brand,
            last4: pm.card.last4,
          };
        }
      } catch (stripeError: any) {
        console.error('[STRIPE STATUS] Erro ao buscar detalhes:', stripeError?.message);
      }
    }

    return NextResponse.json({
      data: {
        status: empresa.subscriptionStatus,
        subscriptionEndsAt: empresa.subscriptionEndsAt,
        trialEndsAt: empresa.trialEndsAt,
        diasRestantes: diasRestantes && diasRestantes > 0 ? diasRestantes : 0,
        hasStripeCustomer: !!empresa.stripeCustomerId,
        hasSubscription: !!empresa.stripeSubscriptionId,
        ...stripeDetails,
      },
    });
  } catch (error: any) {
    console.error('[STRIPE STATUS] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar status' }, { status: 500 });
  }
}
