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

const statConfig = [
  { key: 'clientes' as const, label: 'Clientes', icon: Users, color: 'blue' },
  { key: 'veiculos' as const, label: 'Veículos', icon: Car, color: 'purple' },
  { key: 'ordensMes' as const, label: 'O.S. do Mês', icon: ClipboardList, color: 'green' },
  { key: 'faturamento' as const, label: 'Faturamento', icon: DollarSign, color: 'amber' },
];

const getStatColors = (color: string) => {
  const colors: Record<string, { bg: string; ring: string; text: string; glow: string }> = {
    blue: { bg: 'from-blue-500/20 to-blue-500/5', ring: 'ring-blue-500/20', text: 'text-blue-400', glow: 'group-hover:shadow-blue-500/10' },
    purple: { bg: 'from-purple-500/20 to-purple-500/5', ring: 'ring-purple-500/20', text: 'text-purple-400', glow: 'group-hover:shadow-purple-500/10' },
    green: { bg: 'from-green-500/20 to-green-500/5', ring: 'ring-green-500/20', text: 'text-green-400', glow: 'group-hover:shadow-green-500/10' },
    amber: { bg: 'from-amber-500/20 to-amber-500/5', ring: 'ring-amber-500/20', text: 'text-amber-400', glow: 'group-hover:shadow-amber-500/10' },
  };
  return colors[color] || colors.green;
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'EM_ANDAMENTO':
      return { label: 'Em Andamento', bg: 'bg-purple-500/10', text: 'text-purple-400', ring: 'ring-purple-500/20', icon: Play };
    case 'AGUARDANDO_PECAS':
      return { label: 'Aguardando', bg: 'bg-amber-500/10', text: 'text-amber-400', ring: 'ring-amber-500/20', icon: Pause };
    case 'CONCLUIDO':
      return { label: 'Concluído', bg: 'bg-green-500/10', text: 'text-green-400', ring: 'ring-green-500/20', icon: CheckCircle };
    case 'ENTREGUE':
      return { label: 'Entregue', bg: 'bg-cyan-500/10', text: 'text-cyan-400', ring: 'ring-cyan-500/20', icon: Truck };
    case 'CANCELADO':
      return { label: 'Cancelado', bg: 'bg-red-500/10', text: 'text-red-500', ring: 'ring-red-500/20', icon: XCircle };
    case 'AGENDADO':
    default:
      return { label: 'Agendado', bg: 'bg-blue-500/10', text: 'text-blue-400', ring: 'ring-blue-500/20', icon: Calendar };
  }
};

const quickActions = [
  { icon: ClipboardList, label: 'Nova O.S.', href: '/ordens', color: 'green' },
  { icon: Users, label: 'Novo Cliente', href: '/clientes', color: 'blue' },
  { icon: Calendar, label: 'Agendar', href: '/ordens', color: 'purple' },
  { icon: Car, label: 'Novo Veículo', href: '/veiculos', color: 'amber' },
];

