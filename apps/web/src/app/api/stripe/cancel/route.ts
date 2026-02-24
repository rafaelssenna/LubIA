import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars'
);
const COOKIE_NAME = 'lubia-session';

// POST - Cancela a assinatura no fim do período
export async function POST() {
  try {
    // Verificar autenticação
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const empresaId = (payload as any).empresaId as number;

    // Buscar empresa
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        stripeSubscriptionId: true,
        subscriptionStatus: true,
      },
    });

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    if (!empresa.stripeSubscriptionId) {
      return NextResponse.json({ error: 'Nenhuma assinatura encontrada' }, { status: 400 });
    }

    // Cancelar no Stripe (ao fim do período)
    const stripe = getStripe();
    await stripe.subscriptions.update(empresa.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    console.log('[STRIPE CANCEL] Assinatura marcada para cancelamento:', empresa.stripeSubscriptionId);

    return NextResponse.json({
      success: true,
      message: 'Assinatura será cancelada ao fim do período',
    });
  } catch (error: any) {
    console.error('[STRIPE CANCEL] Erro:', error?.message);
    return NextResponse.json(
      { error: 'Erro ao cancelar assinatura' },
      { status: 500 }
    );
  }
}
