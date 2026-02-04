'use client';

import Header from '@/components/Header';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Car,
  Wrench,
  CheckCircle,
  Calendar,
  X,
} from 'lucide-react';
import { useState } from 'react';

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const horasTrabalho = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

const agendamentos = [
  {
    id: 1,
    hora: '08:00',
    duracao: 2,
    cliente: 'João Silva',
    veiculo: 'Honda Civic',
    placa: 'ABC-1234',
    servico: 'Troca de Óleo + Filtro',
    status: 'confirmado',
    dia: 27,
  },
  {
    id: 2,
    hora: '09:30',
    duracao: 3,
    cliente: 'Maria Santos',
    veiculo: 'Toyota Corolla',
    placa: 'DEF-5678',
    servico: 'Revisão 30.000km',
    status: 'confirmado',
    dia: 27,
  },
  {
    id: 3,
    hora: '14:00',
    duracao: 2,
    cliente: 'Ana Costa',
    veiculo: 'Fiat Argo',
    placa: 'JKL-3456',
    servico: 'Troca de Pastilhas',
    status: 'pendente',
    dia: 27,
  },
  {
    id: 4,
    hora: '10:00',
    duracao: 1,
    cliente: 'Carlos Ferreira',
    veiculo: 'Chevrolet Onix',
    placa: 'MNO-7890',
    servico: 'Troca de Óleo',
    status: 'confirmado',
    dia: 28,
  },
  {
    id: 5,
    hora: '15:00',
    duracao: 2,
    cliente: 'Roberto Lima',
    veiculo: 'Hyundai HB20',
    placa: 'PQR-1234',
    servico: 'Alinhamento + Balanceamento',
    status: 'pendente',
    dia: 29,
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmado':
      return 'bg-[#22c55e] border-[#22c55e]';
    case 'pendente':
      return 'bg-amber-500 border-amber-500';
    case 'concluido':
      return 'bg-blue-500 border-blue-500';
    default:
      return 'bg-gray-500 border-gray-500';
  }
};

