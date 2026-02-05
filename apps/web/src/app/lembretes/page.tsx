'use client';

import Header from '@/components/Header';
import {
  Bell,
  Search,
  Filter,
  MessageCircle,
  Phone,
  Clock,
  AlertCircle,
  CheckCircle,
  Calendar,
  Car,
  User,
  Send,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const lembretes = [
  {
    id: 1,
    cliente: 'Roberto Lima',
    telefone: '(11) 99999-1111',
    veiculo: 'Hyundai HB20 2019',
    placa: 'PQR-1234',
    servico: 'Troca de Óleo',
    ultimaData: '27/07/2024',
    prazo: '3 dias',
    urgencia: 'alta',
    status: 'pendente',
  },
  {
    id: 2,
    cliente: 'Fernanda Alves',
    telefone: '(11) 98888-2222',
    veiculo: 'Renault Sandero 2020',
    placa: 'STU-5678',
    servico: 'Revisão 20.000km',
    ultimaData: '20/07/2024',
    prazo: '7 dias',
    urgencia: 'media',
    status: 'pendente',
  },
  {
    id: 3,
    cliente: 'Marcos Souza',
    telefone: '(11) 97777-3333',
    veiculo: 'Ford Ka 2018',
    placa: 'VWX-9012',
    servico: 'Troca de Óleo',
    ultimaData: '27/07/2024',
    prazo: '15 dias',
    urgencia: 'baixa',
    status: 'pendente',
  },
  {
    id: 4,
    cliente: 'Lucia Mendes',
    telefone: '(11) 96666-4444',
    veiculo: 'Chevrolet Spin 2021',
    placa: 'ABC-9999',
    servico: 'Alinhamento',
    ultimaData: '20/01/2025',
    prazo: 'Hoje',
    urgencia: 'alta',
    status: 'enviado',
  },
  {
    id: 5,
    cliente: 'Paulo Santos',
    telefone: '(11) 95555-5555',
    veiculo: 'Fiat Toro 2022',
    placa: 'DEF-8888',
    servico: 'Troca de Pastilhas',
    ultimaData: '15/07/2024',
    prazo: 'Atrasado',
    urgencia: 'alta',
    status: 'pendente',
  },
];

const getUrgenciaConfig = (urgencia: string) => {
  switch (urgencia) {
    case 'alta':
      return {
        color: 'bg-red-50 text-red-600 border-red-200',
        label: 'Urgente',
      };
    case 'media':
      return {
        color: 'bg-amber-50 text-amber-600 border-amber-200',
        label: 'Atenção',
      };
    case 'baixa':
      return {
        color: 'bg-green-50 text-green-600 border-green-200',
        label: 'Normal',
      };
    default:
      return {
        color: 'bg-gray-50 text-gray-500 border-gray-200',
        label: urgencia,
      };
  }
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'pendente':
      return {
        color: 'text-amber-600',
        label: 'Pendente',
        icon: Clock,
      };
    case 'enviado':
      return {
        color: 'text-blue-600',
        label: 'Enviado',
        icon: Send,
      };
    case 'confirmado':
      return {
        color: 'text-green-600',
        label: 'Confirmado',
        icon: CheckCircle,
      };
    default:
      return {
        color: 'text-gray-400',
        label: status,
        icon: Clock,
      };
  }
};

