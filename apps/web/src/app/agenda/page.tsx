'use client';

import Header from '@/components/Header';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  Car,
  Wrench,
  X,
  Loader2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const horasTrabalho = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

interface Cliente {
  id: number;
  nome: string;
  telefone: string;
  veiculos: Veiculo[];
}

interface Veiculo {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  ano?: number;
  clienteId: number;
  cliente?: Cliente;
}

interface Servico {
  id: number;
  nome: string;
  precoBase: string;
  duracaoMin?: number;
}

interface OrdemServico {
  id: number;
  numero: string;
  status: string;
  dataAgendada?: string;
  observacoes?: string;
  veiculo: Veiculo & { cliente: Cliente };
  itens: { servico: Servico }[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'AGENDADO':
      return 'bg-amber-500 border-amber-500';
    case 'EM_ANDAMENTO':
      return 'bg-blue-500 border-blue-500';
    case 'CONCLUIDO':
    case 'ENTREGUE':
      return 'bg-[#22c55e] border-[#22c55e]';
    case 'CANCELADO':
      return 'bg-red-500 border-red-500';
    default:
      return 'bg-gray-500 border-gray-500';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'AGENDADO': return 'Agendado';
    case 'EM_ANDAMENTO': return 'Em Andamento';
    case 'CONCLUIDO': return 'Concluído';
    case 'ENTREGUE': return 'Entregue';
    case 'CANCELADO': return 'Cancelado';
    default: return status;
  }
};