const getActionColors = (color: string) => {
  const colors: Record<string, { gradient: string; ring: string; glow: string }> = {
    green: { gradient: 'from-[#43A047] to-[#1B5E20]', ring: 'ring-green-500/20', glow: 'hover:shadow-green-500/10' },
    blue: { gradient: 'from-blue-500 to-blue-600', ring: 'ring-blue-500/20', glow: 'hover:shadow-blue-500/10' },
    purple: { gradient: 'from-purple-500 to-purple-600', ring: 'ring-purple-500/20', glow: 'hover:shadow-purple-500/10' },
    amber: { gradient: 'from-amber-500 to-amber-600', ring: 'ring-amber-500/20', glow: 'hover:shadow-amber-500/10' },
  };
  return colors[color] || colors.green;
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

  const formatStatValue = (key: string, value: number) => {
    if (key === 'faturamento') return formatCurrency(value);
    return value.toLocaleString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      <Header title="Dashboard" subtitle="Visão geral da oficina" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statConfig.map((stat, index) => {
            const colors = getStatColors(stat.color);
            const value = stats ? stats[stat.key] : 0;
            return (
              <div
                key={index}
                className={`group relative bg-[#1E1E1E] rounded-2xl p-5 border border-[#333333] hover:border-[#66BB6A] transition-all duration-300 hover:shadow-lg ${colors.glow}`}
              >
                <div className="relative flex items-center gap-4">
                  <div className={`p-3 bg-gradient-to-br ${colors.bg} rounded-xl ring-1 ${colors.ring}`}>
                    <stat.icon size={22} className={colors.text} />
                  </div>
                  <div className="flex-1">
                    {loading ? (
                      <div className="h-7 w-16 bg-[#2A2A2A] rounded animate-pulse" />
                    ) : (
                      <p className="text-2xl font-bold text-[#E8E8E8]">{formatStatValue(stat.key, value)}</p>
                    )}
                    <p className="text-sm text-[#9E9E9E]">{stat.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Serviços de Hoje */}
        <div className="bg-[#1E1E1E] rounded-2xl border border-[#333333] overflow-hidden">
          <div className="p-5 border-b border-[#333333] flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#E8E8E8]">Serviços de Hoje</h2>
              <p className="text-sm text-[#9E9E9E] mt-0.5">
                {loading ? '...' : `${servicosHoje.length} agendamento${servicosHoje.length !== 1 ? 's' : ''} para hoje`}
              </p>
            </div>
            <Link
              href="/ordens"
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#43A047] to-[#1B5E20] rounded-xl text-sm font-medium text-white hover:shadow-lg hover:shadow-[#43A047]/20 transition-all duration-300 hover:scale-[1.02]"
            >
              <Plus size={16} />
              Nova O.S.
            </Link>
          </div>
          <div className="divide-y divide-[#2A2A2A]">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="animate-spin mx-auto mb-2 text-[#43A047]" size={28} />
                <p className="text-sm text-[#9E9E9E]">Carregando...</p>
              </div>
            ) : servicosHoje.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="mx-auto mb-2 text-[#333333]" size={32} />
                <p className="text-[#9E9E9E]">Nenhum serviço agendado para hoje</p>
              </div>
            ) : (
              servicosHoje.map((servico) => {
                const statusCfg = getStatusConfig(servico.status);
                return (
                  <Link
                    key={servico.id}
                    href={`/ordens?detail=${servico.id}`}
                    className="block p-4 hover:bg-[#121212] transition-all duration-200 group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[70px] py-2.5 bg-[#121212] rounded-xl ring-1 ring-[#333333] group-hover:ring-[#66BB6A] transition-all duration-200">
                        <p className="text-lg font-bold text-[#E8E8E8]">{servico.hora}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#E8E8E8] truncate">{servico.cliente}</p>
                        <p className="text-sm text-[#9E9E9E] truncate">{servico.veiculo} • {servico.servico}</p>
                      </div>
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusCfg.bg} ${statusCfg.text} ring-1 ${statusCfg.ring}`}>
                        {statusCfg.label}
                      </span>
                      <ArrowRight size={16} className="text-[#333333] group-hover:text-[#43A047] group-hover:translate-x-1 transition-all duration-200" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
          {servicosHoje.length > 0 && (
            <div className="p-4 border-t border-[#2A2A2A] bg-[#121212]">
              <Link
                href="/ordens"
                className="flex items-center justify-center gap-2 text-sm text-[#9E9E9E] hover:text-[#43A047] transition-colors duration-200"
              >
                Ver todas as ordens
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* Ações Rápidas */}
        <div>
          <h3 className="text-sm font-medium text-[#9E9E9E] mb-3 px-1">Ações Rápidas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const colors = getActionColors(action.color);
              return (
                <Link
                  key={index}
                  href={action.href}
                  className={`flex flex-col items-center gap-3 p-5 bg-[#1E1E1E] rounded-2xl border border-[#333333] hover:border-[#66BB6A] transition-all duration-300 group hover:shadow-lg ${colors.glow}`}
                >
                  <div className={`p-3 bg-gradient-to-br ${colors.gradient} rounded-xl ring-1 ${colors.ring} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    <action.icon size={24} className="text-white" />
                  </div>
                  <span className="text-sm font-medium text-[#9E9E9E] group-hover:text-[#43A047] transition-colors duration-200">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
