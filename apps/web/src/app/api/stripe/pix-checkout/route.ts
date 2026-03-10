import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe, SUBSCRIPTION_PRICE_ID, APP_URL } from '@/lib/stripe';

// POST - Criar sessão de pagamento avulso via PIX (1 mês)
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

      await prisma.empresa.update({
        where: { id: empresa.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Buscar o preço da assinatura para usar o mesmo valor
    const stripeInstance = stripe;
    const price = await stripeInstance.prices.retrieve(SUBSCRIPTION_PRICE_ID);
    const amount = price.unit_amount;

    if (!amount) {
      return NextResponse.json({ error: 'Preço não configurado' }, { status: 500 });
    }

    // Criar sessão de checkout com PIX (pagamento avulso - 1 mês)
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['pix'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            unit_amount: amount,
            product_data: {
              name: 'LoopIA - Mensalidade (1 mês)',
              description: 'Pagamento via PIX - acesso por 30 dias',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/assinatura?success=true&pix=true`,
      cancel_url: `${APP_URL}/assinatura?canceled=true`,
      metadata: {
        empresaId: empresa.id.toString(),
        paymentType: 'pix_monthly',
      },
      payment_intent_data: {
        metadata: {
          empresaId: empresa.id.toString(),
          paymentType: 'pix_monthly',
        },
      },
      locale: 'pt-BR',
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error('[STRIPE PIX CHECKOUT] Erro:', error?.message, error?.type, error?.code);
    return NextResponse.json(
      { error: 'Erro ao criar sessão de checkout PIX', _debug: error?.message },
      { status: 500 }
    );
  }
}
