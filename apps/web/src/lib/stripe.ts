import Stripe from 'stripe';

// Cliente Stripe (lazy initialization para evitar erro no build time)
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY não está configurada');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// Alias para compatibilidade
export const stripe = {
  get checkout() { return getStripe().checkout; },
  get customers() { return getStripe().customers; },
  get subscriptions() { return getStripe().subscriptions; },
  get billingPortal() { return getStripe().billingPortal; },
  get webhooks() { return getStripe().webhooks; },
};

// ID do preço da assinatura mensal (configurar no Stripe Dashboard)
export const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID || '';

// Período de trial em dias (0 para desabilitar)
export const TRIAL_DAYS = 7;

// URL base da aplicação
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
