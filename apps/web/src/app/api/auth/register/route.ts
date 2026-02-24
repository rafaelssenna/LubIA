import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { getStripe, SUBSCRIPTION_PRICE_ID, APP_URL } from '@/lib/stripe';

// POST - Inicia cadastro (conta só é criada após checkout no webhook)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, email, senha, nomeEmpresa, cnpjEmpresa, telefoneEmpresa, enderecoEmpresa } = body;

    // Validações básicas
    if (!nome || !email || !senha || !nomeEmpresa || !cnpjEmpresa || !telefoneEmpresa || !enderecoEmpresa) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    if (senha.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Verificar se Stripe está configurado
    if (!SUBSCRIPTION_PRICE_ID) {
      console.error('[REGISTER] STRIPE_PRICE_ID não configurado');
      return NextResponse.json(
        { error: 'Sistema de pagamento não configurado. Contate o suporte.' },
        { status: 500 }
      );
    }

    // Verificar se email já existe
    const existingUser = await prisma.usuario.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado' },
        { status: 400 }
      );
    }

    // Hash da senha para guardar nos metadados (será usada pelo webhook)
    const senhaHash = await hashPassword(senha);

    // Criar Stripe Customer com todos os dados nos metadados
    // A conta só será criada no banco após checkout completado (via webhook)
    const stripe = getStripe();

    const customer = await stripe.customers.create({
      email,
      name: nomeEmpresa,
      phone: telefoneEmpresa,
      metadata: {
        // Dados para criar a conta após checkout
        pendingRegistration: 'true',
        adminNome: nome,
        adminEmail: email,
        senhaHash: senhaHash,
        nomeEmpresa: nomeEmpresa,
        cnpjEmpresa: cnpjEmpresa,
        telefoneEmpresa: telefoneEmpresa,
        enderecoEmpresa: enderecoEmpresa,
      },
    });

    // Criar sessão de checkout com 7 dias de trial
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      line_items: [
        {
          price: SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/login?registered=true`,
      cancel_url: `${APP_URL}/cadastro?canceled=true`,
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          customerId: customer.id,
        },
      },
      locale: 'pt-BR',
      allow_promotion_codes: true,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
    });
  } catch (error: any) {
    console.error('[REGISTER] Erro:', error?.message);
    return NextResponse.json(
      { error: 'Erro ao iniciar cadastro. Tente novamente.' },
      { status: 500 }
    );
  }
}
