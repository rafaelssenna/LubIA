'use client';

import Header from '@/components/Header';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Car,
  Users,
  ClipboardList,
  DollarSign,
  Clock,
  CheckCircle,
  Wrench,
  Calendar,
  Plus,
  ArrowRight,
  Loader2,
  Play,
  Pause,
  XCircle,
  Truck,
  TrendingUp,
  Zap,
  ShoppingCart,
  AlertCircle,
  Package,
  Bell,
  MessageCircle,
} from 'lucide-react';

interface DashboardStats {
  clientes: number;
  veiculos: number;
  ordensMes: number;
  faturamento: number;
}

interface ServicoHoje {
  id: number;
  numero: string;
  hora: string;
  cliente: string;
  veiculo: string;
  placa: string;
  servico: string;
  status: string;
  formaPagamento: string | null;
  total: number;
}

interface VendaHoje {
  id: number;
  numero: string;
  cliente: string;
  hora: string;
  total: number;
  pago: boolean;
  formaPagamento: string | null;
  itensCount: number;
}

interface VendasHojeData {
  itens: VendaHoje[];
  total: number;
  totalPago: number;
  count: number;
}

interface PendenciaAReceber {
  id: number;
  tipo: 'ORDEM' | 'VENDA';
  numero: string;
  cliente: string;
  total: number;
  dataPagamentoPrevista: string | null;
}

interface AReceberData {
  itens: PendenciaAReceber[];
  total: number;
  count: number;
}

interface LembreteItem {
  id: number;
  tipo: string;
  cliente: string;
  telefone: string | null;
  veiculo: string;
  placa: string;
  kmLembrete: number | null;
  diasRestantes: number;
  urgencia: 'vencido' | 'alta' | 'media' | 'baixa';
}

