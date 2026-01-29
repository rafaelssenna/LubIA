'use client';

import Header from '@/components/Header';
import { Plus, Search, Car, User, ClipboardList, X, Camera } from 'lucide-react';
import { useState } from 'react';
import OCRScanner from '@/components/OCRScanner';

const veiculos = [
  { id: 1, placa: 'ABC-1234', modelo: 'Honda Civic', ano: 2020, cliente: 'João Silva', km: '45.230' },
  { id: 2, placa: 'DEF-5678', modelo: 'Toyota Corolla', ano: 2019, cliente: 'Maria Santos', km: '62.450' },
  { id: 3, placa: 'GHI-9012', modelo: 'VW Golf', ano: 2021, cliente: 'Pedro Oliveira', km: '28.100' },
  { id: 4, placa: 'JKL-3456', modelo: 'Fiat Argo', ano: 2022, cliente: 'Ana Costa', km: '15.800' },
  { id: 5, placa: 'MNO-7890', modelo: 'Chevrolet Onix', ano: 2020, cliente: 'Carlos Ferreira', km: '52.340' },
];

export default function VeiculosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showOCR, setShowOCR] = useState(false);
  const [formData, setFormData] = useState({
    placa: '',
    marca: '',
    modelo: '',
    ano: '',
    clienteId: '',
  });

  const handleOCRResult = (data: any) => {
    if (data.plate) {
      setFormData(prev => ({ ...prev, placa: data.plate }));
    }
    setShowOCR(false);
  };

  return (
    <div className="min-h-screen bg-[#000000]">
      <Header title="Veículos" subtitle="Cadastro de veículos" />

      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
            <input
              type="text"
              placeholder="Buscar por placa ou modelo..."
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
            Novo Veículo
          </button>
        </div>

        {/* Grid de Veículos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {veiculos.map((veiculo) => (
            <div key={veiculo.id} className="glass-card rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-[#22c55e] to-[#166534]">
                    <Car size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{veiculo.modelo}</h3>
                    <p className="text-sm text-[#6B7280]">{veiculo.ano}</p>
                  </div>
                </div>
                <span className="px-3 py-1.5 bg-[#22c55e]/20 text-[#22c55e] rounded-lg text-sm font-mono font-bold">
                  {veiculo.placa}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6B7280] flex items-center gap-2">
                    <User size={14} /> Proprietário
                  </span>
                  <span className="text-white">{veiculo.cliente}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6B7280]">KM Atual</span>
                  <span className="text-white">{veiculo.km} km</span>
                </div>
              </div>

              <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity">
                <ClipboardList size={16} />
                Nova OS
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Novo Veículo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Novo Veículo</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-lg text-[#6B7280] hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Cliente</label>
                <select
                  value={formData.clienteId}
                  onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]/50"
                >
                  <option value="">Selecione</option>
                  <option value="1">João Silva</option>
                  <option value="2">Maria Santos</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Placa</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ABC-1234"
                    value={formData.placa}
                    onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]/50 uppercase font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOCR(true)}
                    className="px-4 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white hover:opacity-90 transition-opacity"
                    title="Ler placa com câmera"
                  >
                    <Camera size={20} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Marca</label>
                  <input
                    type="text"
                    placeholder="Ex: Honda"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Ano</label>
                  <input
                    type="text"
                    placeholder="2020"
                    value={formData.ano}
                    onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Modelo</label>
                <input
                  type="text"
                  placeholder="Ex: Civic EXL"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
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

      {/* OCR Scanner */}
      {showOCR && (
        <OCRScanner
          type="placa"
          onResult={handleOCRResult}
          onClose={() => setShowOCR(false)}
        />
      )}
    </div>
  );
}
