import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { SubscriptionStatus } from '@prisma/client';

// Mapeia status do Stripe para nosso enum
function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
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

// POST - Webhook do Stripe
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[STRIPE WEBHOOK] Signature missing');
      return NextResponse.json({ error: 'Signature missing' }, { status: 400 });
    }

    const stripe = getStripe();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error('[STRIPE WEBHOOK] Signature verification failed:', err?.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('[STRIPE WEBHOOK] Evento recebido:', event.type);

    switch (event.type) {
      // Checkout completado - ativar assinatura da empresa existente
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const customerId = session.customer as string;
        const empresaId = session.metadata?.empresaId;
        const paymentType = session.metadata?.paymentType;

        console.log('[STRIPE WEBHOOK] Checkout completed for customer:', customerId, 'empresaId:', empresaId, 'mode:', session.mode, 'paymentType:', paymentType);

        // Pagamento avulso via PIX - ativar por 30 dias
        if (session.mode === 'payment' && paymentType === 'pix_monthly') {
          const eid = empresaId ? parseInt(empresaId) : null;
          let empresa = eid ? await prisma.empresa.findUnique({ where: { id: eid } }) : null;

          if (!empresa) {
            empresa = await prisma.empresa.findFirst({ where: { stripeCustomerId: customerId } });
          }

          if (empresa) {
            const subscriptionEndsAt = new Date();
            subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30);

            await prisma.empresa.update({
              where: { id: empresa.id },
              data: {
                stripeCustomerId: customerId,
                subscriptionStatus: 'ACTIVE',
                subscriptionEndsAt,
              },
            });
            console.log('[STRIPE WEBHOOK] PIX payment - empresa ativada por 30 dias:', empresa.id);
          }
          break;
        }

        // Checkout de subscription normal (cartão/boleto)
        if (!empresaId) {
          // Tentar encontrar pelo stripeCustomerId
          const empresa = await prisma.empresa.findFirst({
            where: { stripeCustomerId: customerId },
          });

          if (empresa) {
            await prisma.empresa.update({
              where: { id: empresa.id },
              data: {
                stripeSubscriptionId: session.subscription as string || null,
                subscriptionStatus: 'ACTIVE',
              },
            });
            console.log('[STRIPE WEBHOOK] Empresa ativada via customerId:', empresa.id);
          } else {
            console.log('[STRIPE WEBHOOK] Empresa não encontrada para customer:', customerId);
          }
        } else {
          await prisma.empresa.update({
            where: { id: parseInt(empresaId) },
            data: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: session.subscription as string || null,
              subscriptionStatus: 'ACTIVE',
            },
          });

          // Atualizar metadata da subscription com o empresaId
          if (session.subscription) {
            await stripe.subscriptions.update(session.subscription as string, {
              metadata: { empresaId },
            });
          }

          console.log('[STRIPE WEBHOOK] Empresa ativada via metadata:', empresaId);
        }

        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const empresaId = subscription.metadata?.empresaId;
        const periodEnd = subscription.current_period_end || subscription.ended_at;

        if (!empresaId) {
          // Tentar encontrar pelo customerId
          const empresa = await prisma.empresa.findFirst({
            where: { stripeCustomerId: subscription.customer as string },
          });

          if (empresa) {
            await prisma.empresa.update({
              where: { id: empresa.id },
              data: {
                stripeSubscriptionId: subscription.id,
                subscriptionStatus: mapStripeStatus(subscription.status),
                subscriptionEndsAt: periodEnd ? new Date(periodEnd * 1000) : null,
              },
            });
            console.log('[STRIPE WEBHOOK] Subscription updated for empresa:', empresa.id);
          }
        } else {
          await prisma.empresa.update({
            where: { id: parseInt(empresaId) },
            data: {
              stripeSubscriptionId: subscription.id,
              subscriptionStatus: mapStripeStatus(subscription.status),
              subscriptionEndsAt: periodEnd ? new Date(periodEnd * 1000) : null,
            },
          });
          console.log('[STRIPE WEBHOOK] Subscription updated for empresaId:', empresaId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Encontrar empresa pelo subscriptionId ou customerId
        const empresa = await prisma.empresa.findFirst({
          where: {
            OR: [
              { stripeSubscriptionId: subscription.id },
              { stripeCustomerId: subscription.customer as string },
            ],
          },
        });

        if (empresa) {
          await prisma.empresa.update({
            where: { id: empresa.id },
            data: {
              subscriptionStatus: 'CANCELED',
              stripeSubscriptionId: null,
            },
          });
          console.log('[STRIPE WEBHOOK] Subscription canceled for empresa:', empresa.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string | null;

        if (subscriptionId) {
          await prisma.empresa.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { subscriptionStatus: 'PAST_DUE' },
          });
          console.log('[STRIPE WEBHOOK] Payment failed, marked as PAST_DUE');
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string | null;

        if (subscriptionId) {
          await prisma.empresa.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { subscriptionStatus: 'ACTIVE' },
          });
          console.log('[STRIPE WEBHOOK] Invoice paid, marked as ACTIVE');
        }
        break;
      }

      // Boleto: pagamento pendente (aguardando pagamento do boleto)
      case 'invoice.payment_action_required': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string | null;
        console.log('[STRIPE WEBHOOK] Payment action required (boleto pendente), subscription:', subscriptionId);
        break;
      }

      default:
        console.log('[STRIPE WEBHOOK] Evento não tratado:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[STRIPE WEBHOOK] Erro:', error?.message);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
