import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe, SUBSCRIPTION_PRICE_ID, APP_URL } from '@/lib/stripe';

// POST - Criar sessão de checkout Stripe
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: session.empresaId },
      include: {
        configuracao: {
          select: { nomeOficina: true },
        },
      },
    });

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    // Criar ou recuperar Stripe Customer
    let customerId = empresa.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.email,
        name: empresa.configuracao?.nomeOficina || empresa.nome,
        metadata: {
          empresaId: empresa.id.toString(),
        },
      });
      customerId = customer.id;

      // Salvar o customerId no banco
      await prisma.empresa.update({
        where: { id: empresa.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Verificar se já teve trial (trialEndsAt preenchido = já usou trial)
    const jaTeveTrial = empresa.trialEndsAt !== null;

    // Criar sessão de checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/assinatura?success=true`,
      cancel_url: `${APP_URL}/assinatura?canceled=true`,
      subscription_data: {
        // Trial de 7 dias APENAS para primeira assinatura
        // Reativação cobra imediatamente
        ...(jaTeveTrial ? {} : { trial_period_days: 7 }),
        metadata: {
          empresaId: empresa.id.toString(),
        },
      },
      locale: 'pt-BR',
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error('[STRIPE CHECKOUT] Erro:', error?.message);
    return NextResponse.json(
      { error: 'Erro ao criar sessão de checkout' },
      { status: 500 }
    );
  }
}
