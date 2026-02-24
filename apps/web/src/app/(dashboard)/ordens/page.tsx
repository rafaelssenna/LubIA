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
import { formatDateToLocalInput, formatDateTimeBrazil, formatDateBrazil } from '@/lib/timezone';
import MultiPaymentSelector, { PagamentoItem } from '@/components/MultiPaymentSelector';

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
  CONCLUIDO: { label: 'Concluído', color: 'text-primary', icon: CheckCircle, bg: 'bg-green-500/10' },
  CANCELADO: { label: 'Cancelado', color: 'text-red-500', icon: XCircle, bg: 'bg-red-500/10' },
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
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [clienteFilter, setClienteFilter] = useState('');
  const [clientes, setClientes] = useState<{ id: number; nome: string }[]>([]);
  const [stats, setStats] = useState({ total: 0, abertas: 0, concluidas: 0, hoje: 0 });
  const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('calendario');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showConcluirConfirm, setShowConcluirConfirm] = useState(false);
  const [selectedOrdem, setSelectedOrdem] = useState<OrdemServico | null>(null);
  const [pagamentosConcluir, setPagamentosConcluir] = useState<PagamentoItem[]>([{ tipo: 'PIX', valor: 0 }]);
  const [descontoConcluir, setDescontoConcluir] = useState<string>('');
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
  const [modoNovoVeiculo, setModoNovoVeiculo] = useState(false);
  const [novoVeiculo, setNovoVeiculo] = useState({ placa: '', marca: '', modelo: '', clienteNome: '', clienteTelefone: '' });
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
      if (clienteFilter) params.append('clienteId', clienteFilter);
      if (dataInicio) params.append('dataInicio', dataInicio);
      if (dataFim) params.append('dataFim', dataFim);
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
    fetchOrdens();
    fetchEmpresaConfig();
    fetchClientes();
  }, [searchTerm, statusFilter, clienteFilter, dataInicio, dataFim, currentPage]);

  // Reset para página 1 ao mudar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, clienteFilter, dataInicio, dataFim]);

  // Check for status filter in URL (from sidebar submenu)
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam === 'ativas') {
      setStatusFilter('ATIVAS');
      setViewMode('lista');
    } else if (statusParam === 'historico') {
      setStatusFilter('HISTORICO');
      setViewMode('lista');
    }
  }, [searchParams]);

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

  // Handle URL id parameter from global search
  useEffect(() => {
    const idParam = searchParams.get('id');
    if (idParam && !loading && ordens.length > 0) {
      const ordemId = parseInt(idParam);
      const ordem = ordens.find(o => o.id === ordemId);
      if (ordem) {
        setSelectedOrdem(ordem);
        setShowDetailModal(true);
        // Clean URL without reload
        router.replace('/ordens');
      }
    }
  }, [searchParams, loading, ordens]);

  const openNewModal = (presetDate?: string) => {
    fetchVeiculos();
    fetchProdutos();
    setEditingOrdem(null);
    setSelectedVeiculoId(null);
    setKmEntrada('');
    setObservacoes('');
    // Se não tiver data preset, usa a próxima hora cheia
    if (!presetDate) {
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      presetDate = `${year}-${month}-${day}T${hour}:00`;
    }
    setDataAgendada(presetDate);
    setServicosExtras([]);
    setSelectedProdutos([]);
    setSearchVeiculo('');
    setSearchProduto('');
    setNovoServicoExtra({ descricao: '', valor: '' });
    setModoNovoVeiculo(false);
    setNovoVeiculo({ placa: '', marca: '', modelo: '', clienteNome: '', clienteTelefone: '' });
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
      ? formatDateToLocalInput(ordem.dataAgendada)
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
    setModoNovoVeiculo(false);
    setNovoVeiculo({ placa: '', marca: '', modelo: '', clienteNome: '', clienteTelefone: '' });
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

  const handleStatusChange = async (ordem: OrdemServico, newStatus: string, pagamentos?: PagamentoItem[], desconto?: number) => {
    try {
      const res = await fetch(`/api/ordens/${ordem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          ...(pagamentos && pagamentos.length > 0 && { pagamentos: pagamentos.filter(p => p.valor > 0) }),
          ...(desconto !== undefined && { desconto }),
        }),
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
    return formatDateBrazil(date);
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return '-';
    return formatDateTimeBrazil(date);
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
      const oHourNum = oDate.getHours();
      // Ordens agendadas antes das 07:00 aparecem no slot de 07:00
      // Ordens agendadas depois das 18:00 aparecem no slot de 18:00
      let oHour: string;
      if (oHourNum < 7) {
        oHour = '07:00';
      } else if (oHourNum > 18) {
        oHour = '18:00';
      } else {
        oHour = oHourNum.toString().padStart(2, '0') + ':00';
      }
      return oDate.getDate() === date.getDate() &&
             oDate.getMonth() === date.getMonth() &&
             oDate.getFullYear() === date.getFullYear() &&
             oHour === hora;
    });
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-500/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-muted animate-pulse">Carregando ordens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Header title="Ordens de Serviço" subtitle="Gerencie suas O.S." />

      <div className="px-4 lg:px-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-8">
          {/* Total O.S. */}
          <button
            onClick={() => { setStatusFilter(''); setViewMode('lista'); }}
            className="group relative overflow-hidden bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-2xl p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 text-left cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl">
                  <ClipboardList className="h-6 w-6 text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">Total</span>
              </div>
              <p className="text-4xl font-bold text-foreground mb-1">{stats.total}</p>
              <p className="text-sm text-muted">ordens de servico</p>
            </div>
          </button>

          {/* Em Aberto */}
          <button
            onClick={() => { setStatusFilter('EM_ANDAMENTO'); setViewMode('lista'); }}
            className="group relative overflow-hidden bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 text-left cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <Play className="h-6 w-6 text-purple-400" />
                </div>
                <span className="text-xs font-medium text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">Abertas</span>
              </div>
              <p className="text-4xl font-bold text-foreground mb-1">{stats.abertas}</p>
              <p className="text-sm text-muted">em andamento</p>
            </div>
          </button>

          {/* Concluidas */}
          <button
            onClick={() => { setStatusFilter('CONCLUIDO'); setViewMode('lista'); }}
            className="group relative overflow-hidden bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 rounded-2xl p-6 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 text-left cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-cyan-500/20 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-cyan-400" />
                </div>
                <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-full">Finalizadas</span>
              </div>
              <p className="text-4xl font-bold text-foreground mb-1">{stats.concluidas}</p>
              <p className="text-sm text-muted">concluidas</p>
            </div>
          </button>

          {/* Hoje */}
          <button
            onClick={() => {
              const today = new Date();
              const yyyy = today.getFullYear();
              const mm = String(today.getMonth() + 1).padStart(2, '0');
              const dd = String(today.getDate()).padStart(2, '0');
              const todayStr = `${yyyy}-${mm}-${dd}`;
              setDataInicio(todayStr);
              setDataFim(todayStr);
              setStatusFilter('');
              setViewMode('lista');
            }}
            className="group relative overflow-hidden bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-2xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 text-left cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Calendar className="h-6 w-6 text-blue-400" />
                </div>
                <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">Hoje</span>
              </div>
              <p className="text-4xl font-bold text-foreground mb-1">{stats.hoje}</p>
              <p className="text-sm text-muted">agendadas hoje</p>
            </div>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-4 items-center">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
              <button
                onClick={() => setViewMode('lista')}
                className={`p-2.5 rounded-lg transition-all duration-200 ${
                  viewMode === 'lista'
                    ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/25'
                    : 'text-foreground-muted hover:text-white hover:bg-zinc-800'
                }`}
                title="Lista"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('calendario')}
                className={`p-2.5 rounded-lg transition-all duration-200 ${
                  viewMode === 'calendario'
                    ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/25'
                    : 'text-foreground-muted hover:text-white hover:bg-zinc-800'
                }`}
                title="Calendario"
              >
                <CalendarDays size={18} />
              </button>
            </div>

            {viewMode === 'lista' ? (
              <>
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por numero, placa ou cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-200"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-200 cursor-pointer"
                >
                  <option value="">Todos os Status</option>
                  <option value="ATIVAS">Em Andamento</option>
                  <option value="HISTORICO">Histórico</option>
                  <option disabled className="text-zinc-600">──────────</option>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
                <select
                  value={clienteFilter}
                  onChange={(e) => setClienteFilter(e.target.value)}
                  className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-200 cursor-pointer max-w-[200px]"
                >
                  <option value="">Todos os Clientes</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="bg-card border border-border rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-200 [color-scheme:dark]"
                    title="Data inicial"
                  />
                  <span className="text-foreground-muted">até</span>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="bg-card border border-border rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-200 [color-scheme:dark]"
                    title="Data final"
                  />
                  {(dataInicio || dataFim || clienteFilter) && (
                    <button
                      onClick={() => { setDataInicio(''); setDataFim(''); setClienteFilter(''); }}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-foreground-muted hover:text-red-400 transition-all duration-200"
                      title="Limpar filtros"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateWeek(-1)}
                  className="p-2.5 bg-card border border-border rounded-lg text-foreground-muted hover:text-white hover:border-emerald-500/30 transition-all duration-200"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-white font-medium px-4 min-w-[160px] text-center capitalize">
                  {formatMonthYear(currentDate)}
                </span>
                <button
                  onClick={() => navigateWeek(1)}
                  className="p-2.5 bg-card border border-border rounded-lg text-foreground-muted hover:text-white hover:border-emerald-500/30 transition-all duration-200"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2.5 bg-card border border-border rounded-lg text-foreground-muted hover:text-primary hover:border-emerald-500/30 transition-all duration-200 text-sm font-medium"
                >
                  Hoje
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => openNewModal()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02]"
          >
            <Plus size={18} />
            Nova O.S.
          </button>
        </div>

        {/* Calendar View */}
        {viewMode === 'calendario' && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Calendar Header */}
            <div className="grid grid-cols-8 border-b border-border">
              <div className="p-4 text-foreground-muted text-sm font-medium">Horario</div>
              {weekDays.map((date, idx) => {
                const isTodayDate = isToday(date);
                return (
                  <div
                    key={idx}
                    className={`p-4 text-center border-l border-border ${isTodayDate ? 'bg-emerald-500/10' : ''}`}
                  >
                    <p className="text-foreground-muted text-xs">{diasSemana[idx]}</p>
                    <p className={`text-lg font-bold ${isTodayDate ? 'text-emerald-400' : 'text-white'}`}>
                      {date.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Calendar Body */}
            <div className="max-h-[600px] overflow-y-auto">
              {horasTrabalho.map((hora) => (
                <div key={hora} className="grid grid-cols-8 border-b border-border min-h-[80px]">
                  <div className="p-3 text-foreground-muted text-sm border-r border-border">
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
                        className={`p-1 border-l border-border relative ${isTodayDate ? 'bg-emerald-500/5' : ''} hover:bg-zinc-800/30 transition-all duration-200 ${diaOrdens.length === 0 ? 'cursor-pointer group' : ''}`}
                      >
                        {diaOrdens.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus size={20} className="text-primary" />
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
                              className={`p-2 rounded-lg text-xs ${status.bg} ${status.color} border border-border mb-1 hover:scale-[1.02] transition-transform duration-200 cursor-pointer`}
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
        <div className="space-y-4">
          {ordens.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <div className="p-4 bg-zinc-800/50 rounded-full w-fit mx-auto mb-4">
                <ClipboardList className="h-8 w-8 text-zinc-600" />
              </div>
              <p className="text-muted">Nenhuma O.S. encontrada</p>
              <button
                onClick={() => openNewModal()}
                className="inline-flex items-center gap-2 mt-4 text-primary hover:text-primary-light transition-colors"
              >
                Criar nova ordem de servico
              </button>
            </div>
          ) : (
            ordens.map((ordem) => {
              const statusCfg = statusConfig[ordem.status] || statusConfig.AGENDADO;
              const StatusIcon = statusCfg.icon;
              return (
                <div
                  key={ordem.id}
                  className="group bg-card border border-border rounded-2xl p-5 hover:border-emerald-500/30 transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 ${statusCfg.bg} rounded-xl border border-border`}>
                        <StatusIcon size={24} className={statusCfg.color} />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-foreground">#{ordem.numero.slice(-8).toUpperCase()}</span>
                          <span className={`px-2.5 py-1 ${statusCfg.bg} rounded-lg text-xs font-semibold ${statusCfg.color} border border-border`}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                          <span className="flex items-center gap-1.5">
                            <Car size={14} className="text-emerald-400" />
                            <span className="font-medium text-emerald-400">{formatPlate(ordem.veiculo.placa)}</span>
                            <span className="text-zinc-600">-</span>
                            {capitalize(ordem.veiculo.marca)} {capitalize(ordem.veiculo.modelo)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <User size={14} className="text-blue-400" />
                            {capitalize(ordem.veiculo.cliente.nome)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-foreground-muted">
                          <span>{formatDateTime(ordem.createdAt)}</span>
                          {ordem.dataAgendada && (
                            <>
                              <span className="text-zinc-700">|</span>
                              <span>Agendada: {formatDate(ordem.dataAgendada)}</span>
                            </>
                          )}
                          <span className="text-emerald-400 font-bold text-sm">{formatCurrency(ordem.total)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Quick Status Change */}
                      {(ordem.status === 'AGENDADO' || ordem.status === 'EM_ANDAMENTO') && (
                        <button
                          onClick={() => {
                            setSelectedOrdem(ordem);
                            setPagamentosConcluir([{ tipo: 'PIX', valor: ordem.total }]);
                            setShowConcluirConfirm(true);
                          }}
                          className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/20 border border-emerald-500/20 transition-all duration-200"
                        >
                          Concluir
                        </button>
                      )}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => downloadOrdemPDF(ordem, empresaConfig || undefined)}
                          className="p-2 hover:bg-emerald-500/10 rounded-xl text-foreground-muted hover:text-emerald-400 transition-all duration-200"
                          title="Baixar PDF"
                        >
                          <FileDown size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrdem(ordem);
                            setShowDetailModal(true);
                          }}
                          className="p-2 hover:bg-blue-500/10 rounded-xl text-foreground-muted hover:text-blue-400 transition-all duration-200"
                          title="Ver detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        {(ordem.status === 'AGENDADO' || ordem.status === 'EM_ANDAMENTO') && (
                          <button
                            onClick={() => openEditModal(ordem)}
                            className="p-2 hover:bg-amber-500/10 rounded-xl text-foreground-muted hover:text-amber-400 transition-all duration-200"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                        )}
                        {ordem.status !== 'CONCLUIDO' && ordem.status !== 'CANCELADO' && (
                          <button
                            onClick={() => {
                              setSelectedOrdem(ordem);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 hover:bg-red-500/10 rounded-xl text-foreground-muted hover:text-red-400 transition-all duration-200"
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

          {/* Paginacao */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-6 py-4">
              <p className="text-sm text-muted">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} ordens
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-zinc-900 border border-border rounded-lg text-foreground-muted hover:text-white hover:border-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="px-4 py-2 text-white font-medium">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-zinc-900 border border-border rounded-lg text-foreground-muted hover:text-white hover:border-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-black/50">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{editingOrdem ? 'Editar Ordem de Servico' : 'Nova Ordem de Servico'}</h2>
                <p className="text-sm text-muted mt-1">Passo {step} de 3</p>
              </div>
              <button onClick={() => { setShowModal(false); setEditingOrdem(null); }} className="p-2 hover:bg-zinc-800 rounded-xl text-muted hover:text-white transition-all duration-200">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Step 1: Select Vehicle */}
              {step === 1 && (
                <div className="space-y-4">
                  {/* Toggle entre buscar e criar */}
                  <div className="flex items-center gap-2 bg-background border border-border rounded-xl p-1">
                    <button
                      onClick={() => { setModoNovoVeiculo(false); setSelectedVeiculoId(null); }}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                        !modoNovoVeiculo
                          ? 'bg-gradient-to-r from-primary to-primary-dark text-white'
                          : 'text-muted hover:text-white'
                      }`}
                    >
                      Buscar Veículo
                    </button>
                    <button
                      onClick={() => { setModoNovoVeiculo(true); setSelectedVeiculoId(null); }}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                        modoNovoVeiculo
                          ? 'bg-gradient-to-r from-primary to-primary-dark text-white'
                          : 'text-muted hover:text-white'
                      }`}
                    >
                      <Plus size={16} className="inline mr-1" />
                      Novo Veículo
                    </button>
                  </div>

                  {!modoNovoVeiculo ? (
                    <>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-light" size={18} />
                        <input
                          type="text"
                          placeholder="Buscar veiculo por placa, cliente ou modelo..."
                          value={searchVeiculo}
                          onChange={(e) => setSearchVeiculo(e.target.value)}
                          className="w-full bg-background border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder-gray-400 focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {filteredVeiculos.length === 0 ? (
                          <div className="text-center py-8">
                            <Car className="mx-auto h-10 w-10 text-zinc-600 mb-2" />
                            <p className="text-muted">Nenhum veículo encontrado</p>
                            <button
                              onClick={() => setModoNovoVeiculo(true)}
                              className="text-primary text-sm mt-2 hover:underline"
                            >
                              Cadastrar novo veículo
                            </button>
                          </div>
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
                                  ? 'bg-green-500/10 border-2 border-primary'
                                  : 'bg-background border border-border hover:border-primary-light'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                  <Car size={20} className="text-blue-400" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-foreground">{formatPlate(veiculo.placa)}</span>
                                    <span className="text-muted">{capitalize(veiculo.marca)} {capitalize(veiculo.modelo)}</span>
                                    {veiculo.ano && <span className="text-muted">({veiculo.ano})</span>}
                                  </div>
                                  <p className="text-sm text-muted">{capitalize(veiculo.cliente.nome)}</p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  ) : (
                    /* Formulário de novo veículo */
                    <div className="space-y-4 bg-background rounded-xl p-4 border border-border">
                      {/* Placa em destaque */}
                      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4">
                        <label className="block text-sm font-semibold text-blue-400 mb-2">
                          Placa do Veículo
                        </label>
                        <input
                          type="text"
                          value={novoVeiculo.placa}
                          onChange={(e) => setNovoVeiculo({ ...novoVeiculo, placa: e.target.value.toUpperCase() })}
                          placeholder="ABC1D23"
                          maxLength={7}
                          className="w-full bg-card border-2 border-blue-500/30 rounded-xl px-4 py-3 text-lg font-bold text-foreground placeholder-gray-500 focus:outline-none focus:border-blue-500 uppercase tracking-wider"
                        />
                      </div>

                      {/* Campos opcionais */}
                      <div className="space-y-3">
                        <p className="text-xs text-foreground-muted uppercase tracking-wider">Opcional</p>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={novoVeiculo.clienteNome}
                            onChange={(e) => setNovoVeiculo({ ...novoVeiculo, clienteNome: e.target.value })}
                            placeholder="Nome do cliente"
                            className="bg-card border border-border rounded-xl px-4 py-2.5 text-foreground placeholder-gray-500 focus:outline-none focus:border-primary"
                          />
                          <input
                            type="tel"
                            value={novoVeiculo.clienteTelefone}
                            onChange={(e) => setNovoVeiculo({ ...novoVeiculo, clienteTelefone: e.target.value })}
                            placeholder="Telefone"
                            className="bg-card border border-border rounded-xl px-4 py-2.5 text-foreground placeholder-gray-500 focus:outline-none focus:border-primary"
                          />
                          <input
                            type="text"
                            value={novoVeiculo.marca}
                            onChange={(e) => setNovoVeiculo({ ...novoVeiculo, marca: e.target.value })}
                            placeholder="Marca"
                            className="bg-card border border-border rounded-xl px-4 py-2.5 text-foreground placeholder-gray-500 focus:outline-none focus:border-primary"
                          />
                          <input
                            type="text"
                            value={novoVeiculo.modelo}
                            onChange={(e) => setNovoVeiculo({ ...novoVeiculo, modelo: e.target.value })}
                            placeholder="Modelo"
                            className="bg-card border border-border rounded-xl px-4 py-2.5 text-foreground placeholder-gray-500 focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedVeiculoId && (
                    <div className="pt-4 border-t border-border space-y-4">
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
                          className="w-full bg-card border-2 border-amber-500/30 rounded-xl px-4 py-3 text-foreground placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                        <div className="flex items-center gap-1.5 mt-2">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          <p className="text-xs text-amber-300/80">Confirme a quilometragem atual do veículo</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted mb-2">Data e Hora do Agendamento</label>
                        <input
                          type="datetime-local"
                          value={dataAgendada}
                          onChange={(e) => setDataAgendada(e.target.value)}
                          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-gray-400 focus:outline-none focus:border-primary [color-scheme:dark]"
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
                    <h3 className="text-sm font-medium text-muted mb-2">Produtos do Estoque</h3>
                    <input
                      type="text"
                      placeholder="Buscar produto..."
                      value={searchProduto}
                      onChange={(e) => setSearchProduto(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground placeholder-gray-500 focus:outline-none focus:border-primary mb-2"
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
                          className="p-3 bg-background border border-border rounded-xl text-left hover:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Package size={16} className="text-blue-400" />
                              <span className="text-foreground text-sm truncate">{capitalize(produto.nome)}</span>
                            </div>
                            <span className="text-blue-400 text-sm font-medium">{formatCurrency(produto.precoVenda)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Produtos Selecionados */}
                  {selectedProdutos.length > 0 && (
                    <div className="pt-4 border-t border-border">
                      <h4 className="text-xs text-muted mb-2">Produtos Selecionados</h4>
                      <div className="space-y-2">
                        {selectedProdutos.map((item) => {
                          const produto = produtos.find(p => p.id === item.produtoId);
                          return (
                            <div key={item.produtoId} className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                              <span className="text-foreground text-sm">{capitalize(produto?.nome || '')}</span>
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
                                  className="w-16 bg-background border border-border rounded px-2 py-1 text-foreground text-sm text-center"
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
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-sm font-medium text-muted mb-2">Serviços Extras (mão de obra, etc)</h3>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Descrição do serviço"
                        value={novoServicoExtra.descricao}
                        onChange={(e) => setNovoServicoExtra({ ...novoServicoExtra, descricao: e.target.value })}
                        className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-foreground placeholder-gray-500 focus:outline-none focus:border-primary"
                        maxLength={100}
                      />
                      <input
                        type="number"
                        placeholder="Valor"
                        value={novoServicoExtra.valor}
                        onChange={(e) => setNovoServicoExtra({ ...novoServicoExtra, valor: e.target.value })}
                        className="w-28 bg-background border border-border rounded-xl px-4 py-2 text-foreground placeholder-gray-500 focus:outline-none focus:border-primary"
                        min="0"
                        step="0.01"
                      />
                      <button
                        onClick={addServicoExtra}
                        className="px-4 py-2 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-white hover:shadow-lg transition-all"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    {servicosExtras.length > 0 && (
                      <div className="space-y-2">
                        {servicosExtras.map((extra, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <span className="text-foreground">{extra.descricao}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-primary">{formatCurrency(extra.valor)}</span>
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
                  <div className="p-4 bg-background rounded-xl">
                    <h3 className="text-sm font-medium text-muted mb-2">Veiculo</h3>
                    {selectedVeiculoId && (() => {
                      const veiculo = veiculos.find(v => v.id === selectedVeiculoId);
                      return veiculo ? (
                        <div>
                          <p className="text-foreground font-bold">{formatPlate(veiculo.placa)} - {capitalize(veiculo.marca)} {capitalize(veiculo.modelo)}</p>
                          <p className="text-sm text-muted">{capitalize(veiculo.cliente.nome)}</p>
                          {kmEntrada && <p className="text-sm text-muted">KM: {kmEntrada}</p>}
                          {dataAgendada && <p className="text-sm text-muted">Agendamento: {new Date(dataAgendada).toLocaleString('pt-BR')}</p>}
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {selectedProdutos.length > 0 && (
                    <div className="p-4 bg-background rounded-xl">
                      <h3 className="text-sm font-medium text-muted mb-2">Produtos</h3>
                      {selectedProdutos.map((item) => {
                        const produto = produtos.find(p => p.id === item.produtoId);
                        return (
                          <div key={item.produtoId} className="flex justify-between py-1">
                            <span className="text-foreground">{capitalize(produto?.nome || '')} x{item.quantidade}</span>
                            <span className="text-blue-400">{formatCurrency(item.precoUnitario * item.quantidade)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {servicosExtras.length > 0 && (
                    <div className="p-4 bg-background rounded-xl">
                      <h3 className="text-sm font-medium text-muted mb-2">Servicos Extras</h3>
                      {servicosExtras.map((extra, index) => (
                        <div key={index} className="flex justify-between py-1">
                          <span className="text-foreground">{extra.descricao}</span>
                          <span className="text-primary">{formatCurrency(extra.valor)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-4 bg-background rounded-xl">
                    <label className="block text-sm font-medium text-muted mb-2">Observações</label>
                    <textarea
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Observações adicionais..."
                      rows={3}
                      className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder-gray-400 focus:outline-none focus:border-primary resize-none"
                    />
                  </div>

                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-foreground">Total</span>
                      <span className="text-2xl font-bold text-primary">{formatCurrency(calcularTotal())}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex gap-3 justify-between">
              <button
                onClick={() => step > 1 ? setStep(step - 1) : (setShowModal(false), setEditingOrdem(null))}
                className="px-6 py-3 border border-border rounded-xl text-muted hover:bg-background transition-colors"
              >
                {step > 1 ? 'Voltar' : 'Cancelar'}
              </button>
              {step < 3 ? (
                <button
                  onClick={async () => {
                    if (step === 1) {
                      if (modoNovoVeiculo) {
                        // Validar apenas placa
                        if (!novoVeiculo.placa.trim()) {
                          toast.warning('Informe a placa do veículo');
                          return;
                        }
                        // Criar veículo + cliente
                        setSaving(true);
                        try {
                          const res = await fetch('/api/veiculos', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              placa: novoVeiculo.placa,
                              marca: novoVeiculo.marca || undefined,
                              modelo: novoVeiculo.modelo || undefined,
                              clienteNome: novoVeiculo.clienteNome,
                              clienteTelefone: novoVeiculo.clienteTelefone,
                            }),
                          });
                          const data = await res.json();
                          if (!res.ok) {
                            toast.error(data.error || 'Erro ao criar veículo');
                            return;
                          }
                          // Adicionar veículo à lista e selecionar
                          if (data.existing) {
                            toast.info('Veículo já cadastrado, selecionado automaticamente');
                          } else {
                            toast.success('Veículo cadastrado!');
                          }
                          setVeiculos([data.data, ...veiculos]);
                          setSelectedVeiculoId(data.data.id);
                          setModoNovoVeiculo(false);
                        } catch (error) {
                          toast.error('Erro ao criar veículo');
                          return;
                        } finally {
                          setSaving(false);
                        }
                      } else if (!selectedVeiculoId) {
                        toast.warning('Selecione um veículo');
                        return;
                      }
                    }
                    setStep(step + 1);
                  }}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Próximo'}
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/50">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">O.S. #{selectedOrdem.numero.slice(-8).toUpperCase()}</h2>
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
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-background-secondary rounded-lg text-muted hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Vehicle & Client Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-background rounded-xl">
                  <div className="flex items-center gap-2 text-muted mb-2">
                    <Car size={16} />
                    <span className="text-xs">Veiculo</span>
                  </div>
                  <p className="text-foreground font-bold">{formatPlate(selectedOrdem.veiculo.placa)}</p>
                  <p className="text-sm text-muted">{capitalize(selectedOrdem.veiculo.marca)} {capitalize(selectedOrdem.veiculo.modelo)}</p>
                </div>
                <div className="p-4 bg-background rounded-xl">
                  <div className="flex items-center gap-2 text-muted mb-2">
                    <User size={16} />
                    <span className="text-xs">Cliente</span>
                  </div>
                  <p className="text-foreground font-bold">{capitalize(selectedOrdem.veiculo.cliente.nome)}</p>
                  <p className="text-sm text-muted">{selectedOrdem.veiculo.cliente.telefone}</p>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-background rounded-xl">
                  <p className="text-xs text-muted mb-1">Criada em</p>
                  <p className="text-foreground">{formatDateTime(selectedOrdem.createdAt)}</p>
                </div>
                {selectedOrdem.dataAgendada && (
                  <div className="p-4 bg-background rounded-xl">
                    <p className="text-xs text-muted mb-1">Agendada para</p>
                    <p className="text-foreground">{formatDateTime(selectedOrdem.dataAgendada)}</p>
                  </div>
                )}
                {selectedOrdem.dataInicio && (
                  <div className="p-4 bg-background rounded-xl">
                    <p className="text-xs text-muted mb-1">Iniciada em</p>
                    <p className="text-foreground">{formatDateTime(selectedOrdem.dataInicio)}</p>
                  </div>
                )}
                {selectedOrdem.dataConclusao && (
                  <div className="p-4 bg-background rounded-xl">
                    <p className="text-xs text-muted mb-1">Concluida em</p>
                    <p className="text-foreground">{formatDateTime(selectedOrdem.dataConclusao)}</p>
                  </div>
                )}
              </div>

              {/* Serviços Extras */}
              {selectedOrdem.servicosExtras.length > 0 && (
                <div className="p-4 bg-background rounded-xl">
                  <h3 className="text-sm font-medium text-muted mb-3 flex items-center gap-2">
                    <Wrench size={16} className="text-primary" />
                    Serviços Extras
                  </h3>
                  <div className="space-y-2">
                    {selectedOrdem.servicosExtras.map((item, index) => (
                      <div key={item.id || index} className="flex justify-between text-sm">
                        <span className="text-foreground">{item.descricao}</span>
                        <span className="text-primary">{formatCurrency(item.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              {selectedOrdem.itensProduto.length > 0 && (
                <div className="p-4 bg-background rounded-xl">
                  <h3 className="text-sm font-medium text-muted mb-3 flex items-center gap-2">
                    <Package size={16} className="text-blue-400" />
                    Produtos
                  </h3>
                  <div className="space-y-2">
                    {selectedOrdem.itensProduto.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-foreground">{item.produtoNome} x{item.quantidade}</span>
                        <span className="text-blue-400">{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observations */}
              {selectedOrdem.observacoes && (
                <div className="p-4 bg-background rounded-xl">
                  <p className="text-xs text-muted mb-1">Observações</p>
                  <p className="text-foreground">{selectedOrdem.observacoes}</p>
                </div>
              )}

              {/* Total */}
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(selectedOrdem.total)}</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              {(selectedOrdem.status === 'AGENDADO' || selectedOrdem.status === 'EM_ANDAMENTO' || selectedOrdem.status === 'AGUARDANDO_PECAS') && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setPagamentosConcluir([{ tipo: 'PIX', valor: selectedOrdem.total }]);
                    setShowConcluirConfirm(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
                >
                  <CheckCircle size={18} />
                  Concluir
                </button>
              )}
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
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
              >
                <FileDown size={18} />
                Baixar PDF
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-3 border border-border rounded-xl text-muted hover:bg-background transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusao */}
      {showDeleteConfirm && selectedOrdem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl shadow-black/50">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Confirmar Exclusao</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                  <Trash2 size={24} className="text-red-400" />
                </div>
                <div>
                  <p className="text-white font-medium">O.S. #{selectedOrdem.numero.slice(-8).toUpperCase()}</p>
                  <p className="text-sm text-muted">{formatPlate(selectedOrdem.veiculo.placa)} - {capitalize(selectedOrdem.veiculo.cliente.nome)}</p>
                </div>
              </div>
              <p className="text-muted text-sm">
                Tem certeza que deseja excluir esta O.S.? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedOrdem(null);
                }}
                className="px-6 py-3 border border-border rounded-xl text-muted hover:bg-zinc-800 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-700 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-red-500/25 transition-all duration-300 disabled:opacity-50"
              >
                {saving ? 'Excluindo...' : 'Excluir O.S.'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Conclusao */}
      {showConcluirConfirm && selectedOrdem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl shadow-black/50">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Concluir O.S.</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <CheckCircle size={24} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-medium">O.S. #{selectedOrdem.numero.slice(-8).toUpperCase()}</p>
                  <p className="text-sm text-muted">{formatPlate(selectedOrdem.veiculo.placa)} - {capitalize(selectedOrdem.veiculo.cliente.nome)}</p>
                </div>
              </div>

              {/* Resumo dos itens */}
              <div className="bg-background rounded-xl p-4 mb-4 space-y-2">
                {selectedOrdem.itensProduto.length > 0 && (
                  <div>
                    <p className="text-xs text-foreground-muted mb-1">Produtos</p>
                    {selectedOrdem.itensProduto.map((item) => (
                      <p key={item.id} className="text-sm text-muted">
                        {item.produtoNome} x{item.quantidade} - {formatCurrency(item.subtotal)}
                      </p>
                    ))}
                  </div>
                )}
                {selectedOrdem.servicosExtras.length > 0 && (
                  <div>
                    <p className="text-xs text-foreground-muted mb-1">Servicos</p>
                    {selectedOrdem.servicosExtras.map((s, i) => (
                      <p key={i} className="text-sm text-muted">
                        {s.descricao} - {formatCurrency(s.valor)}
                      </p>
                    ))}
                  </div>
                )}
                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between">
                    <span className="text-muted font-medium">Total</span>
                    <span className="text-emerald-400 font-bold">{formatCurrency(selectedOrdem.total)}</span>
                  </div>
                </div>
              </div>

              {/* Formas de Pagamento */}
              <div className="mb-4">
                <MultiPaymentSelector
                  total={Math.floor(selectedOrdem.total * (1 - (parseFloat(descontoConcluir.replace(',', '.')) || 0) / 100))}
                  pagamentos={pagamentosConcluir}
                  onChange={setPagamentosConcluir}
                  disabled={saving}
                />
              </div>

              {/* Desconto */}
              <div className="mb-4">
                <label className="block text-sm text-muted mb-2">Desconto (%)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={descontoConcluir}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9,]/g, '');
                      setDescontoConcluir(val);
                    }}
                    placeholder="0"
                    className="w-24 px-4 py-3 bg-background rounded-xl border border-border text-white text-center placeholder:text-foreground-muted focus:outline-none focus:border-amber-500/50"
                  />
                  <span className="text-foreground-muted">%</span>
                  {parseFloat(descontoConcluir.replace(',', '.')) > 0 && (
                    <span className="text-amber-400 text-sm">
                      - {formatCurrency(selectedOrdem.total * (parseFloat(descontoConcluir.replace(',', '.')) / 100))}
                    </span>
                  )}
                </div>
                {parseFloat(descontoConcluir.replace(',', '.')) > 0 && (
                  <div className="mt-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Subtotal:</span>
                      <span className="text-muted">{formatCurrency(selectedOrdem.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-amber-400">Desconto:</span>
                      <span className="text-amber-400">- {formatCurrency(selectedOrdem.total * (parseFloat(descontoConcluir.replace(',', '.')) / 100))}</span>
                    </div>
                    <div className="flex justify-between font-bold mt-1 pt-1 border-t border-amber-500/20">
                      <span className="text-white">Total Final:</span>
                      <span className="text-emerald-400">{formatCurrency(Math.floor(selectedOrdem.total * (1 - parseFloat(descontoConcluir.replace(',', '.')) / 100)))}</span>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-muted text-sm">
                Confirma a conclusao desta ordem de servico?
              </p>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConcluirConfirm(false);
                  setSelectedOrdem(null);
                  setPagamentosConcluir([{ tipo: 'PIX', valor: 0 }]);
                  setDescontoConcluir('');
                }}
                className="px-6 py-3 border border-border rounded-xl text-muted hover:bg-zinc-800 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const descontoPercent = parseFloat(descontoConcluir.replace(',', '.')) || 0;
                  const totalComDesconto = Math.floor(selectedOrdem.total * (1 - descontoPercent / 100));
                  const somaPagamentos = pagamentosConcluir.reduce((acc, p) => acc + (p.valor || 0), 0);

                  // Validar que soma dos pagamentos = total
                  if (Math.abs(somaPagamentos - totalComDesconto) > 0.01) {
                    toast.error('A soma dos pagamentos deve ser igual ao total');
                    return;
                  }

                  await handleStatusChange(
                    selectedOrdem,
                    'CONCLUIDO',
                    pagamentosConcluir,
                    descontoPercent
                  );
                  setShowConcluirConfirm(false);
                  setSelectedOrdem(null);
                  setPagamentosConcluir([{ tipo: 'PIX', valor: 0 }]);
                  setDescontoConcluir('');
                }}
                disabled={saving || pagamentosConcluir.length === 0}
                className={`px-6 py-3 rounded-xl text-white font-medium transition-all duration-300 disabled:opacity-50 ${
                  pagamentosConcluir.some(p => p.tipo === 'CREDITO_PESSOAL')
                    ? 'bg-gradient-to-r from-amber-500 to-amber-700 hover:shadow-lg hover:shadow-amber-500/25'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-700 hover:shadow-lg hover:shadow-emerald-500/25'
                }`}
              >
                Confirmar
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
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-500/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-muted animate-pulse">Carregando ordens...</p>
        </div>
      </div>
    }>
      <OrdensPageContent />
    </Suspense>
  );
}
