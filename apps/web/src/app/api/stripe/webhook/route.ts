import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
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

      default:
        console.log('[STRIPE WEBHOOK] Evento não tratado:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[STRIPE WEBHOOK] Erro:', error?.message);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