export default function AgendaPage() {
  const [viewMode, setViewMode] = useState<'semana' | 'dia'>('semana');
  const [currentDate] = useState(new Date(2025, 0, 27));
  const [showModal, setShowModal] = useState(false);

  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]">
      <Header title="Agenda" subtitle="Gerencie seus agendamentos" />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1 bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-xl p-1">
              <button
                onClick={() => setViewMode('dia')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  viewMode === 'dia'
                    ? 'bg-gradient-to-r from-[#22c55e] to-[#166534] text-white shadow-lg shadow-[#22c55e]/20'
                    : 'text-[#666666] hover:text-white hover:bg-white/5'
                }`}
              >
                Dia
              </button>
              <button
                onClick={() => setViewMode('semana')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  viewMode === 'semana'
                    ? 'bg-gradient-to-r from-[#22c55e] to-[#166534] text-white shadow-lg shadow-[#22c55e]/20'
                    : 'text-[#666666] hover:text-white hover:bg-white/5'
                }`}
              >
                Semana
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-lg text-[#666666] hover:text-white hover:border-[#22c55e]/30 transition-all duration-200">
                <ChevronLeft size={20} />
              </button>
              <span className="text-white font-medium px-4 min-w-[140px] text-center">
                Janeiro 2025
              </span>
              <button className="p-2 bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-lg text-[#666666] hover:text-white hover:border-[#22c55e]/30 transition-all duration-200">
                <ChevronRight size={20} />
              </button>
            </div>
            <button className="px-4 py-2 bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-lg text-[#666666] hover:text-[#22c55e] hover:border-[#22c55e]/30 transition-all duration-200 text-sm font-medium">
              Hoje
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:shadow-lg hover:shadow-[#22c55e]/20 transition-all duration-300 hover:scale-[1.02]"
          >
            <Plus size={20} />
            Novo Agendamento
          </button>
        </div>

        {/* Legenda */}
        <div className="flex gap-6 p-3 bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-xl w-fit">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#22c55e] ring-2 ring-[#22c55e]/30"></div>
            <span className="text-sm text-[#94a3b8]">Confirmado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-amber-500/30"></div>
            <span className="text-sm text-[#94a3b8]">Pendente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-500/30"></div>
            <span className="text-sm text-[#94a3b8]">Concluído</span>
          </div>
        </div>

        {/* Calendário Semanal */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          {/* Header do Calendário */}
          <div className="grid grid-cols-8 border-b border-[#2a2a2a]">
            <div className="p-4 text-[#666666] text-sm font-medium">Horário</div>
            {weekDays.map((date, idx) => {
              const isToday = date.getDate() === 27 && date.getMonth() === 0;
              return (
                <div
                  key={idx}
                  className={`p-4 text-center border-l border-[#2a2a2a] ${
                    isToday ? 'bg-[#22c55e]/10' : ''
                  }`}
                >
                  <p className="text-[#666666] text-xs">{diasSemana[idx]}</p>
                  <p className={`text-lg font-bold ${isToday ? 'text-[#22c55e]' : 'text-white'}`}>
                    {date.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Body do Calendário */}
          <div className="max-h-[600px] overflow-y-auto">
            {horasTrabalho.map((hora) => (
              <div key={hora} className="grid grid-cols-8 border-b border-[#2a2a2a]/50 min-h-[80px]">
                <div className="p-3 text-[#666666] text-sm border-r border-[#2a2a2a]/50">
                  {hora}
                </div>
                {weekDays.map((date, idx) => {
                  const diaAgendamentos = agendamentos.filter(
                    (a) => a.dia === date.getDate() && a.hora === hora
                  );
                  const isToday = date.getDate() === 27 && date.getMonth() === 0;

                  return (
                    <div
                      key={idx}
                      className={`p-1 border-l border-[#2a2a2a]/50 relative ${
                        isToday ? 'bg-[#22c55e]/5' : ''
                      } hover:bg-white/[0.02] transition-all duration-200 cursor-pointer`}
                    >
                      {diaAgendamentos.map((agendamento) => (
                        <div
                          key={agendamento.id}
                          className={`p-2 rounded-lg text-white text-xs ${getStatusColor(agendamento.status)} bg-opacity-90 mb-1 hover:scale-[1.02] transition-transform duration-200`}
                          style={{ minHeight: `${agendamento.duracao * 60}px` }}
                        >
                          <p className="font-semibold truncate">{agendamento.cliente}</p>
                          <p className="truncate opacity-90">{agendamento.servico}</p>
                          <p className="truncate opacity-75">{agendamento.placa}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Lista de Agendamentos do Dia */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-2xl">
          <div className="p-6 border-b border-[#2a2a2a]">
            <h2 className="text-lg font-semibold text-white">Agendamentos de Hoje</h2>
            <p className="text-sm text-[#666666]">27 de Janeiro de 2025</p>
          </div>
          <div className="divide-y divide-[#2a2a2a]/50">
            {agendamentos
              .filter((a) => a.dia === 27)
              .map((agendamento) => (
                <div
                  key={agendamento.id}
                  className="p-4 hover:bg-white/[0.02] transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[70px] py-2.5 bg-gradient-to-br from-[#0f0f0f] to-[#0a0a0a] rounded-xl ring-1 ring-[#2a2a2a] group-hover:ring-[#3a3a3a] transition-all duration-200">
                      <p className="text-lg font-bold text-white">{agendamento.hora}</p>
                      <p className="text-xs text-[#666666]">{agendamento.duracao}h</p>
                    </div>
                    <div className={`w-1 h-14 rounded-full ${getStatusColor(agendamento.status)}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <User size={16} className="text-[#666666] flex-shrink-0" />
                        <p className="font-medium text-white truncate">{agendamento.cliente}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <Car size={16} className="text-[#666666] flex-shrink-0" />
                        <p className="text-sm text-[#94a3b8] truncate">
                          {agendamento.veiculo} • {agendamento.placa}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <Wrench size={16} className="text-[#666666] flex-shrink-0" />
                        <p className="text-sm text-[#666666] truncate">{agendamento.servico}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {agendamento.status === 'pendente' && (
                        <button className="px-4 py-2 bg-[#22c55e]/10 text-[#22c55e] rounded-lg text-sm hover:bg-[#22c55e]/20 transition-all duration-200 ring-1 ring-[#22c55e]/20">
                          Confirmar
                        </button>
                      )}
                      <button className="px-4 py-2 bg-[#0f0f0f] text-[#94a3b8] rounded-lg text-sm hover:bg-white/5 hover:text-white transition-all duration-200 ring-1 ring-[#2a2a2a]">
                        Abrir O.S.
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Modal Novo Agendamento */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-2xl w-full max-w-lg animate-fade-in shadow-2xl">
            <div className="p-6 border-b border-[#2a2a2a] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Novo Agendamento</h2>
                <p className="text-sm text-[#666666] mt-1">Agende um serviço para o cliente</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/5 rounded-lg text-[#666666] hover:text-white transition-all duration-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Cliente</label>
                <select className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200">
                  <option value="">Selecione o cliente</option>
                  <option value="1">João Silva</option>
                  <option value="2">Maria Santos</option>
                  <option value="3">Pedro Oliveira</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Veículo</label>
                <select className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200">
                  <option value="">Selecione o veículo</option>
                  <option value="1">Honda Civic 2020 - ABC-1234</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Serviço</label>
                <select className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200">
                  <option value="">Selecione o serviço</option>
                  <option value="1">Troca de Óleo</option>
                  <option value="2">Revisão Completa</option>
                  <option value="3">Alinhamento + Balanceamento</option>
                  <option value="4">Troca de Pastilhas</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Data</label>
                  <input
                    type="date"
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Horário</label>
                  <select className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200">
                    {horasTrabalho.map((hora) => (
                      <option key={hora} value={hora}>{hora}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Observações</label>
                <textarea
                  placeholder="Observações sobre o agendamento..."
                  rows={2}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white placeholder-[#666666] focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 resize-none transition-all duration-200"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#2a2a2a] flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 border border-[#2a2a2a] rounded-xl text-[#94a3b8] hover:bg-white/5 transition-all duration-200"
              >
                Cancelar
              </button>
              <button className="px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:shadow-lg hover:shadow-[#22c55e]/20 transition-all duration-300">
                Agendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