interface LembretesData {
  itens: LembreteItem[];
  count: number;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'EM_ANDAMENTO':
      return { label: 'Em Andamento', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', icon: Play };
    case 'AGUARDANDO_PECAS':
      return { label: 'Aguardando', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', icon: Pause };
    case 'CONCLUIDO':
      return { label: 'Concluído', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: CheckCircle };
    case 'ENTREGUE':
      return { label: 'Entregue', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', icon: Truck };
    case 'CANCELADO':
      return { label: 'Cancelado', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', icon: XCircle };
    case 'AGENDADO':
    default:
      return { label: 'Agendado', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', icon: Calendar };
  }
};

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatFormaPagamento = (forma: string | null) => {
  if (!forma) return null;
  const labels: Record<string, string> = {
    DINHEIRO: 'Dinheiro',
    PIX: 'PIX',
    CREDITO: 'Crédito',
    DEBITO: 'Débito',
  };
  return labels[forma] || forma;
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [servicosHoje, setServicosHoje] = useState<ServicoHoje[]>([]);
  const [vendasHoje, setVendasHoje] = useState<VendasHojeData | null>(null);
  const [aReceber, setAReceber] = useState<AReceberData | null>(null);
  const [lembretes, setLembretes] = useState<LembretesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        setStats(data.stats);
        setServicosHoje(data.servicosHoje || []);
        setVendasHoje(data.vendasHoje || null);
        setAReceber(data.aReceber || null);
        setLembretes(data.lembretes || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isVencido = (data: string | null) => {
    if (!data) return false;
    return new Date(data) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="text-muted animate-pulse">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Header title="Dashboard" subtitle="Visao geral da oficina" />

      <div className="px-4 lg:px-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-8">
          {/* Clientes */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-2xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
                <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">Clientes</span>
              </div>
              <p className="text-4xl font-bold text-foreground mb-1">{stats?.clientes || 0}</p>
              <p className="text-sm text-muted">cadastrados</p>
            </div>
          </div>

          {/* Veículos */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <Car className="h-6 w-6 text-purple-400" />
                </div>
                <span className="text-xs font-medium text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">Veiculos</span>
              </div>
              <p className="text-4xl font-bold text-foreground mb-1">{stats?.veiculos || 0}</p>
              <p className="text-sm text-muted">registrados</p>
            </div>
          </div>

          {/* O.S. do Mês */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-2xl p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl">
                  <ClipboardList className="h-6 w-6 text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">O.S. Mes</span>
              </div>
              <p className="text-4xl font-bold text-foreground mb-1">{stats?.ordensMes || 0}</p>
              <p className="text-sm text-muted">ordens de servico</p>
            </div>
          </div>

          {/* Faturamento */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-amber-500/20 to-amber-500/5 rounded-2xl p-6 border border-amber-500/20 hover:border-amber-500/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-500/20 rounded-xl">
                  <DollarSign className="h-6 w-6 text-amber-400" />
                </div>
                <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">Faturamento</span>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{formatCurrency(stats?.faturamento || 0)}</p>
              <p className="text-sm text-muted">este mes</p>
            </div>
          </div>
        </div>

        {/* Grid de 3 colunas: Serviços, Vendas, Crédito Pessoal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Serviços de Hoje */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-400" />
                  Servicos de Hoje
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  {servicosHoje.length} agendamento{servicosHoje.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Link
                href="/ordens"
                className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-all"
                title="Nova O.S."
              >
                <Plus className="h-5 w-5" />
              </Link>
            </div>

            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              {servicosHoje.length === 0 ? (
                <div className="p-8 text-center">
                  <Calendar className="h-8 w-8 text-muted mx-auto mb-2" />
                  <p className="text-sm text-foreground-muted">Nenhum servico hoje</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {servicosHoje.map((servico) => {
                    const statusCfg = getStatusConfig(servico.status);
                    const StatusIcon = statusCfg.icon;
                    return (
                      <Link
                        key={servico.id}
                        href={`/ordens?detail=${servico.id}`}
                        className="block p-3 hover:bg-zinc-800/30 transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-center min-w-[50px] py-2 bg-background-secondary rounded-lg border border-border/50 group-hover:border-emerald-500/50 transition-all">
                            <p className="text-sm font-bold text-foreground">{servico.hora}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">{servico.cliente}</p>
                            <p className="text-xs text-foreground-muted truncate">{servico.placa}</p>
                          </div>
                          <span className={`p-1.5 rounded-lg ${statusCfg.bg}`}>
                            <StatusIcon className={`h-4 w-4 ${statusCfg.text}`} />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border bg-background">
              <Link
                href="/ordens"
                className="flex items-center justify-center gap-2 text-xs text-muted hover:text-emerald-400 transition-colors"
              >
                Ver todas as O.S.
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Vendas de Hoje */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-blue-400" />
                  Vendas de Hoje
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  {vendasHoje?.count || 0} venda{(vendasHoje?.count || 0) !== 1 ? 's' : ''} - {formatCurrency(vendasHoje?.total || 0)}
                </p>
              </div>
              <Link
                href="/vendas-rapidas"
                className="p-2 bg-blue-500/10 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-all"
                title="Nova Venda"
              >
                <Plus className="h-5 w-5" />
              </Link>
            </div>

            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              {!vendasHoje || vendasHoje.itens.length === 0 ? (
                <div className="p-8 text-center">
                  <ShoppingCart className="h-8 w-8 text-muted mx-auto mb-2" />
                  <p className="text-sm text-foreground-muted">Nenhuma venda hoje</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {vendasHoje.itens.map((venda) => (
                    <Link
                      key={venda.id}
                      href={`/vendas-rapidas`}
                      className="block p-3 hover:bg-zinc-800/30 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-center min-w-[50px] py-2 bg-background-secondary rounded-lg border border-border/50 group-hover:border-blue-500/50 transition-all">
                          <p className="text-sm font-bold text-foreground">{venda.hora}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{venda.cliente}</p>
                          <p className="text-xs text-foreground-muted">{venda.itensCount} {venda.itensCount === 1 ? 'item' : 'itens'}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${venda.pago ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {formatCurrency(venda.total)}
                          </p>
                          {!venda.pago && (
                            <p className="text-xs text-amber-400">A receber</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border bg-background">
              <Link
                href="/vendas-rapidas"
                className="flex items-center justify-center gap-2 text-xs text-muted hover:text-blue-400 transition-colors"
              >
                Ver todas as vendas
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Crédito Pessoal */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-400" />
                  Crédito Pessoal
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  {aReceber?.count || 0} pendencia{(aReceber?.count || 0) !== 1 ? 's' : ''} - {formatCurrency(aReceber?.total || 0)}
                </p>
              </div>
              <Link
                href="/a-receber"
                className="p-2 bg-amber-500/10 rounded-lg text-amber-400 hover:bg-amber-500/20 transition-all"
                title="Ver Pendências"
              >
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              {!aReceber || aReceber.itens.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm text-foreground-muted">Nenhuma pendencia!</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {aReceber.itens.map((pendencia) => (
                    <Link
                      key={`${pendencia.tipo}-${pendencia.id}`}
                      href={`/a-receber`}
                      className="block p-3 hover:bg-zinc-800/30 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${pendencia.tipo === 'ORDEM' ? 'bg-purple-500/10' : 'bg-blue-500/10'}`}>
                          {pendencia.tipo === 'ORDEM' ? (
                            <ClipboardList className="h-4 w-4 text-purple-400" />
                          ) : (
                            <Package className="h-4 w-4 text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{pendencia.cliente}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-foreground-muted">{pendencia.numero}</p>
                            {isVencido(pendencia.dataPagamentoPrevista) && (
                              <span className="text-xs text-red-400 flex items-center gap-0.5">
                                <AlertCircle className="h-3 w-3" />
                                Vencido
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-amber-400">
                          {formatCurrency(pendencia.total)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border bg-background">
              <Link
                href="/a-receber"
                className="flex items-center justify-center gap-2 text-xs text-muted hover:text-amber-400 transition-colors"
              >
                Gerenciar pendencias
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Lembretes - Barra horizontal */}
        {lembretes && lembretes.count > 0 && (
          <div className="bg-card rounded-2xl border border-cyan-500/20 overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <Bell className="h-4 w-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Lembretes Pendentes</h3>
                  <p className="text-xs text-foreground-muted">{lembretes.count} cliente{lembretes.count !== 1 ? 's' : ''} para contatar</p>
                </div>
              </div>
              <Link
                href="/lembretes"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 rounded-lg text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-all"
              >
                Ver todos
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="p-3">
              <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-1">
                {lembretes.itens.map((lembrete) => {
                  const urgenciaColors = {
                    vencido: 'border-red-500/30 bg-red-500/5',
                    alta: 'border-amber-500/30 bg-amber-500/5',
                    media: 'border-yellow-500/30 bg-yellow-500/5',
                    baixa: 'border-cyan-500/30 bg-cyan-500/5',
                  };
                  const urgenciaBadge = {
                    vencido: 'bg-red-500/20 text-red-400',
                    alta: 'bg-amber-500/20 text-amber-400',
                    media: 'bg-yellow-500/20 text-yellow-400',
                    baixa: 'bg-cyan-500/20 text-cyan-400',
                  };
                  const diasLabel = lembrete.diasRestantes < 0
                    ? `${Math.abs(lembrete.diasRestantes)}d atrasado`
                    : lembrete.diasRestantes === 0
                      ? 'Hoje'
                      : `${lembrete.diasRestantes}d`;

                  return (
                    <div
                      key={lembrete.id}
                      className={`flex-shrink-0 p-3 rounded-xl border ${urgenciaColors[lembrete.urgencia]} min-w-[200px] max-w-[220px]`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-foreground truncate">{lembrete.cliente}</p>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${urgenciaBadge[lembrete.urgencia]}`}>
                          {diasLabel}
                        </span>
                      </div>
                      <p className="text-xs text-muted truncate">{lembrete.veiculo}</p>
                      <p className="text-xs text-foreground-muted">{lembrete.placa}</p>
                      {lembrete.telefone && (
                        <a
                          href={`https://wa.me/55${lembrete.telefone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 flex items-center gap-1.5 text-xs text-[#25D366] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle className="h-3 w-3" />
                          Enviar WhatsApp
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
