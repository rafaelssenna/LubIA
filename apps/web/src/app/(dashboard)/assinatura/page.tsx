'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { useToast } from '@/components/Toast';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  ExternalLink,
  Sparkles,
  Shield,
  Zap,
} from 'lucide-react';

interface SubscriptionData {
  status: string;
  subscriptionEndsAt: string | null;
  trialEndsAt: string | null;
  diasRestantes: number;
  hasStripeCustomer: boolean;
  hasSubscription: boolean;
}

// Componente que usa useSearchParams (precisa de Suspense)
function AssinaturaContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [processingPortal, setProcessingPortal] = useState(false);

  useEffect(() => {
    // Verificar parâmetros de retorno do Stripe
    if (searchParams.get('success') === 'true') {
      toast.success('Assinatura ativada com sucesso!');
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout cancelado');
    }

    fetchSubscription();
  }, [searchParams]);

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/stripe/status');
      const data = await res.json();
      setSubscription(data.data);
    } catch (error) {
      toast.error('Erro ao carregar assinatura');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    setProcessingCheckout(true);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Erro ao iniciar checkout');
      }
    } catch (error) {
      toast.error('Erro ao iniciar checkout');
    } finally {
      setProcessingCheckout(false);
    }
  };

  const handlePortal = async () => {
    setProcessingPortal(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Erro ao abrir portal');
      }
    } catch (error) {
      toast.error('Erro ao abrir portal');
    } finally {
      setProcessingPortal(false);
    }
  };

  const getStatusDisplay = () => {
    switch (subscription?.status) {
      case 'ACTIVE':
        return {
          icon: CheckCircle,
          color: 'emerald',
          label: 'Ativa',
          description: 'Sua assinatura está ativa e funcionando normalmente.',
        };
      case 'TRIAL':
        return {
          icon: Clock,
          color: 'blue',
          label: 'Período de Teste',
          description: `Você está no período de teste. Restam ${subscription.diasRestantes} dias.`,
        };
      case 'PAST_DUE':
        return {
          icon: AlertTriangle,
          color: 'yellow',
          label: 'Pagamento Pendente',
          description: 'Houve um problema com seu pagamento. Atualize sua forma de pagamento.',
        };
      case 'CANCELED':
        return {
          icon: XCircle,
          color: 'red',
          label: 'Cancelada',
          description: 'Sua assinatura foi cancelada. Reative para continuar usando.',
        };
      case 'UNPAID':
        return {
          icon: XCircle,
          color: 'red',
          label: 'Bloqueada',
          description: 'Sua assinatura está inativa. Ative para continuar usando o sistema.',
        };
      default:
        return {
          icon: XCircle,
          color: 'zinc',
          label: 'Desconhecido',
          description: 'Status desconhecido.',
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="text-muted animate-pulse">Carregando assinatura...</p>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;
  const isBlocked = subscription?.status === 'UNPAID' || subscription?.status === 'CANCELED';
  const isTrialExpired = subscription?.status === 'TRIAL' && subscription.diasRestantes <= 0;

  return (
    <div className="space-y-8">
      <Header title="Assinatura" subtitle="Gerencie seu plano" />

      <div className="px-4 lg:px-8 space-y-8 max-w-4xl mx-auto">
        {/* Alerta de Bloqueio */}
        {(isBlocked || isTrialExpired) && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
            <XCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {isTrialExpired ? 'Período de Teste Expirado' : 'Sistema Bloqueado'}
            </h2>
            <p className="text-muted mb-6 max-w-md mx-auto">
              {isTrialExpired
                ? 'Seu período de teste de 14 dias terminou. Assine agora para continuar usando o sistema.'
                : 'Sua assinatura está inativa. Ative agora para continuar usando todas as funcionalidades.'}
            </p>
            <button
              onClick={handleCheckout}
              disabled={processingCheckout}
              className="px-8 py-4 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-white font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-primary/25"
            >
              {processingCheckout ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={20} />
                  Processando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CreditCard size={20} />
                  Ativar Assinatura
                </span>
              )}
            </button>
          </div>
        )}

        {/* Status Card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 bg-${statusDisplay.color}-500/10 rounded-xl border border-${statusDisplay.color}-500/20`}>
                <StatusIcon size={22} className={`text-${statusDisplay.color}-400`} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Status da Assinatura</h2>
                <p className="text-sm text-muted">{statusDisplay.description}</p>
              </div>
            </div>
            <span className={`px-4 py-2 bg-${statusDisplay.color}-500/10 text-${statusDisplay.color}-400 text-sm font-semibold rounded-xl border border-${statusDisplay.color}-500/20`}>
              {statusDisplay.label}
            </span>
          </div>

          <div className="p-6 space-y-4">
            {subscription?.status === 'TRIAL' && (
              <div className="flex items-center justify-between p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <Clock size={20} className="text-blue-400" />
                  <span className="text-foreground">Dias restantes no teste</span>
                </div>
                <span className="text-2xl font-bold text-blue-400">
                  {subscription.diasRestantes}
                </span>
              </div>
            )}

            {subscription?.status === 'ACTIVE' && subscription.subscriptionEndsAt && (
              <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-emerald-400" />
                  <span className="text-foreground">Próxima renovação</span>
                </div>
                <span className="text-foreground font-semibold">
                  {new Date(subscription.subscriptionEndsAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex flex-wrap gap-4 pt-4">
              {subscription?.status !== 'ACTIVE' && (
                <button
                  onClick={handleCheckout}
                  disabled={processingCheckout}
                  className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary rounded-xl text-white font-semibold transition-all duration-300 shadow-lg shadow-primary/25 disabled:opacity-50"
                >
                  {processingCheckout ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <CreditCard size={20} />
                  )}
                  {subscription?.status === 'ACTIVE' ? 'Alterar Plano' : 'Assinar Agora'}
                </button>
              )}

              {subscription?.hasStripeCustomer && (
                <button
                  onClick={handlePortal}
                  disabled={processingPortal}
                  className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800/50 border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold transition-all disabled:opacity-50"
                >
                  {processingPortal ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <ExternalLink size={20} />
                  )}
                  Gerenciar Assinatura
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Benefícios */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">O que está incluído</h2>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-border">
              <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
                <Sparkles size={20} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Chatbot IA</h3>
              <p className="text-sm text-muted">
                Atendimento automático 24/7 com inteligência artificial
              </p>
            </div>

            <div className="p-4 bg-zinc-900/50 rounded-xl border border-border">
              <div className="p-2 bg-emerald-500/10 rounded-lg w-fit mb-3">
                <Shield size={20} className="text-emerald-400" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Gestão Completa</h3>
              <p className="text-sm text-muted">
                Clientes, veículos, O.S., estoque e financeiro
              </p>
            </div>

            <div className="p-4 bg-zinc-900/50 rounded-xl border border-border">
              <div className="p-2 bg-blue-500/10 rounded-lg w-fit mb-3">
                <Zap size={20} className="text-blue-400" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Lembretes Automáticos</h3>
              <p className="text-sm text-muted">
                Avise clientes sobre trocas de óleo e revisões
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente de loading para o Suspense
function AssinaturaLoading() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
        </div>
        <p className="text-muted animate-pulse">Carregando assinatura...</p>
      </div>
    </div>
  );
}

// Exporta o componente principal envolvido em Suspense
export default function AssinaturaPage() {
  return (
    <Suspense fallback={<AssinaturaLoading />}>
      <AssinaturaContent />
    </Suspense>
  );
}
