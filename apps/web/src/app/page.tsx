'use client';

import Header from '@/components/Header';
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
} from 'lucide-react';

const stats = [
  { label: 'Clientes', value: '247', icon: Users, color: 'from-blue-500 to-blue-600' },
  { label: 'Veículos', value: '312', icon: Car, color: 'from-purple-500 to-purple-600' },
  { label: 'O.S. do Mês', value: '89', icon: ClipboardList, color: 'from-[#22c55e] to-[#166534]' },
  { label: 'Faturamento', value: 'R$ 24.580', icon: DollarSign, color: 'from-amber-500 to-amber-600' },
];

const servicosHoje = [
  { id: 1, hora: '08:00', cliente: 'João Silva', veiculo: 'Honda Civic', servico: 'Troca de Óleo', status: 'em_andamento' },
  { id: 2, hora: '09:30', cliente: 'Maria Santos', veiculo: 'Toyota Corolla', servico: 'Revisão 30.000km', status: 'aguardando' },
  { id: 3, hora: '11:00', cliente: 'Pedro Oliveira', veiculo: 'VW Golf', servico: 'Alinhamento', status: 'concluido' },
  { id: 4, hora: '14:00', cliente: 'Ana Costa', veiculo: 'Fiat Argo', servico: 'Troca de Pastilhas', status: 'agendado' },
];

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'em_andamento':
      return { label: 'Em Andamento', color: 'bg-blue-500/20 text-blue-400', icon: Wrench };
    case 'aguardando':
      return { label: 'Aguardando', color: 'bg-amber-500/20 text-amber-400', icon: Clock };
    case 'concluido':
      return { label: 'Concluído', color: 'bg-[#22c55e]/20 text-[#4ADE80]', icon: CheckCircle };
    case 'agendado':
      return { label: 'Agendado', color: 'bg-purple-500/20 text-purple-400', icon: Calendar };
    default:
      return { label: status, color: 'bg-gray-500/20 text-gray-400', icon: Clock };
  }
};

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#000000]">
      <Header title="Dashboard" subtitle="Visão geral da oficina" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                  <stat.icon size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-[#6B7280]">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Serviços de Hoje */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Serviços de Hoje</h2>
            <button className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm">
              <Plus size={16} />
              Nova O.S.
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {servicosHoje.map((servico) => {
              const statusConfig = getStatusConfig(servico.status);
              return (
                <div key={servico.id} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[60px] py-2 bg-black/30 rounded-lg">
                      <p className="text-lg font-bold text-white">{servico.hora}</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{servico.cliente}</p>
                      <p className="text-sm text-[#6B7280]">{servico.veiculo} • {servico.servico}</p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: ClipboardList, label: 'Nova O.S.', color: 'from-[#22c55e] to-[#166534]' },
            { icon: Users, label: 'Novo Cliente', color: 'from-blue-500 to-blue-600' },
            { icon: Calendar, label: 'Agendar', color: 'from-purple-500 to-purple-600' },
            { icon: Car, label: 'Novo Veículo', color: 'from-amber-500 to-amber-600' },
          ].map((action, index) => (
            <button
              key={index}
              className="flex flex-col items-center gap-3 p-5 glass-card rounded-2xl hover:border-white/20 transition-all group"
            >
              <div className={`p-3 bg-gradient-to-br ${action.color} rounded-xl group-hover:scale-110 transition-transform`}>
                <action.icon size={24} className="text-white" />
              </div>
              <span className="text-sm font-medium text-white">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
