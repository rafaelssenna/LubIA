'use client';

import Header from '@/components/Header';
import {
  Plus, Search, X, ClipboardList, Car, User, Calendar, Clock,
  Play, CheckCircle, Pause, XCircle, Truck, Filter, Eye, Edit,
  Trash2, Loader2, Package, Wrench, DollarSign, FileDown
} from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { downloadOrdemPDF } from '@/lib/pdfGenerator';

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
  cliente: Cliente;
}

interface ItemServico {
  id: number;
  servicoId: number;
  servicoNome: string;
  quantidade: number;
  precoUnitario: number;
  desconto: number;
  subtotal: number;
}

interface ItemProduto {
  id: number;
  produtoId: number;
  produtoNome: string;
  quantidade: number;
  precoUnitario: number;
  desconto: number;
  subtotal: number;
}

interface OrdemServico {
  id: number;
  numero: string;
  status: string;
  dataAgendada: string | null;
  dataInicio: string | null;
  dataConclusao: string | null;
  kmEntrada: number | null;
  observacoes: string | null;
  total: number;
  createdAt: string;
  veiculo: Veiculo;
  itens: ItemServico[];
  itensProduto: ItemProduto[];
}

interface Servico {
  id: number;
  nome: string;
  precoBase: number;
  categoria: string;
}

interface Produto {
  id: number;
  nome: string;
  codigo: string;
  precoVenda: number;
  quantidade: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  AGENDADO: { label: 'Agendado', color: 'text-blue-400', icon: Calendar, bg: 'bg-blue-500/20' },
  AGUARDANDO_PECAS: { label: 'Aguardando Peças', color: 'text-amber-400', icon: Pause, bg: 'bg-amber-500/20' },
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'text-purple-400', icon: Play, bg: 'bg-purple-500/20' },
  CONCLUIDO: { label: 'Concluído', color: 'text-[#22c55e]', icon: CheckCircle, bg: 'bg-[#22c55e]/20' },
  CANCELADO: { label: 'Cancelado', color: 'text-red-400', icon: XCircle, bg: 'bg-red-500/20' },
  ENTREGUE: { label: 'Entregue', color: 'text-cyan-400', icon: Truck, bg: 'bg-cyan-500/20' },
};

function OrdensPageContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState({ total: 0, abertas: 0, concluidas: 0, hoje: 0 });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedOrdem, setSelectedOrdem] = useState<OrdemServico | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states for new O.S.
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<number | null>(null);
  const [kmEntrada, setKmEntrada] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [selectedServicos, setSelectedServicos] = useState<{ servicoId: number; quantidade: number; precoUnitario: number }[]>([]);
  const [selectedProdutos, setSelectedProdutos] = useState<{ produtoId: number; quantidade: number; precoUnitario: number }[]>([]);
  const [searchVeiculo, setSearchVeiculo] = useState('');
  const [step, setStep] = useState(1);

  const fetchOrdens = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('busca', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/ordens?${params}`);
      const data = await res.json();
      setOrdens(data.data || []);
      setStats(data.stats || { total: 0, abertas: 0, concluidas: 0, hoje: 0 });
    } catch (error) {
      console.error('Erro ao buscar ordens:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVeiculos = async () => {
    try {
      const res = await fetch('/api/veiculos');
      const data = await res.json();
      setVeiculos(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar veículos:', error);
    }
  };

  const fetchServicos = async () => {
    try {
      const res = await fetch('/api/servicos?ativo=true');
      const data = await res.json();
      setServicos(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
    }
  };

  const fetchProdutos = async () => {
    try {
      const res = await fetch('/api/produtos?ativo=true');
      const data = await res.json();
      setProdutos(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  useEffect(() => {
    fetchOrdens();
  }, [searchTerm, statusFilter]);

  // Check for veiculoId in URL to auto-open modal
  useEffect(() => {
    const veiculoIdParam = searchParams.get('veiculoId');
    if (veiculoIdParam) {
      const veiculoId = parseInt(veiculoIdParam);
      if (!isNaN(veiculoId)) {
        // Fetch data and open modal with pre-selected vehicle, skip to step 2
        Promise.all([
          fetch('/api/veiculos').then(r => r.json()),
          fetch('/api/servicos?ativo=true').then(r => r.json()),
          fetch('/api/produtos?ativo=true').then(r => r.json()),
        ]).then(([veiculosData, servicosData, produtosData]) => {
          setVeiculos(veiculosData.data || []);
          setServicos(servicosData.data || []);
          setProdutos(produtosData.data || []);
          setSelectedVeiculoId(veiculoId);
          setKmEntrada('');
          setObservacoes('');
          setSelectedServicos([]);
          setSelectedProdutos([]);
          setSearchVeiculo('');
          setStep(2); // Skip to services selection since vehicle is pre-selected
          setShowModal(true);
          // Clean URL
          router.replace('/ordens');
        });
      }
    }
  }, [searchParams]);

  const openNewModal = () => {
    fetchVeiculos();
    fetchServicos();
    fetchProdutos();
    setSelectedVeiculoId(null);
    setKmEntrada('');
    setObservacoes('');
    setSelectedServicos([]);
    setSelectedProdutos([]);
    setSearchVeiculo('');
    setStep(1);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!selectedVeiculoId) {
      toast.warning('Selecione um veículo');
      return;
    }

    if (selectedServicos.length === 0 && selectedProdutos.length === 0) {
      toast.warning('Adicione pelo menos um serviço ou produto');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/ordens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          veiculoId: selectedVeiculoId,
          kmEntrada: kmEntrada ? parseInt(kmEntrada) : null,
          observacoes: observacoes || null,
          itens: selectedServicos,
          itensProduto: selectedProdutos,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`O.S. ${data.data.numero} criada com sucesso!`);
        setShowModal(false);
        fetchOrdens();
      } else {
        toast.error(data.error || 'Erro ao criar O.S.');
      }
    } catch (error) {
      console.error('Erro ao criar O.S.:', error);
      toast.error('Erro ao criar O.S.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (ordem: OrdemServico, newStatus: string) => {
    try {
      const res = await fetch(`/api/ordens/${ordem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success('Status atualizado!');
        fetchOrdens();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao atualizar status');
      }
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async () => {
    if (!selectedOrdem) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/ordens/${selectedOrdem.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('O.S. excluída com sucesso!');
        setShowDeleteConfirm(false);
        setSelectedOrdem(null);
        fetchOrdens();
      } else {
        toast.error(data.error || 'Erro ao excluir O.S.');
      }
    } catch (error) {
      toast.error('Erro ao excluir O.S.');
    } finally {
      setSaving(false);
    }
  };

  const addServico = (servico: Servico) => {
    if (selectedServicos.find(s => s.servicoId === servico.id)) {
      toast.warning('Serviço já adicionado');
      return;
    }
    setSelectedServicos([...selectedServicos, {
      servicoId: servico.id,
      quantidade: 1,
      precoUnitario: servico.precoBase,
    }]);
  };

  const removeServico = (servicoId: number) => {
    setSelectedServicos(selectedServicos.filter(s => s.servicoId !== servicoId));
  };

  const addProduto = (produto: Produto) => {
    if (selectedProdutos.find(p => p.produtoId === produto.id)) {
      toast.warning('Produto já adicionado');
      return;
    }
    setSelectedProdutos([...selectedProdutos, {
      produtoId: produto.id,
      quantidade: 1,
      precoUnitario: produto.precoVenda,
    }]);
  };

  const removeProduto = (produtoId: number) => {
    setSelectedProdutos(selectedProdutos.filter(p => p.produtoId !== produtoId));
  };

  const calcularTotal = () => {
    const totalServicos = selectedServicos.reduce((acc, s) => acc + (s.precoUnitario * s.quantidade), 0);
    const totalProdutos = selectedProdutos.reduce((acc, p) => acc + (p.precoUnitario * p.quantidade), 0);
    return totalServicos + totalProdutos;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const filteredVeiculos = veiculos.filter(v =>
    v.placa.toLowerCase().includes(searchVeiculo.toLowerCase()) ||
    v.cliente.nome.toLowerCase().includes(searchVeiculo.toLowerCase()) ||
    `${v.marca} ${v.modelo}`.toLowerCase().includes(searchVeiculo.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]">
      <Header title="Ordens de Serviço" subtitle="Gerencie suas O.S." />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="group relative bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-5 border border-[#2a2a2a] hover:border-[#22c55e]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#22c55e]/5">
            <div className="absolute inset-0 bg-gradient-to-br from-[#22c55e]/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-[#22c55e]/20 to-[#22c55e]/5 rounded-xl ring-1 ring-[#22c55e]/20">
                <ClipboardList size={22} className="text-[#22c55e]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white tracking-tight">{stats.total}</p>
                <p className="text-sm text-[#888888] font-medium">Total O.S.</p>
              </div>
            </div>
          </div>
          <div className="group relative bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-5 border border-[#2a2a2a] hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-xl ring-1 ring-purple-500/20">
                <Play size={22} className="text-purple-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white tracking-tight">{stats.abertas}</p>
                <p className="text-sm text-[#888888] font-medium">Em Aberto</p>
              </div>
            </div>
          </div>
          <div className="group relative bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-5 border border-[#2a2a2a] hover:border-cyan-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/5">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 rounded-xl ring-1 ring-cyan-500/20">
                <CheckCircle size={22} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white tracking-tight">{stats.concluidas}</p>
                <p className="text-sm text-[#888888] font-medium">Concluídas</p>
              </div>
            </div>
          </div>
          <div className="group relative bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-5 border border-[#2a2a2a] hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-xl ring-1 ring-blue-500/20">
                <Calendar size={22} className="text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white tracking-tight">{stats.hoje}</p>
                <p className="text-sm text-[#888888] font-medium">Hoje</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-4">
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666666] group-focus-within:text-[#22c55e] transition-colors" size={18} />
              <input
                type="text"
                placeholder="Buscar por número, placa ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e]/50 focus:ring-2 focus:ring-[#22c55e]/10 transition-all duration-200"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#141414] border border-[#2a2a2a] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#22c55e]/50 focus:ring-2 focus:ring-[#22c55e]/10 transition-all duration-200 cursor-pointer"
            >
              <option value="">Todos os Status</option>
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#22c55e] to-[#16a34a] rounded-xl text-white font-semibold shadow-lg shadow-[#22c55e]/20 hover:shadow-xl hover:shadow-[#22c55e]/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <Plus size={18} strokeWidth={2.5} />
            Nova O.S.
          </button>
        </div>

        {/* Lista de O.S. */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-2xl p-12 text-center">
              <Loader2 className="animate-spin mx-auto mb-3 text-[#22c55e]" size={36} />
              <p className="text-[#666666]">Carregando...</p>
            </div>
          ) : ordens.length === 0 ? (
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-2xl p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#222222] rounded-2xl flex items-center justify-center">
                <ClipboardList className="text-[#444444]" size={32} />
              </div>
              <p className="text-[#666666] font-medium">Nenhuma O.S. encontrada</p>
              <p className="text-[#444444] text-sm mt-1">Crie uma nova ordem de serviço</p>
            </div>
          ) : (
            ordens.map((ordem) => {
              const status = statusConfig[ordem.status] || statusConfig.AGENDADO;
              const StatusIcon = status.icon;
              return (
                <div
                  key={ordem.id}
                  className="group relative bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-2xl p-5 hover:border-[#3a3a3a] hover:shadow-xl hover:shadow-black/20 transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3.5 ${status.bg} rounded-xl ring-1 ring-white/5`}>
                        <StatusIcon size={24} className={status.color} />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-white tracking-tight">#{ordem.numero.slice(-8).toUpperCase()}</span>
                          <span className={`px-2.5 py-1 ${status.bg} rounded-lg text-xs font-semibold ${status.color} ring-1 ring-white/10`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#999999]">
                          <span className="flex items-center gap-1.5">
                            <Car size={14} className="text-[#22c55e]" />
                            <span className="font-medium text-white/80">{ordem.veiculo.placa}</span>
                            <span className="text-[#666666]">•</span>
                            {ordem.veiculo.marca} {ordem.veiculo.modelo}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <User size={14} className="text-blue-400" />
                            {ordem.veiculo.cliente.nome}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-[#666666]">
                          <span>{formatDateTime(ordem.createdAt)}</span>
                          {ordem.dataAgendada && (
                            <>
                              <span className="text-[#333333]">•</span>
                              <span>Agendada: {formatDate(ordem.dataAgendada)}</span>
                            </>
                          )}
                          <span className="text-[#22c55e] font-bold text-sm">{formatCurrency(ordem.total)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Quick Status Change */}
                      {ordem.status === 'AGENDADO' && (
                        <button
                          onClick={() => handleStatusChange(ordem, 'EM_ANDAMENTO')}
                          className="px-4 py-2 bg-purple-500/10 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/20 ring-1 ring-purple-500/20 hover:ring-purple-500/40 transition-all duration-200"
                        >
                          Iniciar
                        </button>
                      )}
                      {ordem.status === 'EM_ANDAMENTO' && (
                        <button
                          onClick={() => handleStatusChange(ordem, 'CONCLUIDO')}
                          className="px-4 py-2 bg-[#22c55e]/10 text-[#22c55e] rounded-lg text-sm font-medium hover:bg-[#22c55e]/20 ring-1 ring-[#22c55e]/20 hover:ring-[#22c55e]/40 transition-all duration-200"
                        >
                          Concluir
                        </button>
                      )}
                      {ordem.status === 'CONCLUIDO' && (
                        <button
                          onClick={() => handleStatusChange(ordem, 'ENTREGUE')}
                          className="px-4 py-2 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/20 ring-1 ring-cyan-500/20 hover:ring-cyan-500/40 transition-all duration-200"
                        >
                          Entregar
                        </button>
                      )}
                      <div className="flex items-center gap-1 ml-2 p-1 bg-[#1a1a1a] rounded-lg ring-1 ring-[#2a2a2a]">
                        <button
                          onClick={() => downloadOrdemPDF(ordem)}
                          className="p-2 hover:bg-[#22c55e]/10 rounded-md text-[#666666] hover:text-[#22c55e] transition-all duration-200"
                          title="Baixar PDF"
                        >
                          <FileDown size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrdem(ordem);
                            setShowDetailModal(true);
                          }}
                          className="p-2 hover:bg-blue-500/10 rounded-md text-[#666666] hover:text-blue-400 transition-all duration-200"
                          title="Ver detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        {ordem.status !== 'CONCLUIDO' && ordem.status !== 'ENTREGUE' && (
                          <button
                            onClick={() => {
                              setSelectedOrdem(ordem);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 hover:bg-red-500/10 rounded-md text-[#666666] hover:text-red-400 transition-all duration-200"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Nova O.S. */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-in flex flex-col">
            <div className="p-6 border-b border-[#333333] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Nova Ordem de Serviço</h2>
                <p className="text-sm text-[#6B7280] mt-1">Passo {step} de 3</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[#333333] rounded-lg text-[#6B7280] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Step 1: Select Vehicle */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                    <input
                      type="text"
                      placeholder="Buscar veículo por placa, cliente ou modelo..."
                      value={searchVeiculo}
                      onChange={(e) => setSearchVeiculo(e.target.value)}
                      className="w-full bg-[#000000] border border-[#333333] rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                    />
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {filteredVeiculos.length === 0 ? (
                      <p className="text-center text-[#6B7280] py-4">Nenhum veículo encontrado</p>
                    ) : (
                      filteredVeiculos.map((veiculo) => (
                        <button
                          key={veiculo.id}
                          onClick={() => setSelectedVeiculoId(veiculo.id)}
                          className={`w-full p-4 rounded-xl text-left transition-colors ${
                            selectedVeiculoId === veiculo.id
                              ? 'bg-[#22c55e]/20 border-2 border-[#22c55e]'
                              : 'bg-[#000000] border border-[#333333] hover:border-[#444444]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                              <Car size={20} className="text-blue-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{veiculo.placa}</span>
                                <span className="text-[#94a3b8]">{veiculo.marca} {veiculo.modelo}</span>
                                {veiculo.ano && <span className="text-[#6B7280]">({veiculo.ano})</span>}
                              </div>
                              <p className="text-sm text-[#6B7280]">{veiculo.cliente.nome}</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  {selectedVeiculoId && (
                    <div className="pt-4 border-t border-[#333333]">
                      <label className="block text-sm font-medium text-[#94a3b8] mb-2">KM de Entrada</label>
                      <input
                        type="number"
                        value={kmEntrada}
                        onChange={(e) => setKmEntrada(e.target.value)}
                        placeholder="Ex: 45000"
                        className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Select Services */}
              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-[#94a3b8]">Serviços Disponíveis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                    {servicos.map((servico) => (
                      <button
                        key={servico.id}
                        onClick={() => addServico(servico)}
                        disabled={selectedServicos.some(s => s.servicoId === servico.id)}
                        className="p-3 bg-[#000000] border border-[#333333] rounded-xl text-left hover:border-[#22c55e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wrench size={16} className="text-[#22c55e]" />
                            <span className="text-white text-sm">{servico.nome}</span>
                          </div>
                          <span className="text-[#22c55e] text-sm font-medium">{formatCurrency(servico.precoBase)}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedServicos.length > 0 && (
                    <div className="pt-4 border-t border-[#333333]">
                      <h3 className="text-sm font-medium text-[#94a3b8] mb-2">Serviços Selecionados</h3>
                      <div className="space-y-2">
                        {selectedServicos.map((item) => {
                          const servico = servicos.find(s => s.id === item.servicoId);
                          return (
                            <div key={item.servicoId} className="flex items-center justify-between p-3 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-xl">
                              <span className="text-white">{servico?.nome}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[#22c55e]">{formatCurrency(item.precoUnitario)}</span>
                                <button
                                  onClick={() => removeServico(item.servicoId)}
                                  className="p-1 hover:bg-red-500/20 rounded text-red-400"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-[#333333]">
                    <h3 className="text-sm font-medium text-[#94a3b8] mb-2">Produtos (opcional)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                      {produtos.slice(0, 10).map((produto) => (
                        <button
                          key={produto.id}
                          onClick={() => addProduto(produto)}
                          disabled={selectedProdutos.some(p => p.produtoId === produto.id)}
                          className="p-3 bg-[#000000] border border-[#333333] rounded-xl text-left hover:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Package size={16} className="text-blue-400" />
                              <span className="text-white text-sm truncate">{produto.nome}</span>
                            </div>
                            <span className="text-blue-400 text-sm font-medium">{formatCurrency(produto.precoVenda)}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {selectedProdutos.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-xs text-[#6B7280]">Produtos Selecionados</h4>
                        {selectedProdutos.map((item) => {
                          const produto = produtos.find(p => p.id === item.produtoId);
                          return (
                            <div key={item.produtoId} className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                              <span className="text-white text-sm">{produto?.nome}</span>
                              <div className="flex items-center gap-3">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantidade}
                                  onChange={(e) => {
                                    const qtd = parseFloat(e.target.value) || 1;
                                    setSelectedProdutos(selectedProdutos.map(p =>
                                      p.produtoId === item.produtoId ? { ...p, quantidade: qtd } : p
                                    ));
                                  }}
                                  className="w-16 bg-[#000000] border border-[#333333] rounded px-2 py-1 text-white text-sm text-center"
                                />
                                <span className="text-blue-400">{formatCurrency(item.precoUnitario * item.quantidade)}</span>
                                <button
                                  onClick={() => removeProduto(item.produtoId)}
                                  className="p-1 hover:bg-red-500/20 rounded text-red-400"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#000000] rounded-xl">
                    <h3 className="text-sm font-medium text-[#94a3b8] mb-2">Veículo</h3>
                    {selectedVeiculoId && (() => {
                      const veiculo = veiculos.find(v => v.id === selectedVeiculoId);
                      return veiculo ? (
                        <div>
                          <p className="text-white font-bold">{veiculo.placa} - {veiculo.marca} {veiculo.modelo}</p>
                          <p className="text-sm text-[#6B7280]">{veiculo.cliente.nome}</p>
                          {kmEntrada && <p className="text-sm text-[#6B7280]">KM: {kmEntrada}</p>}
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {selectedServicos.length > 0 && (
                    <div className="p-4 bg-[#000000] rounded-xl">
                      <h3 className="text-sm font-medium text-[#94a3b8] mb-2">Serviços</h3>
                      {selectedServicos.map((item) => {
                        const servico = servicos.find(s => s.id === item.servicoId);
                        return (
                          <div key={item.servicoId} className="flex justify-between py-1">
                            <span className="text-white">{servico?.nome}</span>
                            <span className="text-[#22c55e]">{formatCurrency(item.precoUnitario)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedProdutos.length > 0 && (
                    <div className="p-4 bg-[#000000] rounded-xl">
                      <h3 className="text-sm font-medium text-[#94a3b8] mb-2">Produtos</h3>
                      {selectedProdutos.map((item) => {
                        const produto = produtos.find(p => p.id === item.produtoId);
                        return (
                          <div key={item.produtoId} className="flex justify-between py-1">
                            <span className="text-white">{produto?.nome} x{item.quantidade}</span>
                            <span className="text-blue-400">{formatCurrency(item.precoUnitario * item.quantidade)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="p-4 bg-[#000000] rounded-xl">
                    <label className="block text-sm font-medium text-[#94a3b8] mb-2">Observações</label>
                    <textarea
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Observações adicionais..."
                      rows={3}
                      className="w-full bg-[#1F1F1F] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e] resize-none"
                    />
                  </div>

                  <div className="p-4 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-white">Total</span>
                      <span className="text-2xl font-bold text-[#22c55e]">{formatCurrency(calcularTotal())}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#333333] flex gap-3 justify-between">
              <button
                onClick={() => step > 1 ? setStep(step - 1) : setShowModal(false)}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
              >
                {step > 1 ? 'Voltar' : 'Cancelar'}
              </button>
              {step < 3 ? (
                <button
                  onClick={() => {
                    if (step === 1 && !selectedVeiculoId) {
                      toast.warning('Selecione um veículo');
                      return;
                    }
                    setStep(step + 1);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
                >
                  Próximo
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? 'Criando...' : 'Criar O.S.'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {showDetailModal && selectedOrdem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="p-6 border-b border-[#333333] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">O.S. #{selectedOrdem.numero.slice(-8).toUpperCase()}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {(() => {
                    const status = statusConfig[selectedOrdem.status];
                    return (
                      <span className={`px-2 py-0.5 ${status.bg} rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-[#333333] rounded-lg text-[#6B7280] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Vehicle & Client Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#000000] rounded-xl">
                  <div className="flex items-center gap-2 text-[#6B7280] mb-2">
                    <Car size={16} />
                    <span className="text-xs">Veículo</span>
                  </div>
                  <p className="text-white font-bold">{selectedOrdem.veiculo.placa}</p>
                  <p className="text-sm text-[#94a3b8]">{selectedOrdem.veiculo.marca} {selectedOrdem.veiculo.modelo}</p>
                </div>
                <div className="p-4 bg-[#000000] rounded-xl">
                  <div className="flex items-center gap-2 text-[#6B7280] mb-2">
                    <User size={16} />
                    <span className="text-xs">Cliente</span>
                  </div>
                  <p className="text-white font-bold">{selectedOrdem.veiculo.cliente.nome}</p>
                  <p className="text-sm text-[#94a3b8]">{selectedOrdem.veiculo.cliente.telefone}</p>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-[#000000] rounded-xl">
                  <p className="text-xs text-[#6B7280] mb-1">Criada em</p>
                  <p className="text-white">{formatDateTime(selectedOrdem.createdAt)}</p>
                </div>
                {selectedOrdem.dataInicio && (
                  <div className="p-4 bg-[#000000] rounded-xl">
                    <p className="text-xs text-[#6B7280] mb-1">Iniciada em</p>
                    <p className="text-white">{formatDateTime(selectedOrdem.dataInicio)}</p>
                  </div>
                )}
                {selectedOrdem.dataConclusao && (
                  <div className="p-4 bg-[#000000] rounded-xl">
                    <p className="text-xs text-[#6B7280] mb-1">Concluída em</p>
                    <p className="text-white">{formatDateTime(selectedOrdem.dataConclusao)}</p>
                  </div>
                )}
              </div>

              {/* Services */}
              {selectedOrdem.itens.length > 0 && (
                <div className="p-4 bg-[#000000] rounded-xl">
                  <h3 className="text-sm font-medium text-[#94a3b8] mb-3 flex items-center gap-2">
                    <Wrench size={16} className="text-[#22c55e]" />
                    Serviços
                  </h3>
                  <div className="space-y-2">
                    {selectedOrdem.itens.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-white">{item.servicoNome}</span>
                        <span className="text-[#22c55e]">{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              {selectedOrdem.itensProduto.length > 0 && (
                <div className="p-4 bg-[#000000] rounded-xl">
                  <h3 className="text-sm font-medium text-[#94a3b8] mb-3 flex items-center gap-2">
                    <Package size={16} className="text-blue-400" />
                    Produtos
                  </h3>
                  <div className="space-y-2">
                    {selectedOrdem.itensProduto.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-white">{item.produtoNome} x{item.quantidade}</span>
                        <span className="text-blue-400">{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observations */}
              {selectedOrdem.observacoes && (
                <div className="p-4 bg-[#000000] rounded-xl">
                  <p className="text-xs text-[#6B7280] mb-1">Observações</p>
                  <p className="text-white">{selectedOrdem.observacoes}</p>
                </div>
              )}

              {/* Total */}
              <div className="p-4 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-white">Total</span>
                  <span className="text-2xl font-bold text-[#22c55e]">{formatCurrency(selectedOrdem.total)}</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              <button
                onClick={() => downloadOrdemPDF(selectedOrdem)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
              >
                <FileDown size={18} />
                Baixar PDF
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {showDeleteConfirm && selectedOrdem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl w-full max-w-md animate-fade-in">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-semibold text-white">Confirmar Exclusão</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-500/20 rounded-xl">
                  <Trash2 size={24} className="text-red-400" />
                </div>
                <div>
                  <p className="text-white font-medium">O.S. #{selectedOrdem.numero.slice(-8).toUpperCase()}</p>
                  <p className="text-sm text-[#6B7280]">{selectedOrdem.veiculo.placa} - {selectedOrdem.veiculo.cliente.nome}</p>
                </div>
              </div>
              <p className="text-[#94a3b8] text-sm">
                Tem certeza que deseja excluir esta O.S.? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedOrdem(null);
                }}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-700 rounded-xl text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Excluindo...' : 'Excluir O.S.'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdensPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#000000]">
        <Header title="Ordens de Serviço" subtitle="Gerencie suas O.S." />
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="animate-spin text-[#22c55e]" size={32} />
        </div>
      </div>
    }>
      <OrdensPageContent />
    </Suspense>
  );
}