export default function AgendaPage() {
  const [viewMode, setViewMode] = useState<'semana' | 'dia'>('semana');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data from API
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [agendamentos, setAgendamentos] = useState<OrdemServico[]>([]);

  // Form state
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string>('');
  const [selectedServicoId, setSelectedServicoId] = useState<string>('');
  const [dataAgendamento, setDataAgendamento] = useState<string>('');
  const [horaAgendamento, setHoraAgendamento] = useState<string>('08:00');
  const [observacoes, setObservacoes] = useState<string>('');

  // Filtered vehicles based on selected client
  const veiculosDoCliente = selectedClienteId
    ? veiculos.filter(v => v.clienteId === parseInt(selectedClienteId))
    : [];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientesRes, veiculosRes, servicosRes, ordensRes] = await Promise.all([
        fetch('/api/clientes'),
        fetch('/api/veiculos'),
        fetch('/api/servicos'),
        fetch('/api/ordens'),
      ]);

      const [clientesData, veiculosData, servicosData, ordensData] = await Promise.all([
        clientesRes.json(),
        veiculosRes.json(),
        servicosRes.json(),
        ordensRes.json(),
      ]);

      setClientes(clientesData);
      setVeiculos(veiculosData);
      setServicos(servicosData.filter((s: Servico) => s));

      // Filter only scheduled orders (with dataAgendada)
      const agendados = ordensData.filter((o: OrdemServico) => o.dataAgendada);
      setAgendamentos(agendados);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const getAgendamentosForDateAndHour = (date: Date, hora: string) => {
    return agendamentos.filter(a => {
      if (!a.dataAgendada) return false;
      const agendaDate = new Date(a.dataAgendada);
      const agendaHora = agendaDate.toTimeString().slice(0, 5);
      return agendaDate.getDate() === date.getDate() &&
             agendaDate.getMonth() === date.getMonth() &&
             agendaDate.getFullYear() === date.getFullYear() &&
             agendaHora === hora;
    });
  };

  const getAgendamentosForDate = (date: Date) => {
    return agendamentos.filter(a => {
      if (!a.dataAgendada) return false;
      const agendaDate = new Date(a.dataAgendada);
      return agendaDate.getDate() === date.getDate() &&
             agendaDate.getMonth() === date.getMonth() &&
             agendaDate.getFullYear() === date.getFullYear();
    });
  };

  const handleCreateAgendamento = async () => {
    if (!selectedVeiculoId || !selectedServicoId || !dataAgendamento || !horaAgendamento) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const dataHora = new Date(`${dataAgendamento}T${horaAgendamento}:00`);

      const res = await fetch('/api/ordens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          veiculoId: parseInt(selectedVeiculoId),
          status: 'AGENDADO',
          dataAgendada: dataHora.toISOString(),
          observacoes,
          itens: [{
            servicoId: parseInt(selectedServicoId),
            quantidade: 1,
          }],
        }),
      });

      if (res.ok) {
        toast.success('Agendamento criado com sucesso!');
        setShowModal(false);
        resetForm();
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao criar agendamento');
      }
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast.error('Erro ao criar agendamento');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedClienteId('');
    setSelectedVeiculoId('');
    setSelectedServicoId('');
    setDataAgendamento('');
    setHoraAgendamento('08:00');
    setObservacoes('');
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const todayAgendamentos = getAgendamentosForDate(new Date());

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
              <button
                onClick={() => navigateWeek(-1)}
                className="p-2 bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-lg text-[#666666] hover:text-white hover:border-[#22c55e]/30 transition-all duration-200"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-white font-medium px-4 min-w-[160px] text-center capitalize">
                {formatMonthYear(currentDate)}
              </span>
              <button
                onClick={() => navigateWeek(1)}
                className="p-2 bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-lg text-[#666666] hover:text-white hover:border-[#22c55e]/30 transition-all duration-200"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-lg text-[#666666] hover:text-[#22c55e] hover:border-[#22c55e]/30 transition-all duration-200 text-sm font-medium"
            >
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
            <div className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-amber-500/30"></div>
            <span className="text-sm text-[#94a3b8]">Agendado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-500/30"></div>
            <span className="text-sm text-[#94a3b8]">Em Andamento</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#22c55e] ring-2 ring-[#22c55e]/30"></div>
            <span className="text-sm text-[#94a3b8]">Concluído</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#22c55e]" size={40} />
          </div>
        ) : (
          <>
            {/* Calendário Semanal */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden">
              {/* Header do Calendário */}
              <div className="grid grid-cols-8 border-b border-[#2a2a2a]">
                <div className="p-4 text-[#666666] text-sm font-medium">Horário</div>
                {weekDays.map((date, idx) => {
                  const isTodayDate = isToday(date);
                  return (
                    <div
                      key={idx}
                      className={`p-4 text-center border-l border-[#2a2a2a] ${
                        isTodayDate ? 'bg-[#22c55e]/10' : ''
                      }`}
                    >
                      <p className="text-[#666666] text-xs">{diasSemana[idx]}</p>
                      <p className={`text-lg font-bold ${isTodayDate ? 'text-[#22c55e]' : 'text-white'}`}>
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
                      const diaAgendamentos = getAgendamentosForDateAndHour(date, hora);
                      const isTodayDate = isToday(date);

                      return (
                        <div
                          key={idx}
                          className={`p-1 border-l border-[#2a2a2a]/50 relative ${
                            isTodayDate ? 'bg-[#22c55e]/5' : ''
                          } hover:bg-white/[0.02] transition-all duration-200 cursor-pointer`}
                        >
                          {diaAgendamentos.map((agendamento) => (
                            <div
                              key={agendamento.id}
                              className={`p-2 rounded-lg text-white text-xs ${getStatusColor(agendamento.status)} bg-opacity-90 mb-1 hover:scale-[1.02] transition-transform duration-200`}
                            >
                              <p className="font-semibold truncate">{agendamento.veiculo.cliente.nome}</p>
                              <p className="truncate opacity-90">
                                {agendamento.itens[0]?.servico?.nome || 'Serviço'}
                              </p>
                              <p className="truncate opacity-75">{agendamento.veiculo.placa}</p>
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
                <p className="text-sm text-[#666666]">
                  {new Date().toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <div className="divide-y divide-[#2a2a2a]/50">
                {todayAgendamentos.length === 0 ? (
                  <div className="p-8 text-center text-[#666666]">
                    Nenhum agendamento para hoje
                  </div>
                ) : (
                  todayAgendamentos.map((agendamento) => {
                    const horaAgendada = agendamento.dataAgendada
                      ? new Date(agendamento.dataAgendada).toTimeString().slice(0, 5)
                      : '--:--';

                    return (
                      <div
                        key={agendamento.id}
                        className="p-4 hover:bg-white/[0.02] transition-all duration-200 cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[70px] py-2.5 bg-gradient-to-br from-[#0f0f0f] to-[#0a0a0a] rounded-xl ring-1 ring-[#2a2a2a] group-hover:ring-[#3a3a3a] transition-all duration-200">
                            <p className="text-lg font-bold text-white">{horaAgendada}</p>
                          </div>
                          <div className={`w-1 h-14 rounded-full ${getStatusColor(agendamento.status)}`}></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <User size={16} className="text-[#666666] flex-shrink-0" />
                              <p className="font-medium text-white truncate">{agendamento.veiculo.cliente.nome}</p>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <Car size={16} className="text-[#666666] flex-shrink-0" />
                              <p className="text-sm text-[#94a3b8] truncate">
                                {agendamento.veiculo.marca} {agendamento.veiculo.modelo} • {agendamento.veiculo.placa}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <Wrench size={16} className="text-[#666666] flex-shrink-0" />
                              <p className="text-sm text-[#666666] truncate">
                                {agendamento.itens[0]?.servico?.nome || 'Serviço'}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getStatusColor(agendamento.status)} text-white`}>
                              {getStatusLabel(agendamento.status)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
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
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-white/5 rounded-lg text-[#666666] hover:text-white transition-all duration-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Cliente</label>
                <select
                  value={selectedClienteId}
                  onChange={(e) => {
                    setSelectedClienteId(e.target.value);
                    setSelectedVeiculoId('');
                  }}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200"
                >
                  <option value="">Selecione o cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Veículo</label>
                <select
                  value={selectedVeiculoId}
                  onChange={(e) => setSelectedVeiculoId(e.target.value)}
                  disabled={!selectedClienteId}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200 disabled:opacity-50"
                >
                  <option value="">
                    {!selectedClienteId ? 'Selecione um cliente primeiro' : 'Selecione o veículo'}
                  </option>
                  {veiculosDoCliente.map((veiculo) => (
                    <option key={veiculo.id} value={veiculo.id}>
                      {veiculo.marca} {veiculo.modelo} {veiculo.ano || ''} - {veiculo.placa}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Serviço</label>
                <select
                  value={selectedServicoId}
                  onChange={(e) => setSelectedServicoId(e.target.value)}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200"
                >
                  <option value="">Selecione o serviço</option>
                  {servicos.map((servico) => (
                    <option key={servico.id} value={servico.id}>
                      {servico.nome} - R$ {parseFloat(servico.precoBase).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Data</label>
                  <input
                    type="date"
                    value={dataAgendamento}
                    onChange={(e) => setDataAgendamento(e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Horário</label>
                  <select
                    value={horaAgendamento}
                    onChange={(e) => setHoraAgendamento(e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200"
                  >
                    {horasTrabalho.map((hora) => (
                      <option key={hora} value={hora}>{hora}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Observações</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações sobre o agendamento..."
                  rows={2}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white placeholder-[#666666] focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 resize-none transition-all duration-200"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#2a2a2a] flex gap-3 justify-end">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="px-6 py-3 border border-[#2a2a2a] rounded-xl text-[#94a3b8] hover:bg-white/5 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAgendamento}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:shadow-lg hover:shadow-[#22c55e]/20 transition-all duration-300 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="animate-spin" size={18} />}
                Agendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
