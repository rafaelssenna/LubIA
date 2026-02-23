import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    return NextResponse.json({
      data: {
        status: empresa.subscriptionStatus,
        subscriptionEndsAt: empresa.subscriptionEndsAt,
        trialEndsAt: empresa.trialEndsAt,
        diasRestantes: diasRestantes && diasRestantes > 0 ? diasRestantes : 0,
        hasStripeCustomer: !!empresa.stripeCustomerId,
        hasSubscription: !!empresa.stripeSubscriptionId,
      },
    });
  } catch (error: any) {
    console.error('[STRIPE STATUS] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar status' }, { status: 500 });
  }
}
