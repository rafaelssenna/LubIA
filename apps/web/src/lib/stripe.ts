import Stripe from 'stripe';

// Inicializa o cliente Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ID do preço da assinatura mensal (configurar no Stripe Dashboard)
export const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID!;

// Período de trial em dias (0 para desabilitar)
export const TRIAL_DAYS = 14;

// URL base da aplicação
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
