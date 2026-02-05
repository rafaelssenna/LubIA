'use client';

import Header from '@/components/Header';
import { Plus, Search, Car, User, ClipboardList, X, Camera, Edit, Trash2, Loader2, Gauge } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OCRScanner from '@/components/OCRScanner';
import { useToast } from '@/components/Toast';

interface Cliente {
  id: number;
  nome: string;
  telefone: string;
}

interface Veiculo {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  ano: number | null;
  cor: string | null;
  kmAtual: number | null;
  clienteId: number;
  cliente: Cliente;
}

export default function VeiculosPage() {
  const toast = useToast();
  const router = useRouter();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOCR, setShowOCR] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState<Veiculo | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    placa: '',
    marca: '',
    modelo: '',
    ano: '',
    cor: '',
    kmAtual: '',
    clienteId: '',
  });

  const fetchVeiculos = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('busca', searchTerm);

      const res = await fetch(`/api/veiculos?${params}`);
      const data = await res.json();
      setVeiculos(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar veículos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const res = await fetch('/api/clientes');
      const data = await res.json();
      setClientes(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  useEffect(() => {
    fetchVeiculos();
    fetchClientes();
  }, [searchTerm]);

  const resetForm = () => {
    setForm({
      placa: '',
      marca: '',
      modelo: '',
      ano: '',
      cor: '',
      kmAtual: '',
      clienteId: '',
    });
  };

  const handleSubmit = async () => {
    if (!form.placa || !form.marca || !form.modelo || !form.clienteId) {
      toast.warning('Placa, marca, modelo e cliente são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/veiculos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchVeiculos();
      } else {
        toast.error(data.error || 'Erro ao cadastrar veículo');
      }
    } catch (error) {
      console.error('Erro ao cadastrar veículo:', error);
      toast.error('Erro ao cadastrar veículo');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (veiculo: Veiculo) => {
    setSelectedVeiculo(veiculo);
    setForm({
      placa: veiculo.placa,
      marca: veiculo.marca,
      modelo: veiculo.modelo,
      ano: veiculo.ano?.toString() || '',
      cor: veiculo.cor || '',
      kmAtual: veiculo.kmAtual?.toString() || '',
      clienteId: veiculo.clienteId.toString(),
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedVeiculo) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/veiculos/${selectedVeiculo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setShowEditModal(false);
        setSelectedVeiculo(null);
        resetForm();
        fetchVeiculos();
      } else {
        toast.error(data.error || 'Erro ao atualizar veículo');
      }
    } catch (error) {
      console.error('Erro ao atualizar veículo:', error);
      toast.error('Erro ao atualizar veículo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedVeiculo) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/veiculos/${selectedVeiculo.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        setShowDeleteConfirm(false);
        setSelectedVeiculo(null);
        fetchVeiculos();
      } else {
        toast.error(data.error || 'Erro ao excluir veículo');
      }
    } catch (error) {
      console.error('Erro ao excluir veículo:', error);
      toast.error('Erro ao excluir veículo');
    } finally {
      setSaving(false);
    }
  };

  const handleOCRResult = (data: any) => {
    if (data.plate) {
      setForm(prev => ({ ...prev, placa: data.plate }));
    }
    setShowOCR(false);
  };

  const formatPlate = (placa: string) => {
    const cleaned = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleaned.length === 7) {
      return cleaned;
    }
    return placa;
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      <Header title="Veículos" subtitle="Cadastro de veículos" />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="group relative bg-[#1E1E1E] rounded-2xl p-5 border border-[#333333] hover:border-green-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#43A047]/5">
            <div className="absolute inset-0 bg-gradient-to-br from-[#43A047]/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-[#43A047]/20 to-[#43A047]/5 rounded-xl ring-1 ring-[#43A047]/20">
                <Car size={20} className="text-[#43A047]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#E8E8E8]">{veiculos.length}</p>
                <p className="text-xs text-[#9E9E9E]">Total Veículos</p>
              </div>
            </div>
          </div>
          <div className="group relative bg-[#1E1E1E] rounded-2xl p-5 border border-[#333333] hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-xl ring-1 ring-blue-500/20">
                <User size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#E8E8E8]">{clientes.length}</p>
                <p className="text-xs text-[#9E9E9E]">Clientes</p>
              </div>
            </div>
          </div>
          <div className="group relative bg-[#1E1E1E] rounded-2xl p-5 border border-[#333333] hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 hidden md:block">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-500/5 rounded-xl ring-1 ring-amber-500/20">
                <ClipboardList size={20} className="text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#E8E8E8]">0</p>
                <p className="text-xs text-[#9E9E9E]">O.S. Abertas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={18} />
            <input
              type="text"
              placeholder="Buscar por placa, marca ou modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1E1E1E] border border-[#333333] rounded-xl pl-11 pr-4 py-3 text-sm text-[#E8E8E8] placeholder-[#616161] focus:outline-none focus:border-[#43A047]/50 focus:ring-1 focus:ring-[#43A047]/20 transition-all duration-200"
            />
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#43A047] to-[#1B5E20] rounded-xl text-white font-medium hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 hover:scale-[1.02]"
          >
            <Plus size={18} />
            Novo Veículo
          </button>
        </div>

        {/* Grid de Veículos */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-[#43A047]" size={32} />
          </div>
        ) : veiculos.length === 0 ? (
          <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-12 text-center">
            <div className="p-4 bg-gradient-to-br from-[#43A047]/10 to-transparent rounded-2xl w-fit mx-auto mb-4">
              <Car size={48} className="text-[#9E9E9E]" />
            </div>
            <p className="text-[#9E9E9E]">Nenhum veículo encontrado</p>
            <p className="text-sm text-[#66BB6A] mt-1">Cadastre o primeiro veículo clicando no botão acima</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {veiculos.map((veiculo) => (
              <div key={veiculo.id} className="group bg-[#1E1E1E] border border-[#333333] rounded-2xl p-5 hover:border-green-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#43A047]/5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-[#43A047] to-[#1B5E20] ring-2 ring-[#43A047]/20 group-hover:ring-[#43A047]/40 transition-all duration-300">
                      <Car size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#E8E8E8]">{veiculo.marca} {veiculo.modelo}</h3>
                      <p className="text-sm text-[#9E9E9E]">{veiculo.ano || 'Ano não informado'}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 bg-[#43A047]/10 text-[#43A047] rounded-lg text-sm font-mono font-bold ring-1 ring-[#43A047]/20">
                    {formatPlate(veiculo.placa)}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-[#121212]">
                    <span className="text-[#9E9E9E] flex items-center gap-2">
                      <User size={14} /> Proprietário
                    </span>
                    <span className="text-[#E8E8E8]">{veiculo.cliente.nome}</span>
                  </div>
                  {veiculo.kmAtual && (
                    <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-[#121212]">
                      <span className="text-[#9E9E9E] flex items-center gap-2">
                        <Gauge size={14} /> KM Atual
                      </span>
                      <span className="text-[#E8E8E8]">{veiculo.kmAtual.toLocaleString('pt-BR')} km</span>
                    </div>
                  )}
                  {veiculo.cor && (
                    <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-[#121212]">
                      <span className="text-[#9E9E9E]">Cor</span>
                      <span className="text-[#E8E8E8]">{veiculo.cor}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/ordens?veiculoId=${veiculo.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#43A047] to-[#1B5E20] rounded-xl text-white text-sm font-medium hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300"
                  >
                    <ClipboardList size={16} />
                    Nova O.S.
                  </button>
                  <div className="flex gap-1 p-1 bg-[#121212] rounded-xl ring-1 ring-[#333333]">
                    <button
                      onClick={() => openEditModal(veiculo)}
                      className="p-2 hover:bg-[#121212] rounded-lg text-[#9E9E9E] hover:text-[#E8E8E8] transition-all duration-200"
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedVeiculo(veiculo);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-[#9E9E9E] hover:text-red-400 transition-all duration-200"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Novo Veículo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl w-full max-w-md animate-fade-in max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-[#333333] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#E8E8E8]">Novo Veículo</h2>
                <p className="text-sm text-[#9E9E9E] mt-1">Cadastre um novo veículo</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[#121212] rounded-lg text-[#9E9E9E] hover:text-[#E8E8E8] transition-all duration-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Cliente *</label>
                <select
                  value={form.clienteId}
                  onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
                  className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] focus:outline-none focus:border-[#43A047]/50 focus:ring-1 focus:ring-[#43A047]/20 transition-all duration-200"
                >
                  <option value="">Selecione o cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Placa *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ABC1D23"
                    value={form.placa}
                    onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })}
                    className="flex-1 bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] placeholder-[#616161] focus:outline-none focus:border-[#43A047]/50 focus:ring-1 focus:ring-[#43A047]/20 uppercase font-mono transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOCR(true)}
                    className="px-4 py-3 bg-gradient-to-r from-[#43A047] to-[#1B5E20] rounded-xl text-white hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300"
                    title="Ler placa com câmera"
                  >
                    <Camera size={20} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Marca *</label>
                  <input
                    type="text"
                    placeholder="Ex: Honda"
                    value={form.marca}
                    onChange={(e) => setForm({ ...form, marca: e.target.value })}
                    className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] placeholder-[#616161] focus:outline-none focus:border-[#43A047]/50 focus:ring-1 focus:ring-[#43A047]/20 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Ano</label>
                  <input
                    type="text"
                    placeholder="2020"
                    value={form.ano}
                    onChange={(e) => setForm({ ...form, ano: e.target.value })}
                    className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] placeholder-[#616161] focus:outline-none focus:border-[#43A047]/50 focus:ring-1 focus:ring-[#43A047]/20 transition-all duration-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Modelo *</label>
                <input
                  type="text"
                  placeholder="Ex: Civic EXL"
                  value={form.modelo}
                  onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                  className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] placeholder-[#616161] focus:outline-none focus:border-[#43A047]/50 focus:ring-1 focus:ring-[#43A047]/20 transition-all duration-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Cor</label>
                  <input
                    type="text"
                    placeholder="Ex: Prata"
                    value={form.cor}
                    onChange={(e) => setForm({ ...form, cor: e.target.value })}
                    className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] placeholder-[#616161] focus:outline-none focus:border-[#43A047]/50 focus:ring-1 focus:ring-[#43A047]/20 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">KM Atual</label>
                  <input
                    type="text"
                    placeholder="45000"
                    value={form.kmAtual}
                    onChange={(e) => setForm({ ...form, kmAtual: e.target.value })}
                    className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] placeholder-[#616161] focus:outline-none focus:border-[#43A047]/50 focus:ring-1 focus:ring-[#43A047]/20 transition-all duration-200"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#121212] transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-[#43A047] to-[#1B5E20] rounded-xl text-white font-medium hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Veículo */}
      {showEditModal && selectedVeiculo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl w-full max-w-md animate-fade-in max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-[#333333] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#E8E8E8]">Editar Veículo</h2>
                <p className="text-sm text-[#9E9E9E] mt-1">Atualize as informações do veículo</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-[#121212] rounded-lg text-[#9E9E9E] hover:text-[#E8E8E8] transition-all duration-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Cliente *</label>
                <select
                  value={form.clienteId}
                  onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
                  className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] focus:outline-none focus:border-[#43A047]/50 focus:ring-1 focus:ring-[#43A047]/20 transition-all duration-200"
                >
                  <option value="">Selecione o cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Placa *</label>
                <input
                  type="text"
                  value={form.placa}
                  onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })}
                  className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] focus:outline-none focus:border-[#43A047]/50 focus:ring-1 focus:ring-[#43A047]/20 uppercase font-mono transition-all duration-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Marca *</label>
                  <input
                    type="text"
                    value={form.marca}
                    onChange={(e) => setForm({ ...form, marca: e.target.value })}
                    className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] focus:outline-none focus:border-[#43A047]/50 focus:ring-1 focus:ring-[#43A047]/20 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Ano</label>
                  <input
                    type="text"
                    value={form.ano}
                    onChange={(e) => setForm({ ...form, ano: e.target.value })}
                    className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] focus:outline-none focus:border-[#43A047]/50 focus:ring-1 focus:ring-[#43A047]/20 transition-all duration-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Modelo *</label>
                <input
                  type="text"
                  value={form.modelo}
                  onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                  className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] focus:outline-none focus:border-[#43A047]/50 focus:ring-1 focus:ring-[#43A047]/20 transition-all duration-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Cor</label>
                  <input
                    type="text"
                    value={form.cor}
                    onChange={(e) => setForm({ ...form, cor: e.target.value })}
                    className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] focus:outline-none focus:border-[#43A047]/50 focus:ring-1 focus:ring-[#43A047]/20 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">KM Atual</label>
                  <input
                    type="text"
                    value={form.kmAtual}
                    onChange={(e) => setForm({ ...form, kmAtual: e.target.value })}
                    className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] focus:outline-none focus:border-[#43A047]/50 focus:ring-1 focus:ring-[#43A047]/20 transition-all duration-200"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#121212] transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-[#43A047] to-[#1B5E20] rounded-xl text-white font-medium hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {showDeleteConfirm && selectedVeiculo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl w-full max-w-md animate-fade-in shadow-2xl">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-semibold text-[#E8E8E8]">Confirmar Exclusão</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-500/10 rounded-xl ring-1 ring-red-500/20">
                  <Trash2 size={24} className="text-red-400" />
                </div>
                <div>
                  <p className="text-[#E8E8E8] font-medium">{selectedVeiculo.marca} {selectedVeiculo.modelo}</p>
                  <p className="text-sm text-[#43A047] font-mono">{selectedVeiculo.placa}</p>
                </div>
              </div>
              <p className="text-[#94a3b8] text-sm">
                Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedVeiculo(null);
                }}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#121212] transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-700 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-red-500/20 transition-all duration-300 disabled:opacity-50"
              >
                {saving ? 'Excluindo...' : 'Excluir Veículo'}
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
