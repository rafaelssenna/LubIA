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
          { expand: ['default_payment_method', 'customer'] }
        ) as any;

        console.log('[STRIPE STATUS] Subscription data:', JSON.stringify({
          id: subscription.id,
          status: subscription.status,
          current_period_end: subscription.current_period_end,
          items: subscription.items?.data?.length,
          default_payment_method: subscription.default_payment_method ? 'exists' : 'null',
        }));

        // Data da próxima cobrança
        const periodEnd = subscription.current_period_end || subscription.trial_end;
        stripeDetails.nextBillingDate = periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null;
        stripeDetails.cancelAtPeriodEnd = subscription.cancel_at_period_end || false;

        // Pegar valor da assinatura
        if (subscription.items?.data?.length > 0) {
          const item = subscription.items.data[0];
          stripeDetails.amount = item.price?.unit_amount || null;
          stripeDetails.currency = item.price?.currency || null;
        }

        // Pegar método de pagamento - tentar várias fontes
        let pm = subscription.default_payment_method;

        // Se não tiver na subscription, tentar pegar do customer
        if (!pm && empresa.stripeCustomerId) {
          try {
            const customer = await stripe.customers.retrieve(empresa.stripeCustomerId, {
              expand: ['default_source', 'invoice_settings.default_payment_method'],
            }) as any;

            pm = customer.invoice_settings?.default_payment_method;

            // Se ainda não tiver, tentar listar payment methods
            if (!pm) {
              const paymentMethods = await stripe.paymentMethods.list({
                customer: empresa.stripeCustomerId,
                type: 'card',
                limit: 1,
              });
              if (paymentMethods.data.length > 0) {
                pm = paymentMethods.data[0];
              }
            }
          } catch (e) {
            console.error('[STRIPE STATUS] Erro ao buscar PM do customer:', e);
          }
        }

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
