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
  const [currentDate] = useState(new Date(2025, 0, 27)); // 27 de Janeiro de 2025
  const [showModal, setShowModal] = useState(false);

  // Gerar dias da semana atual
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });

  return (
    <div className="min-h-screen bg-[#000000]">
      <Header title="Agenda" subtitle="Gerencie seus agendamentos" />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[#1F1F1F] border border-[#333333] rounded-xl p-1">
              <button
                onClick={() => setViewMode('dia')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'dia'
                    ? 'bg-[#22c55e] text-white'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                Dia
              </button>
              <button
                onClick={() => setViewMode('semana')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'semana'
                    ? 'bg-[#22c55e] text-white'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                Semana
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 bg-[#1F1F1F] border border-[#333333] rounded-lg text-[#94a3b8] hover:text-white hover:border-[#22c55e] transition-colors">
                <ChevronLeft size={20} />
              </button>
              <span className="text-white font-medium px-4">
                Janeiro 2025
              </span>
              <button className="p-2 bg-[#1F1F1F] border border-[#333333] rounded-lg text-[#94a3b8] hover:text-white hover:border-[#22c55e] transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
            <button className="px-4 py-2 bg-[#1F1F1F] border border-[#333333] rounded-lg text-[#94a3b8] hover:text-white hover:border-[#22c55e] transition-colors text-sm">
              Hoje
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={20} />
            Novo Agendamento
          </button>
        </div>

        {/* Legenda */}
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
            <span className="text-sm text-[#94a3b8]">Confirmado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-sm text-[#94a3b8]">Pendente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm text-[#94a3b8]">Concluído</span>
          </div>
        </div>

        {/* Calendário Semanal */}
        <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl overflow-hidden">
          {/* Header do Calendário */}
          <div className="grid grid-cols-8 border-b border-[#333333]">
            <div className="p-4 text-[#6B7280] text-sm font-medium">Horário</div>
            {weekDays.map((date, idx) => {
              const isToday = date.getDate() === 27 && date.getMonth() === 0;
              return (
                <div
                  key={idx}
                  className={`p-4 text-center border-l border-[#333333] ${
                    isToday ? 'bg-[#22c55e]/10' : ''
                  }`}
                >
                  <p className="text-[#6B7280] text-xs">{diasSemana[idx]}</p>
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
              <div key={hora} className="grid grid-cols-8 border-b border-[#333333] min-h-[80px]">
                <div className="p-3 text-[#6B7280] text-sm border-r border-[#333333]">
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
                      className={`p-1 border-l border-[#333333] relative ${
                        isToday ? 'bg-[#22c55e]/5' : ''
                      } hover:bg-[#333333]/30 transition-colors cursor-pointer`}
                    >
                      {diaAgendamentos.map((agendamento) => (
                        <div
                          key={agendamento.id}
                          className={`p-2 rounded-lg text-white text-xs ${getStatusColor(agendamento.status)} bg-opacity-90 mb-1`}
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
        <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl">
          <div className="p-6 border-b border-[#333333]">
            <h2 className="text-lg font-semibold text-white">Agendamentos de Hoje</h2>
            <p className="text-sm text-[#6B7280]">27 de Janeiro de 2025</p>
          </div>
          <div className="divide-y divide-[#333333]">
            {agendamentos
              .filter((a) => a.dia === 27)
              .map((agendamento) => (
                <div
                  key={agendamento.id}
                  className="p-4 hover:bg-[#333333]/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[60px]">
                      <p className="text-lg font-bold text-white">{agendamento.hora}</p>
                      <p className="text-xs text-[#6B7280]">{agendamento.duracao}h</p>
                    </div>
                    <div className={`w-1 h-12 rounded-full ${getStatusColor(agendamento.status)}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <User size={16} className="text-[#6B7280]" />
                        <p className="font-medium text-white">{agendamento.cliente}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <Car size={16} className="text-[#6B7280]" />
                        <p className="text-sm text-[#94a3b8]">
                          {agendamento.veiculo} • {agendamento.placa}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <Wrench size={16} className="text-[#6B7280]" />
                        <p className="text-sm text-[#6B7280]">{agendamento.servico}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {agendamento.status === 'pendente' && (
                        <button className="px-4 py-2 bg-[#22c55e]/20 text-[#22c55e] rounded-lg text-sm hover:bg-[#22c55e]/30 transition-colors">
                          Confirmar
                        </button>
                      )}
                      <button className="px-4 py-2 bg-[#000000] text-[#94a3b8] rounded-lg text-sm hover:bg-[#333333] hover:text-white transition-colors">
                        Abrir OS
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl w-full max-w-lg animate-fade-in">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-semibold text-white">Novo Agendamento</h2>
              <p className="text-sm text-[#6B7280] mt-1">Agende um serviço para o cliente</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Cliente</label>
                <select className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]">
                  <option value="">Selecione o cliente</option>
                  <option value="1">João Silva</option>
                  <option value="2">Maria Santos</option>
                  <option value="3">Pedro Oliveira</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Veículo</label>
                <select className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]">
                  <option value="">Selecione o veículo</option>
                  <option value="1">Honda Civic 2020 - ABC-1234</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Serviço</label>
                <select className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]">
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
                    className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Horário</label>
                  <select className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]">
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
                  className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e] resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
              >
                Cancelar
              </button>
              <button className="px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:opacity-90 transition-opacity">
                Agendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
