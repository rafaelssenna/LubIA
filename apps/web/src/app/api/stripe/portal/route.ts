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
    console.error('[STRIPE PORTAL] Erro:', error?.message);
    return NextResponse.json(
      { error: 'Erro ao abrir portal' },
      { status: 500 }
    );
  }
}
