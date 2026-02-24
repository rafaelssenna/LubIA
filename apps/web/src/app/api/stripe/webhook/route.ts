import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { SubscriptionStatus } from '@prisma/client';

// Gera slug único a partir do nome da empresa
function generateSlug(nome: string): string {
  const base = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-') // Espaços viram hífen
    .replace(/-+/g, '-') // Remove hífens duplicados
    .slice(0, 30); // Limita tamanho

  // Adiciona sufixo único
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

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
      // NOVO: Cria a conta quando checkout é completado
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const customerId = session.customer as string;

        console.log('[STRIPE WEBHOOK] Checkout completed for customer:', customerId);

        // Buscar dados do customer no Stripe
        const customer = await stripe.customers.retrieve(customerId) as any;

        if (customer.deleted) {
          console.log('[STRIPE WEBHOOK] Customer was deleted, skipping');
          break;
        }

        // Verificar se é um registro pendente
        if (customer.metadata?.pendingRegistration !== 'true') {
          console.log('[STRIPE WEBHOOK] Not a pending registration, skipping account creation');
          break;
        }

        // Extrair dados do metadata
        const {
          adminNome,
          adminEmail,
          senhaHash,
          nomeEmpresa,
          cnpjEmpresa,
          telefoneEmpresa,
          enderecoEmpresa,
        } = customer.metadata;

        // Verificar se todos os dados necessários estão presentes
        if (!adminNome || !adminEmail || !senhaHash || !nomeEmpresa) {
          console.error('[STRIPE WEBHOOK] Missing required metadata for registration');
          break;
        }

        // Verificar se email já existe (dupla verificação)
        const existingUser = await prisma.usuario.findUnique({
          where: { email: adminEmail },
        });

        if (existingUser) {
          console.log('[STRIPE WEBHOOK] User already exists, clearing pending flag');
          // Limpar flag de pending registration
          await stripe.customers.update(customerId, {
            metadata: { pendingRegistration: null },
          });
          break;
        }

        // Calcular data de fim do trial (7 dias)
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);

        // Criar empresa, usuário, configuração e serviços em uma transação
        const result = await prisma.$transaction(async (tx) => {
          // Criar empresa
          const empresa = await tx.empresa.create({
            data: {
              nome: nomeEmpresa,
              slug: generateSlug(nomeEmpresa),
              cnpj: cnpjEmpresa || null,
              telefone: telefoneEmpresa || null,
              endereco: enderecoEmpresa || null,
              stripeCustomerId: customerId,
              stripeSubscriptionId: session.subscription as string || null,
              subscriptionStatus: 'TRIAL',
              trialEndsAt: trialEndsAt,
            },
          });

          // Criar usuário administrador
          const usuario = await tx.usuario.create({
            data: {
              nome: adminNome,
              email: adminEmail,
              senhaHash: senhaHash,
              role: 'ADMIN',
              empresaId: empresa.id,
            },
          });

          // Criar configuração padrão com dados da empresa
          await tx.configuracao.create({
            data: {
              empresaId: empresa.id,
              nomeOficina: nomeEmpresa,
              cnpj: cnpjEmpresa || null,
              telefone: telefoneEmpresa || null,
              endereco: enderecoEmpresa || null,
              lembreteAntecedencia: 7,
            },
          });

          // Criar serviços padrão
          await tx.servico.createMany({
            data: [
              { nome: 'Troca de Óleo', precoBase: 0, categoria: 'TROCA_OLEO', empresaId: empresa.id },
              { nome: 'Filtro de Óleo', precoBase: 0, categoria: 'FILTROS', empresaId: empresa.id },
              { nome: 'Filtro de Ar', precoBase: 0, categoria: 'FILTROS', empresaId: empresa.id },
              { nome: 'Filtro de Combustível', precoBase: 0, categoria: 'FILTROS', empresaId: empresa.id },
              { nome: 'Filtro de Cabine', precoBase: 0, categoria: 'FILTROS', empresaId: empresa.id },
            ],
          });

          return { empresa, usuario };
        });

        console.log('[STRIPE WEBHOOK] Conta criada com sucesso:', {
          empresaId: result.empresa.id,
          usuarioId: result.usuario.id,
          email: adminEmail,
        });

        // Limpar flag de pending registration no Stripe
        await stripe.customers.update(customerId, {
          metadata: {
            pendingRegistration: null,
            adminNome: null,
            adminEmail: null,
            senhaHash: null,
            nomeEmpresa: null,
            cnpjEmpresa: null,
            telefoneEmpresa: null,
            enderecoEmpresa: null,
          },
        });

        // Atualizar metadata da subscription com o empresaId
        if (session.subscription) {
          await stripe.subscriptions.update(session.subscription as string, {
            metadata: { empresaId: result.empresa.id.toString() },
          });
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

      default:
        console.log('[STRIPE WEBHOOK] Evento não tratado:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[STRIPE WEBHOOK] Erro:', error?.message);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
