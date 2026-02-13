'use client';

import Header from '@/components/Header';
import {
  Plus, Search, X, ClipboardList, Car, User, Calendar, Clock,
  Play, CheckCircle, Pause, XCircle, Truck, Filter, Eye, Edit,
  Trash2, Loader2, Package, Wrench, DollarSign, FileDown,
  List, CalendarDays, ChevronLeft, ChevronRight, AlertCircle, Gauge
} from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { downloadOrdemPDF, EmpresaConfig } from '@/lib/pdfGenerator';
import { capitalize, formatPlate } from '@/utils/format';

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
  kmAtual: number | null;
  cliente: Cliente;
}

interface ServicoExtra {
  id?: number;
  descricao: string;
  valor: number;
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
  servicosExtras: ServicoExtra[];
  itensProduto: ItemProduto[];
}

interface Produto {
  id: number;
  nome: string;
  codigo: string;
  precoVenda: number;
  quantidade: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  AGENDADO: { label: 'Agendado', color: 'text-blue-400', icon: Calendar, bg: 'bg-blue-500/10' },
  AGUARDANDO_PECAS: { label: 'Aguardando Peças', color: 'text-amber-400', icon: Pause, bg: 'bg-amber-500/10' },
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'text-purple-400', icon: Play, bg: 'bg-purple-500/10' },
  CONCLUIDO: { label: 'Concluído', color: 'text-[#43A047]', icon: CheckCircle, bg: 'bg-green-500/10' },
  CANCELADO: { label: 'Cancelado', color: 'text-red-500', icon: XCircle, bg: 'bg-red-500/10' },
  ENTREGUE: { label: 'Entregue', color: 'text-cyan-400', icon: Truck, bg: 'bg-cyan-500/10' },
};

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const horasTrabalho = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

function OrdensPageContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState({ total: 0, abertas: 0, concluidas: 0, hoje: 0 });
  const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('calendario');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedOrdem, setSelectedOrdem] = useState<OrdemServico | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states for new O.S.
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<number | null>(null);
  const [kmEntrada, setKmEntrada] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [servicosExtras, setServicosExtras] = useState<{ descricao: string; valor: number }[]>([]);
  const [selectedProdutos, setSelectedProdutos] = useState<{ produtoId: number; quantidade: number; precoUnitario: number }[]>([]);
  const [searchVeiculo, setSearchVeiculo] = useState('');
  const [searchProduto, setSearchProduto] = useState('');
  const [step, setStep] = useState(1);
  const [dataAgendada, setDataAgendada] = useState('');
  const [editingOrdem, setEditingOrdem] = useState<OrdemServico | null>(null);
  const [novoServicoExtra, setNovoServicoExtra] = useState({ descricao: '', valor: '' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;

  // Empresa config for PDF
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig | null>(null);

  const fetchOrdens = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('busca', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());

      const res = await fetch(`/api/ordens?${params}`);
      const data = await res.json();
      setOrdens(data.data || []);
      setStats(data.stats || { total: 0, abertas: 0, concluidas: 0, hoje: 0 });
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      }
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

  const fetchProdutos = async () => {
    try {
      const res = await fetch('/api/produtos?ativo=true');
      const data = await res.json();
      setProdutos(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  const fetchEmpresaConfig = async () => {
    try {
      const res = await fetch('/api/configuracoes');
      const data = await res.json();
      if (data.data) {
        setEmpresaConfig({
          nomeOficina: data.data.nomeOficina,
          cnpj: data.data.cnpj,
          telefone: data.data.telefone,
          endereco: data.data.endereco,
        });
      }
    } catch (error) {
      console.error('Erro ao buscar config da empresa:', error);
    }
  };

  useEffect(() => {
    fetchOrdens();
    fetchEmpresaConfig();
  }, [searchTerm, statusFilter, currentPage]);

  // Reset para página 1 ao mudar filtros
  useEffect(() => {
    setCurrentPage(1);
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
          fetch('/api/produtos?ativo=true').then(r => r.json()),
        ]).then(([veiculosData, produtosData]) => {
          setVeiculos(veiculosData.data || []);
          setProdutos(produtosData.data || []);
          setSelectedVeiculoId(veiculoId);
          // Auto-fill KM from vehicle's current KM
          const selectedVeiculo = (veiculosData.data || []).find((v: Veiculo) => v.id === veiculoId);
          setKmEntrada(selectedVeiculo?.kmAtual?.toString() || '');
          setObservacoes('');
          setServicosExtras([]);
          setSelectedProdutos([]);
          setSearchVeiculo('');
          setSearchProduto('');
          setStep(2); // Skip to products selection since vehicle is pre-selected
          setShowModal(true);
          // Clean URL
          router.replace('/ordens');
        });
      }
    }
  }, [searchParams]);

  const openNewModal = (presetDate?: string) => {
    fetchVeiculos();
    fetchProdutos();
    setEditingOrdem(null);
    setSelectedVeiculoId(null);
    setKmEntrada('');
    setObservacoes('');
    setDataAgendada(presetDate || '');
    setServicosExtras([]);
    setSelectedProdutos([]);
    setSearchVeiculo('');
    setSearchProduto('');
    setNovoServicoExtra({ descricao: '', valor: '' });
    setStep(1);
    setShowModal(true);
  };

  const openNewModalFromCalendar = (date: Date, hora: string) => {
    const [hours, minutes] = hora.split(':');
    const scheduledDate = new Date(date);
    scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    // Formatar em timezone local (YYYY-MM-DDTHH:MM)
    const year = scheduledDate.getFullYear();
    const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
    const day = String(scheduledDate.getDate()).padStart(2, '0');
    const hour = String(scheduledDate.getHours()).padStart(2, '0');
    const min = String(scheduledDate.getMinutes()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}T${hour}:${min}`;
    openNewModal(formattedDate);
  };

  const openEditModal = (ordem: OrdemServico) => {
    if (ordem.status !== 'AGENDADO' && ordem.status !== 'EM_ANDAMENTO') {
      toast.warning('Apenas O.S. com status Agendado ou Em Andamento podem ser editadas');
      return;
    }

    fetchVeiculos();
    fetchProdutos();

    setEditingOrdem(ordem);
    setSelectedVeiculoId(ordem.veiculo.id);
    setKmEntrada(ordem.kmEntrada?.toString() || '');
    setObservacoes(ordem.observacoes || '');
    setDataAgendada(ordem.dataAgendada
      ? new Date(ordem.dataAgendada).toISOString().slice(0, 16)
      : '');
    setServicosExtras(ordem.servicosExtras?.map(s => ({
      descricao: s.descricao,
      valor: s.valor,
    })) || []);
    setSelectedProdutos(ordem.itensProduto.map(i => ({
      produtoId: i.produtoId,
      quantidade: i.quantidade,
      precoUnitario: i.precoUnitario,
    })));
    setSearchVeiculo('');
    setSearchProduto('');
    setNovoServicoExtra({ descricao: '', valor: '' });
    setStep(1);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!selectedVeiculoId) {
      toast.warning('Selecione um veículo');
      return;
    }

    if (servicosExtras.length === 0 && selectedProdutos.length === 0) {
      toast.warning('Adicione pelo menos um produto ou serviço extra');
      return;
    }

    const isEditing = !!editingOrdem;
    setSaving(true);
    try {
      const payload = {
        veiculoId: selectedVeiculoId,
        kmEntrada: kmEntrada ? parseInt(kmEntrada) : null,
        observacoes: observacoes || null,
        dataAgendada: dataAgendada || null,
        servicosExtras: servicosExtras,
        itensProduto: selectedProdutos,
      };

      const url = isEditing ? `/api/ordens/${editingOrdem.id}` : '/api/ordens';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(isEditing
          ? 'O.S. atualizada com sucesso!'
          : `O.S. ${data.data.numero} criada com sucesso!`
        );
        setShowModal(false);
        setEditingOrdem(null);
        fetchOrdens();
      } else {
        toast.error(data.error || `Erro ao ${isEditing ? 'atualizar' : 'criar'} O.S.`);
      }
    } catch (error) {
      console.error(`Erro ao ${isEditing ? 'atualizar' : 'criar'} O.S.:`, error);
      toast.error(`Erro ao ${isEditing ? 'atualizar' : 'criar'} O.S.`);
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

  const addServicoExtra = () => {
    if (!novoServicoExtra.descricao.trim() || !novoServicoExtra.valor) {
      toast.warning('Preencha a descrição e o valor do serviço');
      return;
    }
    setServicosExtras([...servicosExtras, {
      descricao: novoServicoExtra.descricao,
      valor: parseFloat(novoServicoExtra.valor),
    }]);
    setNovoServicoExtra({ descricao: '', valor: '' });
  };

  const removeServicoExtra = (index: number) => {
    setServicosExtras(servicosExtras.filter((_, i) => i !== index));
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
    const totalExtras = servicosExtras.reduce((acc, s) => acc + s.valor, 0);
    const totalProdutos = selectedProdutos.reduce((acc, p) => acc + (p.precoUnitario * p.quantidade), 0);
    return totalExtras + totalProdutos;
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

  // Calendar helpers
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

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const getOrdensForDateAndHour = (date: Date, hora: string) => {
    return ordens.filter(o => {
      if (!o.dataAgendada) return false;
      const oDate = new Date(o.dataAgendada);
      // Comparar apenas a hora (slot de 1 hora), não os minutos exatos
      const oHour = oDate.getHours().toString().padStart(2, '0') + ':00';
      return oDate.getDate() === date.getDate() &&
             oDate.getMonth() === date.getMonth() &&
             oDate.getFullYear() === date.getFullYear() &&
             oHour === hora;
    });
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#121212]/50">
      <Header title="Ordens de Serviço" subtitle="Gerencie suas O.S." />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="group relative bg-[#1E1E1E] rounded-2xl p-5 border border-[#333333] hover:border-green-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/5">
            <div className="absolute inset-0 bg-gradient-to-br from-[#43A047]/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-[#43A047]/20 to-[#43A047]/5 rounded-xl ring-1 ring-[#43A047]/20">
                <ClipboardList size={22} className="text-[#43A047]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-[#E8E8E8] tracking-tight">{stats.total}</p>
                <p className="text-sm text-[#9E9E9E] font-medium">Total O.S.</p>
              </div>
            </div>
          </div>
          <div className="group relative bg-[#1E1E1E] rounded-2xl p-5 border border-[#333333] hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-xl ring-1 ring-purple-500/20">
                <Play size={22} className="text-purple-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-[#E8E8E8] tracking-tight">{stats.abertas}</p>
                <p className="text-sm text-[#9E9E9E] font-medium">Em Aberto</p>
              </div>
            </div>
          </div>
          <div className="group relative bg-[#1E1E1E] rounded-2xl p-5 border border-[#333333] hover:border-cyan-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/5">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 rounded-xl ring-1 ring-cyan-500/20">
                <CheckCircle size={22} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-[#E8E8E8] tracking-tight">{stats.concluidas}</p>
                <p className="text-sm text-[#9E9E9E] font-medium">Concluídas</p>
              </div>
            </div>
          </div>
          <div className="group relative bg-[#1E1E1E] rounded-2xl p-5 border border-[#333333] hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-xl ring-1 ring-blue-500/20">
                <Calendar size={22} className="text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-[#E8E8E8] tracking-tight">{stats.hoje}</p>
                <p className="text-sm text-[#9E9E9E] font-medium">Hoje</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-4 items-center">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-[#1E1E1E] border border-[#333333] rounded-xl p-1">
              <button
                onClick={() => setViewMode('lista')}
                className={`p-2.5 rounded-lg transition-all duration-200 ${
                  viewMode === 'lista'
                    ? 'bg-gradient-to-r from-[#43A047] to-[#1B5E20] text-white shadow-lg shadow-green-500/10'
                    : 'text-[#9E9E9E] hover:text-[#E8E8E8] hover:bg-[#121212]'
                }`}
                title="Lista"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('calendario')}
                className={`p-2.5 rounded-lg transition-all duration-200 ${
                  viewMode === 'calendario'
                    ? 'bg-gradient-to-r from-[#43A047] to-[#1B5E20] text-white shadow-lg shadow-green-500/10'
                    : 'text-[#9E9E9E] hover:text-[#E8E8E8] hover:bg-[#121212]'
                }`}
                title="Calendário"
              >
                <CalendarDays size={18} />
              </button>
            </div>

            {viewMode === 'lista' ? (
              <>
                <div className="relative flex-1 max-w-md group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9E9E9E] group-focus-within:text-[#43A047] transition-colors" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por número, placa ou cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#1E1E1E] border border-[#333333] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#E8E8E8] placeholder-gray-400 focus:outline-none focus:border-[#43A047]/50 focus:ring-2 focus:ring-[#43A047]/10 transition-all duration-200"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#1E1E1E] border border-[#333333] rounded-xl px-4 py-3.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-[#43A047]/50 focus:ring-2 focus:ring-[#43A047]/10 transition-all duration-200 cursor-pointer"
                >
                  <option value="">Todos os Status</option>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateWeek(-1)}
                  className="p-2.5 bg-[#1E1E1E] border border-[#333333] rounded-lg text-[#9E9E9E] hover:text-[#E8E8E8] hover:border-green-500/30 transition-all duration-200"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-[#E8E8E8] font-medium px-4 min-w-[160px] text-center capitalize">
                  {formatMonthYear(currentDate)}
                </span>
                <button
                  onClick={() => navigateWeek(1)}
                  className="p-2.5 bg-[#1E1E1E] border border-[#333333] rounded-lg text-[#9E9E9E] hover:text-[#E8E8E8] hover:border-green-500/30 transition-all duration-200"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2.5 bg-[#1E1E1E] border border-[#333333] rounded-lg text-[#9E9E9E] hover:text-[#43A047] hover:border-green-500/30 transition-all duration-200 text-sm font-medium"
                >
                  Hoje
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => openNewModal()}
            className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#43A047] to-[#16a34a] rounded-xl text-white font-semibold shadow-lg shadow-green-500/10 hover:shadow-xl hover:shadow-green-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <Plus size={18} strokeWidth={2.5} />
            Nova O.S.
          </button>
        </div>

        {/* Calendar View */}
        {viewMode === 'calendario' && (
          <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl overflow-hidden">
            {/* Calendar Header */}
            <div className="grid grid-cols-8 border-b border-[#333333]">
              <div className="p-4 text-[#9E9E9E] text-sm font-medium">Horario</div>
              {weekDays.map((date, idx) => {
                const isTodayDate = isToday(date);
                return (
                  <div
                    key={idx}
                    className={`p-4 text-center border-l border-[#333333] ${isTodayDate ? 'bg-green-500/10' : ''}`}
                  >
                    <p className="text-[#9E9E9E] text-xs">{diasSemana[idx]}</p>
                    <p className={`text-lg font-bold ${isTodayDate ? 'text-[#43A047]' : 'text-[#E8E8E8]'}`}>
                      {date.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Calendar Body */}
            <div className="max-h-[600px] overflow-y-auto">
              {horasTrabalho.map((hora) => (
                <div key={hora} className="grid grid-cols-8 border-b border-[#333333]/50 min-h-[80px]">
                  <div className="p-3 text-[#9E9E9E] text-sm border-r border-[#333333]/50">
                    {hora}
                  </div>
                  {weekDays.map((date, idx) => {
                    const diaOrdens = getOrdensForDateAndHour(date, hora);
                    const isTodayDate = isToday(date);

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (diaOrdens.length === 0) {
                            openNewModalFromCalendar(date, hora);
                          }
                        }}
                        className={`p-1 border-l border-[#333333]/50 relative ${isTodayDate ? 'bg-green-500/10/50' : ''} hover:bg-[#121212] transition-all duration-200 ${diaOrdens.length === 0 ? 'cursor-pointer group' : ''}`}
                      >
                        {diaOrdens.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus size={20} className="text-[#43A047]" />
                          </div>
                        )}
                        {diaOrdens.map((ordem) => {
                          const status = statusConfig[ordem.status] || statusConfig.AGENDADO;
                          return (
                            <div
                              key={ordem.id}
                              onClick={() => {
                                setSelectedOrdem(ordem);
                                setShowDetailModal(true);
                              }}
                              className={`p-2 rounded-lg text-xs ${status.bg} ${status.color} border border-[#333333] mb-1 hover:scale-[1.02] transition-transform duration-200 cursor-pointer`}
                            >
                              <p className="font-semibold truncate">{capitalize(ordem.veiculo.cliente.nome)}</p>
                              <p className="truncate opacity-90">{formatPlate(ordem.veiculo.placa)}</p>
                              <p className="truncate opacity-75">{ordem.itensProduto[0]?.produtoNome || ordem.servicosExtras?.[0]?.descricao || 'O.S.'}</p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de O.S. */}
        {viewMode === 'lista' && (
        <>
        <div className="space-y-3">
          {loading ? (
            <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-12 text-center">
              <Loader2 className="animate-spin mx-auto mb-3 text-[#43A047]" size={36} />
              <p className="text-[#9E9E9E]">Carregando...</p>
            </div>
          ) : ordens.length === 0 ? (
            <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#2A2A2A] rounded-2xl flex items-center justify-center">
                <ClipboardList className="text-[#66BB6A]" size={32} />
              </div>
              <p className="text-[#9E9E9E] font-medium">Nenhuma O.S. encontrada</p>
              <p className="text-[#66BB6A] text-sm mt-1">Crie uma nova ordem de servico</p>
            </div>
          ) : (
            ordens.map((ordem) => {
              const statusCfg = statusConfig[ordem.status] || statusConfig.AGENDADO;
              const StatusIcon = statusCfg.icon;
              return (
                <div
                  key={ordem.id}
                  className="group relative bg-[#1E1E1E] border border-[#333333] rounded-2xl p-5 hover:border-[#66BB6A] hover:shadow-xl hover:shadow-[#333333]/20 transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3.5 ${statusCfg.bg} rounded-xl ring-1 ring-[#333333]`}>
                        <StatusIcon size={24} className={statusCfg.color} />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-[#E8E8E8] tracking-tight">#{ordem.numero.slice(-8).toUpperCase()}</span>
                          <span className={`px-2.5 py-1 ${statusCfg.bg} rounded-lg text-xs font-semibold ${statusCfg.color} ring-1 ring-[#333333]`}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#9E9E9E]">
                          <span className="flex items-center gap-1.5">
                            <Car size={14} className="text-[#43A047]" />
                            <span className="font-medium text-[#9E9E9E]">{formatPlate(ordem.veiculo.placa)}</span>
                            <span className="text-[#66BB6A]">•</span>
                            {capitalize(ordem.veiculo.marca)} {capitalize(ordem.veiculo.modelo)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <User size={14} className="text-blue-400" />
                            {capitalize(ordem.veiculo.cliente.nome)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-[#9E9E9E]">
                          <span>{formatDateTime(ordem.createdAt)}</span>
                          {ordem.dataAgendada && (
                            <>
                              <span className="text-[#333333]">•</span>
                              <span>Agendada: {formatDate(ordem.dataAgendada)}</span>
                            </>
                          )}
                          <span className="text-[#43A047] font-bold text-sm">{formatCurrency(ordem.total)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Quick Status Change */}
                      {ordem.status === 'AGENDADO' && (
                        <button
                          onClick={() => handleStatusChange(ordem, 'EM_ANDAMENTO')}
                          className="px-4 py-2 bg-purple-500/10 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/20 ring-1 ring-purple-500/20 hover:ring-purple-500/30 transition-all duration-200"
                        >
                          Iniciar
                        </button>
                      )}
                      {ordem.status === 'EM_ANDAMENTO' && (
                        <button
                          onClick={() => handleStatusChange(ordem, 'CONCLUIDO')}
                          className="px-4 py-2 bg-green-500/10 text-[#43A047] rounded-lg text-sm font-medium hover:bg-green-500/20 ring-1 ring-green-500/20 hover:ring-green-500/30 transition-all duration-200"
                        >
                          Concluir
                        </button>
                      )}
                      {ordem.status === 'CONCLUIDO' && (
                        <button
                          onClick={() => handleStatusChange(ordem, 'ENTREGUE')}
                          className="px-4 py-2 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/20 ring-1 ring-cyan-500/20 hover:ring-cyan-500/30 transition-all duration-200"
                        >
                          Entregar
                        </button>
                      )}
                      <div className="flex items-center gap-1 ml-2 p-1 bg-[#121212] rounded-lg ring-1 ring-[#333333]">
                        <button
                          onClick={() => downloadOrdemPDF(ordem, empresaConfig || undefined)}
                          className="p-2 hover:bg-green-500/10 rounded-md text-[#9E9E9E] hover:text-[#43A047] transition-all duration-200"
                          title="Baixar PDF"
                        >
                          <FileDown size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrdem(ordem);
                            setShowDetailModal(true);
                          }}
                          className="p-2 hover:bg-blue-500/10 rounded-md text-[#9E9E9E] hover:text-blue-400 transition-all duration-200"
                          title="Ver detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        {(ordem.status === 'AGENDADO' || ordem.status === 'EM_ANDAMENTO') && (
                          <button
                            onClick={() => openEditModal(ordem)}
                            className="p-2 hover:bg-amber-500/10 rounded-md text-[#9E9E9E] hover:text-amber-400 transition-all duration-200"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                        )}
                        {ordem.status !== 'CONCLUIDO' && ordem.status !== 'ENTREGUE' && (
                          <button
                            onClick={() => {
                              setSelectedOrdem(ordem);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 hover:bg-red-500/10 rounded-md text-[#9E9E9E] hover:text-red-500 transition-all duration-200"
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

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-[#1E1E1E] border border-[#333333] rounded-2xl px-6 py-4">
              <p className="text-sm text-[#9E9E9E]">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} ordens
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-[#121212] border border-[#333333] rounded-lg text-[#9E9E9E] hover:text-[#E8E8E8] hover:border-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="px-4 py-2 text-[#E8E8E8] font-medium">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-[#121212] border border-[#333333] rounded-lg text-[#9E9E9E] hover:text-[#E8E8E8] hover:border-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </>
        )}
      </div>

      {/* Modal Nova O.S. */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-in flex flex-col">
            <div className="p-6 border-b border-[#333333] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#E8E8E8]">{editingOrdem ? 'Editar Ordem de Servico' : 'Nova Ordem de Servico'}</h2>
                <p className="text-sm text-[#9E9E9E] mt-1">Passo {step} de 3</p>
              </div>
              <button onClick={() => { setShowModal(false); setEditingOrdem(null); }} className="p-2 hover:bg-[#2A2A2A] rounded-lg text-[#9E9E9E] hover:text-[#E8E8E8] transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Step 1: Select Vehicle */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#66BB6A]" size={18} />
                    <input
                      type="text"
                      placeholder="Buscar veiculo por placa, cliente ou modelo..."
                      value={searchVeiculo}
                      onChange={(e) => setSearchVeiculo(e.target.value)}
                      className="w-full bg-[#121212] border border-[#333333] rounded-xl pl-11 pr-4 py-3 text-sm text-[#E8E8E8] placeholder-gray-400 focus:outline-none focus:border-[#43A047]"
                    />
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {filteredVeiculos.length === 0 ? (
                      <p className="text-center text-[#9E9E9E] py-4">Nenhum veiculo encontrado</p>
                    ) : (
                      filteredVeiculos.map((veiculo) => (
                        <button
                          key={veiculo.id}
                          onClick={() => {
                            setSelectedVeiculoId(veiculo.id);
                            // Preencher KM de entrada com o KM atual do veículo
                            if (veiculo.kmAtual && !kmEntrada) {
                              setKmEntrada(veiculo.kmAtual.toString());
                            }
                          }}
                          className={`w-full p-4 rounded-xl text-left transition-colors ${
                            selectedVeiculoId === veiculo.id
                              ? 'bg-green-500/10 border-2 border-[#43A047]'
                              : 'bg-[#121212] border border-[#333333] hover:border-[#66BB6A]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                              <Car size={20} className="text-blue-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#E8E8E8]">{formatPlate(veiculo.placa)}</span>
                                <span className="text-[#9E9E9E]">{capitalize(veiculo.marca)} {capitalize(veiculo.modelo)}</span>
                                {veiculo.ano && <span className="text-[#9E9E9E]">({veiculo.ano})</span>}
                              </div>
                              <p className="text-sm text-[#9E9E9E]">{capitalize(veiculo.cliente.nome)}</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  {selectedVeiculoId && (
                    <div className="pt-4 border-t border-[#333333] space-y-4">
                      {/* Destaque para KM de Entrada */}
                      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-amber-500/20 rounded-lg">
                            <Gauge className="w-4 h-4 text-amber-400" />
                          </div>
                          <label className="text-sm font-semibold text-amber-400">KM de Entrada</label>
                          <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full ml-auto">
                            Importante
                          </span>
                        </div>
                        <input
                          type="number"
                          value={kmEntrada}
                          onChange={(e) => setKmEntrada(e.target.value)}
                          placeholder="Ex: 45000"
                          max={9999999}
                          className="w-full bg-[#1a1a1a] border-2 border-amber-500/30 rounded-xl px-4 py-3 text-[#E8E8E8] placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                        <div className="flex items-center gap-1.5 mt-2">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          <p className="text-xs text-amber-300/80">Confirme a quilometragem atual do veículo</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#9E9E9E] mb-2">Data e Hora do Agendamento</label>
                        <input
                          type="datetime-local"
                          value={dataAgendada}
                          onChange={(e) => setDataAgendada(e.target.value)}
                          className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] placeholder-gray-400 focus:outline-none focus:border-[#43A047] [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Select Products and Extras */}
              {step === 2 && (
                <div className="space-y-4">
                  {/* Produtos do Estoque */}
                  <div>
                    <h3 className="text-sm font-medium text-[#9E9E9E] mb-2">Produtos do Estoque</h3>
                    <input
                      type="text"
                      placeholder="Buscar produto..."
                      value={searchProduto}
                      onChange={(e) => setSearchProduto(e.target.value)}
                      className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-2 text-[#E8E8E8] placeholder-gray-500 focus:outline-none focus:border-[#43A047] mb-2"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[150px] overflow-y-auto">
                      {produtos
                        .filter(p => p.nome.toLowerCase().includes(searchProduto.toLowerCase()) || p.codigo.toLowerCase().includes(searchProduto.toLowerCase()))
                        .slice(0, 20)
                        .map((produto) => (
                        <button
                          key={produto.id}
                          onClick={() => addProduto(produto)}
                          disabled={selectedProdutos.some(p => p.produtoId === produto.id)}
                          className="p-3 bg-[#121212] border border-[#333333] rounded-xl text-left hover:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Package size={16} className="text-blue-400" />
                              <span className="text-[#E8E8E8] text-sm truncate">{capitalize(produto.nome)}</span>
                            </div>
                            <span className="text-blue-400 text-sm font-medium">{formatCurrency(produto.precoVenda)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Produtos Selecionados */}
                  {selectedProdutos.length > 0 && (
                    <div className="pt-4 border-t border-[#333333]">
                      <h4 className="text-xs text-[#9E9E9E] mb-2">Produtos Selecionados</h4>
                      <div className="space-y-2">
                        {selectedProdutos.map((item) => {
                          const produto = produtos.find(p => p.id === item.produtoId);
                          return (
                            <div key={item.produtoId} className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                              <span className="text-[#E8E8E8] text-sm">{capitalize(produto?.nome || '')}</span>
                              <div className="flex items-center gap-3">
                                <input
                                  type="number"
                                  min="1"
                                  step="0.5"
                                  value={item.quantidade}
                                  onChange={(e) => {
                                    const qtd = parseFloat(e.target.value) || 1;
                                    setSelectedProdutos(selectedProdutos.map(p =>
                                      p.produtoId === item.produtoId ? { ...p, quantidade: qtd } : p
                                    ));
                                  }}
                                  className="w-16 bg-[#121212] border border-[#333333] rounded px-2 py-1 text-[#E8E8E8] text-sm text-center"
                                />
                                <span className="text-blue-400 w-20 text-right">{formatCurrency(item.precoUnitario * item.quantidade)}</span>
                                <button
                                  onClick={() => removeProduto(item.produtoId)}
                                  className="p-1 hover:bg-red-500/10 rounded text-red-500"
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

                  {/* Serviços Extras */}
                  <div className="pt-4 border-t border-[#333333]">
                    <h3 className="text-sm font-medium text-[#9E9E9E] mb-2">Serviços Extras (mão de obra, etc)</h3>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Descrição do serviço"
                        value={novoServicoExtra.descricao}
                        onChange={(e) => setNovoServicoExtra({ ...novoServicoExtra, descricao: e.target.value })}
                        className="flex-1 bg-[#121212] border border-[#333333] rounded-xl px-4 py-2 text-[#E8E8E8] placeholder-gray-500 focus:outline-none focus:border-[#43A047]"
                        maxLength={100}
                      />
                      <input
                        type="number"
                        placeholder="Valor"
                        value={novoServicoExtra.valor}
                        onChange={(e) => setNovoServicoExtra({ ...novoServicoExtra, valor: e.target.value })}
                        className="w-28 bg-[#121212] border border-[#333333] rounded-xl px-4 py-2 text-[#E8E8E8] placeholder-gray-500 focus:outline-none focus:border-[#43A047]"
                        min="0"
                        step="0.01"
                      />
                      <button
                        onClick={addServicoExtra}
                        className="px-4 py-2 bg-gradient-to-r from-[#43A047] to-[#1B5E20] rounded-xl text-white hover:shadow-lg transition-all"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    {servicosExtras.length > 0 && (
                      <div className="space-y-2">
                        {servicosExtras.map((extra, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <span className="text-[#E8E8E8]">{extra.descricao}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[#43A047]">{formatCurrency(extra.valor)}</span>
                              <button
                                onClick={() => removeServicoExtra(index)}
                                className="p-1 hover:bg-red-500/10 rounded text-red-500"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#121212] rounded-xl">
                    <h3 className="text-sm font-medium text-[#9E9E9E] mb-2">Veiculo</h3>
                    {selectedVeiculoId && (() => {
                      const veiculo = veiculos.find(v => v.id === selectedVeiculoId);
                      return veiculo ? (
                        <div>
                          <p className="text-[#E8E8E8] font-bold">{formatPlate(veiculo.placa)} - {capitalize(veiculo.marca)} {capitalize(veiculo.modelo)}</p>
                          <p className="text-sm text-[#9E9E9E]">{capitalize(veiculo.cliente.nome)}</p>
                          {kmEntrada && <p className="text-sm text-[#9E9E9E]">KM: {kmEntrada}</p>}
                          {dataAgendada && <p className="text-sm text-[#9E9E9E]">Agendamento: {new Date(dataAgendada).toLocaleString('pt-BR')}</p>}
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {selectedProdutos.length > 0 && (
                    <div className="p-4 bg-[#121212] rounded-xl">
                      <h3 className="text-sm font-medium text-[#9E9E9E] mb-2">Produtos</h3>
                      {selectedProdutos.map((item) => {
                        const produto = produtos.find(p => p.id === item.produtoId);
                        return (
                          <div key={item.produtoId} className="flex justify-between py-1">
                            <span className="text-[#E8E8E8]">{capitalize(produto?.nome || '')} x{item.quantidade}</span>
                            <span className="text-blue-400">{formatCurrency(item.precoUnitario * item.quantidade)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {servicosExtras.length > 0 && (
                    <div className="p-4 bg-[#121212] rounded-xl">
                      <h3 className="text-sm font-medium text-[#9E9E9E] mb-2">Servicos Extras</h3>
                      {servicosExtras.map((extra, index) => (
                        <div key={index} className="flex justify-between py-1">
                          <span className="text-[#E8E8E8]">{extra.descricao}</span>
                          <span className="text-[#43A047]">{formatCurrency(extra.valor)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-4 bg-[#121212] rounded-xl">
                    <label className="block text-sm font-medium text-[#9E9E9E] mb-2">Observacoes</label>
                    <textarea
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Observacoes adicionais..."
                      rows={3}
                      className="w-full bg-[#1E1E1E] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] placeholder-gray-400 focus:outline-none focus:border-[#43A047] resize-none"
                    />
                  </div>

                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-[#E8E8E8]">Total</span>
                      <span className="text-2xl font-bold text-[#43A047]">{formatCurrency(calcularTotal())}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#333333] flex gap-3 justify-between">
              <button
                onClick={() => step > 1 ? setStep(step - 1) : (setShowModal(false), setEditingOrdem(null))}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#9E9E9E] hover:bg-[#121212] transition-colors"
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
                  className="px-6 py-3 bg-gradient-to-r from-[#43A047] to-[#1B5E20] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
                >
                  Próximo
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-[#43A047] to-[#1B5E20] rounded-xl text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving
                    ? (editingOrdem ? 'Salvando...' : 'Criando...')
                    : (editingOrdem ? 'Salvar Alterações' : 'Criar O.S.')
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {showDetailModal && selectedOrdem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="p-6 border-b border-[#333333] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#E8E8E8]">O.S. #{selectedOrdem.numero.slice(-8).toUpperCase()}</h2>
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
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-[#2A2A2A] rounded-lg text-[#9E9E9E] hover:text-[#E8E8E8] transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Vehicle & Client Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#121212] rounded-xl">
                  <div className="flex items-center gap-2 text-[#9E9E9E] mb-2">
                    <Car size={16} />
                    <span className="text-xs">Veiculo</span>
                  </div>
                  <p className="text-[#E8E8E8] font-bold">{formatPlate(selectedOrdem.veiculo.placa)}</p>
                  <p className="text-sm text-[#9E9E9E]">{capitalize(selectedOrdem.veiculo.marca)} {capitalize(selectedOrdem.veiculo.modelo)}</p>
                </div>
                <div className="p-4 bg-[#121212] rounded-xl">
                  <div className="flex items-center gap-2 text-[#9E9E9E] mb-2">
                    <User size={16} />
                    <span className="text-xs">Cliente</span>
                  </div>
                  <p className="text-[#E8E8E8] font-bold">{capitalize(selectedOrdem.veiculo.cliente.nome)}</p>
                  <p className="text-sm text-[#9E9E9E]">{selectedOrdem.veiculo.cliente.telefone}</p>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#121212] rounded-xl">
                  <p className="text-xs text-[#9E9E9E] mb-1">Criada em</p>
                  <p className="text-[#E8E8E8]">{formatDateTime(selectedOrdem.createdAt)}</p>
                </div>
                {selectedOrdem.dataAgendada && (
                  <div className="p-4 bg-[#121212] rounded-xl">
                    <p className="text-xs text-[#9E9E9E] mb-1">Agendada para</p>
                    <p className="text-[#E8E8E8]">{formatDateTime(selectedOrdem.dataAgendada)}</p>
                  </div>
                )}
                {selectedOrdem.dataInicio && (
                  <div className="p-4 bg-[#121212] rounded-xl">
                    <p className="text-xs text-[#9E9E9E] mb-1">Iniciada em</p>
                    <p className="text-[#E8E8E8]">{formatDateTime(selectedOrdem.dataInicio)}</p>
                  </div>
                )}
                {selectedOrdem.dataConclusao && (
                  <div className="p-4 bg-[#121212] rounded-xl">
                    <p className="text-xs text-[#9E9E9E] mb-1">Concluida em</p>
                    <p className="text-[#E8E8E8]">{formatDateTime(selectedOrdem.dataConclusao)}</p>
                  </div>
                )}
              </div>

              {/* Serviços Extras */}
              {selectedOrdem.servicosExtras.length > 0 && (
                <div className="p-4 bg-[#121212] rounded-xl">
                  <h3 className="text-sm font-medium text-[#9E9E9E] mb-3 flex items-center gap-2">
                    <Wrench size={16} className="text-[#43A047]" />
                    Serviços Extras
                  </h3>
                  <div className="space-y-2">
                    {selectedOrdem.servicosExtras.map((item, index) => (
                      <div key={item.id || index} className="flex justify-between text-sm">
                        <span className="text-[#E8E8E8]">{item.descricao}</span>
                        <span className="text-[#43A047]">{formatCurrency(item.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              {selectedOrdem.itensProduto.length > 0 && (
                <div className="p-4 bg-[#121212] rounded-xl">
                  <h3 className="text-sm font-medium text-[#9E9E9E] mb-3 flex items-center gap-2">
                    <Package size={16} className="text-blue-400" />
                    Produtos
                  </h3>
                  <div className="space-y-2">
                    {selectedOrdem.itensProduto.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-[#E8E8E8]">{item.produtoNome} x{item.quantidade}</span>
                        <span className="text-blue-400">{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observations */}
              {selectedOrdem.observacoes && (
                <div className="p-4 bg-[#121212] rounded-xl">
                  <p className="text-xs text-[#9E9E9E] mb-1">Observacoes</p>
                  <p className="text-[#E8E8E8]">{selectedOrdem.observacoes}</p>
                </div>
              )}

              {/* Total */}
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-[#E8E8E8]">Total</span>
                  <span className="text-2xl font-bold text-[#43A047]">{formatCurrency(selectedOrdem.total)}</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              {(selectedOrdem.status === 'AGENDADO' || selectedOrdem.status === 'EM_ANDAMENTO') && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openEditModal(selectedOrdem);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-700 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
                >
                  <Edit size={18} />
                  Editar
                </button>
              )}
              <button
                onClick={() => downloadOrdemPDF(selectedOrdem, empresaConfig || undefined)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#43A047] to-[#1B5E20] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
              >
                <FileDown size={18} />
                Baixar PDF
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#9E9E9E] hover:bg-[#121212] transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {showDeleteConfirm && selectedOrdem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl w-full max-w-md animate-fade-in">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-semibold text-[#E8E8E8]">Confirmar Exclusao</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-500/10 rounded-xl">
                  <Trash2 size={24} className="text-red-500" />
                </div>
                <div>
                  <p className="text-[#E8E8E8] font-medium">O.S. #{selectedOrdem.numero.slice(-8).toUpperCase()}</p>
                  <p className="text-sm text-[#9E9E9E]">{formatPlate(selectedOrdem.veiculo.placa)} - {capitalize(selectedOrdem.veiculo.cliente.nome)}</p>
                </div>
              </div>
              <p className="text-[#9E9E9E] text-sm">
                Tem certeza que deseja excluir esta O.S.? Esta acao nao pode ser desfeita.
              </p>
            </div>
            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedOrdem(null);
                }}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#9E9E9E] hover:bg-[#121212] transition-colors"
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
      <div className="min-h-screen bg-[#121212]">
        <Header title="Ordens de Servico" subtitle="Gerencie suas O.S." />
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="animate-spin text-[#43A047]" size={32} />
        </div>
      </div>
    }>
      <OrdensPageContent />
    </Suspense>
  );
}
