'use client';

import Header from '@/components/Header';
import { Plus, Search, Phone, Car, Eye, MessageCircle, X } from 'lucide-react';
import { useState } from 'react';

const clientes = [
  { id: 1, nome: 'João Silva', telefone: '(11) 99999-1234', veiculos: 2 },
  { id: 2, nome: 'Maria Santos', telefone: '(11) 98888-5678', veiculos: 1 },
  { id: 3, nome: 'Pedro Oliveira', telefone: '(11) 97777-9012', veiculos: 3 },
  { id: 4, nome: 'Ana Costa', telefone: '(11) 96666-3456', veiculos: 1 },
  { id: 5, nome: 'Carlos Ferreira', telefone: '(11) 95555-7890', veiculos: 2 },
];

export default function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#000000]">
      <Header title="Clientes" subtitle="Gerencie seus clientes" />

      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
            <input
              type="text"
              placeholder="Buscar cliente..."
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
            Novo Cliente
          </button>
        </div>

        {/* Lista de Clientes */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left p-4 text-sm font-medium text-[#6B7280]">Cliente</th>
                <th className="text-left p-4 text-sm font-medium text-[#6B7280]">Telefone</th>
                <th className="text-left p-4 text-sm font-medium text-[#6B7280]">Veículos</th>
                <th className="text-right p-4 text-sm font-medium text-[#6B7280]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#22c55e] to-[#166534] rounded-xl flex items-center justify-center text-white font-bold">
                        {cliente.nome.charAt(0)}
                      </div>
                      <span className="font-medium text-white">{cliente.nome}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-[#94a3b8]">
                      <Phone size={14} className="text-[#22c55e]" />
                      {cliente.telefone}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-white">
                      <Car size={14} className="text-[#22c55e]" />
                      {cliente.veiculos}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-2 hover:bg-[#22c55e]/10 rounded-lg text-[#94a3b8] hover:text-[#22c55e]">
                        <MessageCircle size={16} />
                      </button>
                      <button className="p-2 hover:bg-blue-500/10 rounded-lg text-[#94a3b8] hover:text-blue-400">
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Cliente */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Novo Cliente</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-lg text-[#6B7280] hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Nome</label>
                <input
                  type="text"
                  placeholder="Nome completo"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Telefone</label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]/50"
                />
              </div>
            </div>
            <div className="p-5 border-t border-white/5 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-white/10 rounded-xl text-[#94a3b8] hover:bg-white/5">
                Cancelar
              </button>
              <button className="btn-primary px-5 py-2.5 rounded-xl text-white font-medium">
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