export default function LembretesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUrgencia, setFilterUrgencia] = useState('todos');

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Header title="Lembretes" subtitle="Gerencie lembretes de manutenção" />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/5 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-50 rounded-xl ring-1 ring-red-500/20">
                <AlertCircle size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">3</p>
                <p className="text-xs text-[#6B7280]">Urgentes</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 rounded-xl ring-1 ring-amber-500/20">
                <Clock size={20} className="text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">5</p>
                <p className="text-xs text-[#6B7280]">Pendentes</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl ring-1 ring-blue-500/20">
                <Send size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">12</p>
                <p className="text-xs text-[#6B7280]">Enviados (semana)</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/5 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-50 rounded-xl ring-1 ring-green-500/20">
                <CheckCircle size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">8</p>
                <p className="text-xs text-[#6B7280]">Agendados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] group-focus-within:text-[#22c55e] transition-colors" size={18} />
              <input
                type="text"
                placeholder="Buscar por cliente ou placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200"
              />
            </div>
            <select
              value={filterUrgencia}
              onChange={(e) => setFilterUrgencia(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200"
            >
              <option value="todos">Todas Urgências</option>
              <option value="alta">Urgente</option>
              <option value="media">Atenção</option>
              <option value="baixa">Normal</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-gray-500 hover:border-[#22c55e]/40 hover:text-gray-900 transition-all duration-200">
              <Bell size={20} />
              Configurar Automação
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:shadow-lg hover:shadow-green-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
              <Send size={20} />
              Enviar Selecionados
            </button>
          </div>
        </div>

        {/* Lista de Lembretes */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4 accent-[#22c55e]" />
            <span className="text-sm text-[#6B7280]">Selecionar todos</span>
          </div>
          <div className="divide-y divide-gray-200">
            {lembretes.map((lembrete) => {
              const urgenciaConfig = getUrgenciaConfig(lembrete.urgencia);
              const statusConfig = getStatusConfig(lembrete.status);
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={lembrete.id}
                  className="p-4 hover:bg-gray-50 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <input type="checkbox" className="w-4 h-4 accent-[#22c55e]" />

                    <div className={`w-1 h-16 rounded-full ${
                      lembrete.urgencia === 'alta' ? 'bg-red-500' :
                      lembrete.urgencia === 'media' ? 'bg-amber-500' : 'bg-green-500'
                    }`}></div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <User size={16} className="text-[#6B7280]" />
                        <span className="font-medium text-gray-900">{lembrete.cliente}</span>
                        <span className="text-[#6B7280]">•</span>
                        <span className="text-gray-500 text-sm">{lembrete.telefone}</span>
                      </div>
                      <div className="flex items-center gap-3 mb-1">
                        <Car size={16} className="text-[#6B7280]" />
                        <span className="text-gray-500 text-sm">{lembrete.veiculo}</span>
                        <span className="px-2 py-0.5 bg-gray-50 rounded text-xs text-[#22c55e] ring-1 ring-[#22c55e]/20">
                          {lembrete.placa}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar size={16} className="text-[#6B7280]" />
                        <span className="text-[#6B7280] text-sm">
                          {lembrete.servico} • Último: {lembrete.ultimaData}
                        </span>
                      </div>
                    </div>

                    <div className="text-right space-y-2">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${urgenciaConfig.color}`}>
                        <AlertCircle size={14} />
                        <span className="text-xs font-medium">
                          {lembrete.prazo === 'Atrasado' ? 'Atrasado!' : `Vence em ${lembrete.prazo}`}
                        </span>
                      </div>
                      <div className={`flex items-center justify-end gap-2 ${statusConfig.color}`}>
                        <StatusIcon size={14} />
                        <span className="text-xs">{statusConfig.label}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 bg-gray-50 rounded-xl p-1.5">
                      <button className="p-2.5 bg-[#25D366]/20 rounded-lg text-[#25D366] hover:bg-[#25D366]/30 transition-all duration-200" title="Enviar WhatsApp">
                        <MessageCircle size={18} />
                      </button>
                      <button className="p-2.5 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-500/30 transition-all duration-200" title="Ligar">
                        <Phone size={18} />
                      </button>
                      <button className="p-2.5 bg-green-50 rounded-lg text-[#22c55e] hover:bg-[#22c55e]/30 transition-all duration-200" title="Agendar">
                        <Calendar size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mensagem Padrão */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mensagem de Lembrete Padrão</h3>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-gray-500 text-sm leading-relaxed">
              Olá <span className="text-[#22c55e]">[NOME_CLIENTE]</span>! 🚗
              <br /><br />
              Tudo bem? Aqui é da <span className="text-[#22c55e]">LoopIA Oficina</span>!
              <br /><br />
              Notamos que já se passaram <span className="text-[#22c55e]">[TEMPO]</span> desde a última <span className="text-[#22c55e]">[SERVICO]</span> do seu <span className="text-[#22c55e]">[VEICULO]</span> (placa <span className="text-[#22c55e]">[PLACA]</span>).
              <br /><br />
              Recomendamos agendar uma nova manutenção para manter seu veículo em dia! 🔧
              <br /><br />
              Podemos agendar para você? Responda esta mensagem ou ligue para (11) 9999-9999.
            </p>
          </div>
          <button className="mt-4 text-[#22c55e] text-sm hover:text-[#22c55e]/80 transition-colors">
            Editar mensagem padrão →
          </button>
        </div>
      </div>
    </div>
  );
}
