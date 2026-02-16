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

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [servicosHoje, setServicosHoje] = useState<ServicoHoje[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        setStats(data.stats);
        setServicosHoje(data.servicosHoje || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#43A047]/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-[#43A047] rounded-full animate-spin"></div>
          </div>
          <p className="text-zinc-400 animate-pulse">Carregando dashboard...</p>
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
              <p className="text-4xl font-bold text-white mb-1">{stats?.clientes || 0}</p>
              <p className="text-sm text-zinc-400">cadastrados</p>
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
              <p className="text-4xl font-bold text-white mb-1">{stats?.veiculos || 0}</p>
              <p className="text-sm text-zinc-400">registrados</p>
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
              <p className="text-4xl font-bold text-white mb-1">{stats?.ordensMes || 0}</p>
              <p className="text-sm text-zinc-400">ordens de servico</p>
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
              <p className="text-3xl font-bold text-white mb-1">{formatCurrency(stats?.faturamento || 0)}</p>
              <p className="text-sm text-zinc-400">este mes</p>
            </div>
          </div>
        </div>

        {/* Serviços de Hoje */}
        <div className="bg-[#1a1a1a] rounded-2xl border border-zinc-800/50 overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#43A047]" />
                Servicos de Hoje
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                {servicosHoje.length} agendamento{servicosHoje.length !== 1 ? 's' : ''} para hoje
              </p>
            </div>
            <Link
              href="/ordens"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#43A047] to-[#2E7D32] hover:from-[#2E7D32] hover:to-[#43A047] text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-[#43A047]/25 hover:shadow-[#43A047]/40 hover:scale-[1.02]"
            >
              <Plus className="h-5 w-5" />
              Nova O.S.
            </Link>
          </div>

          {servicosHoje.length === 0 ? (
            <div className="p-12 text-center">
              <div className="p-4 bg-zinc-800/50 rounded-full w-fit mx-auto mb-4">
                <Calendar className="h-8 w-8 text-zinc-600" />
              </div>
              <p className="text-zinc-400">Nenhum servico agendado para hoje</p>
              <Link
                href="/ordens"
                className="inline-flex items-center gap-2 mt-4 text-[#43A047] hover:text-[#66BB6A] transition-colors"
              >
                Agendar servico
                <ArrowRight className="h-4 w-4" />
              </Link>
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
                    className="block p-4 hover:bg-zinc-800/30 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[80px] py-3 bg-[#232323] rounded-xl border border-zinc-700/50 group-hover:border-[#43A047]/50 transition-all">
                        <p className="text-xl font-bold text-white">{servico.hora}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{servico.cliente}</p>
                        <p className="text-sm text-zinc-400 truncate">{servico.veiculo} - {servico.placa}</p>
                      </div>
                      <span className={`hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                        <StatusIcon className="h-4 w-4" />
                        {statusCfg.label}
                      </span>
                      <ArrowRight className="h-5 w-5 text-zinc-600 group-hover:text-[#43A047] group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {servicosHoje.length > 0 && (
            <div className="p-4 border-t border-zinc-800/50 bg-[#161616]">
              <Link
                href="/ordens"
                className="flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-[#43A047] transition-colors"
              >
                Ver todas as ordens de servico
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Ações Rápidas */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            Acoes Rapidas
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/ordens"
              className="group relative overflow-hidden bg-[#1a1a1a] rounded-2xl p-6 border border-zinc-800/50 hover:border-emerald-500/50 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative flex flex-col items-center gap-3">
                <div className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <ClipboardList className="h-6 w-6 text-white" />
                </div>
                <span className="font-medium text-zinc-300 group-hover:text-emerald-400 transition-colors">Nova O.S.</span>
              </div>
            </Link>

            <Link
              href="/clientes"
              className="group relative overflow-hidden bg-[#1a1a1a] rounded-2xl p-6 border border-zinc-800/50 hover:border-blue-500/50 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative flex flex-col items-center gap-3">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <span className="font-medium text-zinc-300 group-hover:text-blue-400 transition-colors">Novo Cliente</span>
              </div>
            </Link>

            <Link
              href="/veiculos"
              className="group relative overflow-hidden bg-[#1a1a1a] rounded-2xl p-6 border border-zinc-800/50 hover:border-purple-500/50 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative flex flex-col items-center gap-3">
                <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Car className="h-6 w-6 text-white" />
                </div>
                <span className="font-medium text-zinc-300 group-hover:text-purple-400 transition-colors">Novo Veiculo</span>
              </div>
            </Link>

            <Link
              href="/orcamentos"
              className="group relative overflow-hidden bg-[#1a1a1a] rounded-2xl p-6 border border-zinc-800/50 hover:border-orange-500/50 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative flex flex-col items-center gap-3">
                <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <span className="font-medium text-zinc-300 group-hover:text-orange-400 transition-colors">Orcamento</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
