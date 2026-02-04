'use client';

import Header from '@/components/Header';
import Link from 'next/link';
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
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

const stats = [
  { label: 'Clientes', value: '247', icon: Users, color: 'blue', trend: '+12%' },
  { label: 'Veículos', value: '312', icon: Car, color: 'purple', trend: '+8%' },
  { label: 'O.S. do Mês', value: '89', icon: ClipboardList, color: 'green', trend: '+23%' },
  { label: 'Faturamento', value: 'R$ 24.580', icon: DollarSign, color: 'amber', trend: '+15%' },
];

const getStatColors = (color: string) => {
  const colors: Record<string, { bg: string; ring: string; text: string; glow: string }> = {
    blue: { bg: 'from-blue-500/20 to-blue-500/5', ring: 'ring-blue-500/20', text: 'text-blue-400', glow: 'group-hover:shadow-blue-500/10' },
    purple: { bg: 'from-purple-500/20 to-purple-500/5', ring: 'ring-purple-500/20', text: 'text-purple-400', glow: 'group-hover:shadow-purple-500/10' },
    green: { bg: 'from-[#22c55e]/20 to-[#22c55e]/5', ring: 'ring-[#22c55e]/20', text: 'text-[#22c55e]', glow: 'group-hover:shadow-[#22c55e]/10' },
    amber: { bg: 'from-amber-500/20 to-amber-500/5', ring: 'ring-amber-500/20', text: 'text-amber-400', glow: 'group-hover:shadow-amber-500/10' },
  };
  return colors[color] || colors.green;
};

const servicosHoje = [
  { id: 1, hora: '08:00', cliente: 'João Silva', veiculo: 'Honda Civic', servico: 'Troca de Óleo', status: 'em_andamento' },
  { id: 2, hora: '09:30', cliente: 'Maria Santos', veiculo: 'Toyota Corolla', servico: 'Revisão 30.000km', status: 'aguardando' },
  { id: 3, hora: '11:00', cliente: 'Pedro Oliveira', veiculo: 'VW Golf', servico: 'Alinhamento', status: 'concluido' },
  { id: 4, hora: '14:00', cliente: 'Ana Costa', veiculo: 'Fiat Argo', servico: 'Troca de Pastilhas', status: 'agendado' },
];

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'em_andamento':
      return { label: 'Em Andamento', bg: 'bg-blue-500/10', text: 'text-blue-400', ring: 'ring-blue-500/30', icon: Wrench };
    case 'aguardando':
      return { label: 'Aguardando', bg: 'bg-amber-500/10', text: 'text-amber-400', ring: 'ring-amber-500/30', icon: Clock };
    case 'concluido':
      return { label: 'Concluído', bg: 'bg-[#22c55e]/10', text: 'text-[#22c55e]', ring: 'ring-[#22c55e]/30', icon: CheckCircle };
    case 'agendado':
      return { label: 'Agendado', bg: 'bg-purple-500/10', text: 'text-purple-400', ring: 'ring-purple-500/30', icon: Calendar };
    default:
      return { label: status, bg: 'bg-gray-500/10', text: 'text-gray-400', ring: 'ring-gray-500/30', icon: Clock };
  }
};

const quickActions = [
  { icon: ClipboardList, label: 'Nova O.S.', href: '/ordens', color: 'green' },
  { icon: Users, label: 'Novo Cliente', href: '/clientes', color: 'blue' },
  { icon: Calendar, label: 'Agendar', href: '/agenda', color: 'purple' },
  { icon: Car, label: 'Novo Veículo', href: '/veiculos', color: 'amber' },
];

const getActionColors = (color: string) => {
  const colors: Record<string, { gradient: string; ring: string; glow: string }> = {
    green: { gradient: 'from-[#22c55e] to-[#166534]', ring: 'ring-[#22c55e]/20', glow: 'hover:shadow-[#22c55e]/20' },
    blue: { gradient: 'from-blue-500 to-blue-600', ring: 'ring-blue-500/20', glow: 'hover:shadow-blue-500/20' },
    purple: { gradient: 'from-purple-500 to-purple-600', ring: 'ring-purple-500/20', glow: 'hover:shadow-purple-500/20' },
    amber: { gradient: 'from-amber-500 to-amber-600', ring: 'ring-amber-500/20', glow: 'hover:shadow-amber-500/20' },
  };
  return colors[color] || colors.green;
};

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]">
      <Header title="Dashboard" subtitle="Visão geral da oficina" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const colors = getStatColors(stat.color);
            return (
              <div
                key={index}
                className={`group relative bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-5 border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all duration-300 hover:shadow-lg ${colors.glow}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center gap-4">
                  <div className={`p-3 bg-gradient-to-br ${colors.bg} rounded-xl ring-1 ${colors.ring}`}>
                    <stat.icon size={22} className={colors.text} />
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-sm text-[#666666]">{stat.label}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${colors.text}`}>
                    <TrendingUp size={12} />
                    {stat.trend}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Serviços de Hoje */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl border border-[#2a2a2a] overflow-hidden">
          <div className="p-5 border-b border-[#2a2a2a] flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Serviços de Hoje</h2>
              <p className="text-sm text-[#666666] mt-0.5">4 agendamentos para hoje</p>
            </div>
            <Link
              href="/ordens"
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-sm font-medium text-white hover:shadow-lg hover:shadow-[#22c55e]/20 transition-all duration-300 hover:scale-[1.02]"
            >
              <Plus size={16} />
              Nova O.S.
            </Link>
          </div>
          <div className="divide-y divide-[#2a2a2a]">
            {servicosHoje.map((servico) => {
              const statusConfig = getStatusConfig(servico.status);
              return (
                <div
                  key={servico.id}
                  className="p-4 hover:bg-white/[0.02] transition-all duration-200 group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[70px] py-2.5 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl ring-1 ring-[#2a2a2a] group-hover:ring-[#3a3a3a] transition-all duration-200">
                      <p className="text-lg font-bold text-white">{servico.hora}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{servico.cliente}</p>
                      <p className="text-sm text-[#666666] truncate">{servico.veiculo} • {servico.servico}</p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusConfig.bg} ${statusConfig.text} ring-1 ${statusConfig.ring}`}>
                      {statusConfig.label}
                    </span>
                    <ArrowRight size={16} className="text-[#444444] group-hover:text-[#22c55e] group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-4 border-t border-[#2a2a2a] bg-[#0f0f0f]/50">
            <Link
              href="/agenda"
              className="flex items-center justify-center gap-2 text-sm text-[#666666] hover:text-[#22c55e] transition-colors duration-200"
            >
              Ver agenda completa
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div>
          <h3 className="text-sm font-medium text-[#666666] mb-3 px-1">Ações Rápidas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const colors = getActionColors(action.color);
              return (
                <Link
                  key={index}
                  href={action.href}
                  className={`flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all duration-300 group hover:shadow-lg ${colors.glow}`}
                >
                  <div className={`p-3 bg-gradient-to-br ${colors.gradient} rounded-xl ring-1 ${colors.ring} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    <action.icon size={24} className="text-white" />
                  </div>
                  <span className="text-sm font-medium text-white group-hover:text-[#22c55e] transition-colors duration-200">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
