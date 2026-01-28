'use client';

import Header from '@/components/Header';
import { Plus, Search, Clock, CheckCircle, Wrench, Eye, MessageCircle, X, Car } from 'lucide-react';
import { useState } from 'react';

const ordens = [
  { id: '001234', cliente: 'João Silva', veiculo: 'Honda Civic', placa: 'ABC-1234', servico: 'Troca de Óleo', valor: 'R$ 320', status: 'em_andamento' },
  { id: '001233', cliente: 'Maria Santos', veiculo: 'Toyota Corolla', placa: 'DEF-5678', servico: 'Revisão 30.000km', valor: 'R$ 890', status: 'aguardando' },
  { id: '001232', cliente: 'Pedro Oliveira', veiculo: 'VW Golf', placa: 'GHI-9012', servico: 'Alinhamento', valor: 'R$ 180', status: 'concluido' },
  { id: '001231', cliente: 'Ana Costa', veiculo: 'Fiat Argo', placa: 'JKL-3456', servico: 'Troca de Pastilhas', valor: 'R$ 450', status: 'aguardando' },
  { id: '001230', cliente: 'Carlos Ferreira', veiculo: 'Chevrolet Onix', placa: 'MNO-7890', servico: 'Troca de Óleo', valor: 'R$ 280', status: 'concluido' },
];

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'em_andamento':
      return { label: 'Em Andamento', color: 'bg-blue-500/20 text-blue-400', icon: Wrench };
    case 'aguardando':
      return { label: 'Aguardando', color: 'bg-amber-500/20 text-amber-400', icon: Clock };
    case 'concluido':
      return { label: 'Concluído', color: 'bg-[#22c55e]/20 text-[#4ADE80]', icon: CheckCircle };
    default:
      return { label: status, color: 'bg-gray-500/20 text-gray-400', icon: Clock };
  }
};

export default function OrdensPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#000000]">
      <Header title="Ordens de Serviço" subtitle="Gerencie as OS" />

      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
            <input
              type="text"
              placeholder="Buscar OS, cliente ou placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]/50"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 px-5 py-3 rounded-xl text-white font-medium"
          >
            <Plus size={18} />
            Nova OS
          </button>
        </div>

        {/* Lista de OS */}
        <div className="space-y-4">
          {ordens.map((os) => {
            const statusConfig = getStatusConfig(os.status);
            return (
              <div key={os.id} className="glass-card rounded-2xl p-5">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl font-bold text-[#22c55e]">#{os.id}</span>
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-white font-medium">{os.cliente}</span>
                      <span className="text-[#6B7280]">•</span>
                      <span className="text-[#94a3b8] flex items-center gap-1">
                        <Car size={14} /> {os.veiculo}
                      </span>
                      <span className="text-[#6B7280] font-mono text-xs">{os.placa}</span>
                    </div>
                    <p className="text-sm text-[#6B7280] mt-1">{os.servico}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-[#22c55e]">{os.valor}</span>
                    <div className="flex gap-1">
                      <button className="p-2 hover:bg-white/10 rounded-lg text-[#94a3b8] hover:text-white">
                        <Eye size={18} />
                      </button>
                      <button className="p-2 hover:bg-[#25D366]/10 rounded-lg text-[#94a3b8] hover:text-[#25D366]">
                        <MessageCircle size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Nova OS */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Nova OS</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-lg text-[#6B7280] hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Cliente</label>
                <select className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]/50">
                  <option value="">Selecione</option>
                  <option value="1">João Silva</option>
                  <option value="2">Maria Santos</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Veículo</label>
                <select className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]/50">
                  <option value="">Selecione</option>
                  <option value="1">Honda Civic - ABC-1234</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Serviço</label>
                <input type="text" placeholder="Descreva o serviço" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Valor</label>
                <input type="text" placeholder="R$ 0,00" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]/50" />
              </div>
            </div>
            <div className="p-5 border-t border-white/5 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-white/10 rounded-xl text-[#94a3b8] hover:bg-white/5">
                Cancelar
              </button>
              <button className="btn-primary px-5 py-2.5 rounded-xl text-white font-medium">
                Abrir OS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
