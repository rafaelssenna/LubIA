import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe, APP_URL } from '@/lib/stripe';

// POST - Criar sessão do portal do cliente Stripe
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: session.empresaId },
      select: { stripeCustomerId: true },
    });

    if (!empresa?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'Nenhuma assinatura encontrada' },
        { status: 400 }
      );
    }

    // Criar sessão do portal
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: empresa.stripeCustomerId,
      return_url: `${APP_URL}/assinatura`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('[STRIPE PORTAL] Erro:', error?.type, error?.message);

    // Stripe error - billing portal not configured
    if (error?.type === 'StripeInvalidRequestError' && error?.message?.includes('portal')) {
      return NextResponse.json(
        { error: 'Portal do Stripe não configurado. Configure em: https://dashboard.stripe.com/settings/billing/portal' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'Erro ao abrir portal' },
      { status: 500 }
    );
  }
}
