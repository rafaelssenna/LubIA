'use client';

import Header from '@/components/Header';
import {
  Plus, Search, X, FileText, User, Phone,
  CheckCircle, XCircle, Clock, Eye, Edit,
  Trash2, Loader2, Package, DollarSign, FileDown,
  AlertCircle, Send, TrendingUp, ArrowRight
} from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { downloadOrcamentoPDF, generateOrcamentoPDF, EmpresaConfig } from '@/lib/pdfGenerator';

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

interface Orcamento {
  id: number;
  numero: string;
  nomeCliente: string | null;
  telefoneCliente: string | null;
  status: string;
  total: number;
  observacoes: string | null;
  createdAt: string;
  servicosExtras: ServicoExtra[];
  itensProduto: ItemProduto[];
}

interface Produto {
  id: number;
  nome: string;
  codigo: string;
  precoVenda: number;
  quantidade: number;
  unidade: string;
}

const UNIDADES_GRANEL = ['LITRO', 'KG', 'METRO'];

const statusConfig: Record<string, { label: string; color: string; icon: any; bg: string; border: string }> = {
  PENDENTE: { label: 'Pendente', color: 'text-amber-400', icon: Clock, bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  APROVADO: { label: 'Aprovado', color: 'text-emerald-400', icon: CheckCircle, bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  RECUSADO: { label: 'Recusado', color: 'text-red-400', icon: XCircle, bg: 'bg-red-500/10', border: 'border-red-500/30' },
  EXPIRADO: { label: 'Expirado', color: 'text-zinc-400', icon: AlertCircle, bg: 'bg-zinc-500/10', border: 'border-zinc-500/30' },
  CONVERTIDO: { label: 'Convertido', color: 'text-blue-400', icon: TrendingUp, bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
};

function OrcamentosPageContent() {
  const toast = useToast();
  const router = useRouter();
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState({ total: 0, pendentes: 0, aprovados: 0, convertidos: 0 });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState<Orcamento | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [servicosExtras, setServicosExtras] = useState<{ descricao: string; valor: number }[]>([]);
  const [selectedProdutos, setSelectedProdutos] = useState<{ produtoId: number; quantidade: number; precoUnitario: number }[]>([]);
  const [searchProduto, setSearchProduto] = useState('');
  const [editingOrcamento, setEditingOrcamento] = useState<Orcamento | null>(null);
  const [novoServicoExtra, setNovoServicoExtra] = useState({ descricao: '', valor: '' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;

  // WhatsApp sending state
  const [sendingWhatsApp, setSendingWhatsApp] = useState<number | null>(null);

  // Empresa config for PDF
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig | null>(null);

  // Convert to O.S. states
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertingOrcamento, setConvertingOrcamento] = useState<Orcamento | null>(null);
  const [veiculos, setVeiculos] = useState<{ id: number; placa: string; marca: string; modelo: string; cliente: { nome: string } }[]>([]);
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<number | null>(null);
  const [converting, setConverting] = useState(false);
  const [searchVeiculo, setSearchVeiculo] = useState('');

  // Quick registration states
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [quickNome, setQuickNome] = useState('');
  const [quickTelefone, setQuickTelefone] = useState('');
  const [quickPlaca, setQuickPlaca] = useState('');
  const [quickMarca, setQuickMarca] = useState('');
  const [quickModelo, setQuickModelo] = useState('');
  const [quickCilindrada, setQuickCilindrada] = useState('');
  const [creatingQuick, setCreatingQuick] = useState(false);

  const fetchOrcamentos = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('busca', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());

      const res = await fetch(`/api/orcamentos?${params}`);
      const data = await res.json();
      setOrcamentos(data.data || []);
      setStats(data.stats || { total: 0, pendentes: 0, aprovados: 0, convertidos: 0 });
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      }
    } catch (error) {
      console.error('Erro ao buscar orçamentos:', error);
    } finally {
      setLoading(false);
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
      const res = await fetch('/api/whatsapp/config');
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

  const fetchVeiculos = async () => {
    try {
      const res = await fetch('/api/veiculos?limit=1000');
      const data = await res.json();
      setVeiculos(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar veículos:', error);
    }
  };

  const openConvertModal = (orcamento: Orcamento) => {
    if (orcamento.status === 'CONVERTIDO') {
      toast.warning('Este orçamento já foi convertido em O.S.');
      return;
    }
    if (orcamento.status === 'RECUSADO') {
      toast.warning('Não é possível converter um orçamento recusado');
      return;
    }
    setConvertingOrcamento(orcamento);
    setSelectedVeiculoId(null);
    setSearchVeiculo('');
    // Pre-fill quick registration with quote data
    setQuickNome(orcamento.nomeCliente || '');
    setQuickTelefone(orcamento.telefoneCliente || '');
    setQuickPlaca('');
    setQuickMarca('');
    setQuickModelo('');
    setQuickCilindrada('');
    setShowQuickRegister(false);
    fetchVeiculos();
    setShowConvertModal(true);
  };

  const handleConvert = async () => {
    if (!convertingOrcamento) return;
    if (!selectedVeiculoId) {
      toast.warning('Selecione um veículo para criar a O.S.');
      return;
    }

    setConverting(true);
    try {
      const res = await fetch(`/api/orcamentos/${convertingOrcamento.id}/converter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ veiculoId: selectedVeiculoId }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Orçamento convertido em O.S. #${data.data.numero}!`);
        setShowConvertModal(false);
        setConvertingOrcamento(null);
        // Redirect to orders page with the new order
        router.push(`/ordens?highlight=${data.data.id}`);
      } else {
        toast.error(data.error || 'Erro ao converter orçamento');
      }
    } catch (error) {
      console.error('Erro ao converter orçamento:', error);
      toast.error('Erro ao converter orçamento');
    } finally {
      setConverting(false);
    }
  };

  const handleQuickRegister = async () => {
    if (!quickNome.trim()) {
      toast.warning('Informe o nome do cliente');
      return;
    }
    if (!quickTelefone.trim()) {
      toast.warning('Informe o telefone do cliente');
      return;
    }
    if (!quickPlaca.trim()) {
      toast.warning('Informe a placa do veículo');
      return;
    }
    if (!quickMarca.trim() || !quickModelo.trim()) {
      toast.warning('Informe a marca e modelo do veículo');
      return;
    }

    setCreatingQuick(true);
    try {
      // 1. Create customer
      const clienteRes = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: quickNome.trim(),
          telefone: quickTelefone.trim(),
        }),
      });

      const clienteData = await clienteRes.json();

      if (!clienteRes.ok) {
        toast.error(clienteData.error || 'Erro ao criar cliente');
        return;
      }

      // 2. Create vehicle
      const veiculoRes = await fetch('/api/veiculos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: clienteData.data.id,
          placa: quickPlaca.trim().toUpperCase(),
          marca: quickMarca.trim(),
          modelo: quickModelo.trim(),
          cilindrada: quickCilindrada.trim() || null,
        }),
      });

      const veiculoData = await veiculoRes.json();

      if (!veiculoRes.ok) {
        toast.error(veiculoData.error || 'Erro ao criar veículo');
        return;
      }

      toast.success('Cliente e veículo cadastrados!');

      // 3. Select the new vehicle and refresh list
      setSelectedVeiculoId(veiculoData.data.id);
      setShowQuickRegister(false);
      fetchVeiculos();

    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      toast.error('Erro ao cadastrar cliente/veículo');
    } finally {
      setCreatingQuick(false);
    }
  };

  useEffect(() => {
    fetchOrcamentos();
    fetchEmpresaConfig();
  }, [searchTerm, statusFilter, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const openNewModal = () => {
    fetchProdutos();
    setEditingOrcamento(null);
    setNomeCliente('');
    setTelefoneCliente('');
    setObservacoes('');
    setServicosExtras([]);
    setSelectedProdutos([]);
    setSearchProduto('');
    setNovoServicoExtra({ descricao: '', valor: '' });
    setShowModal(true);
  };

  const openEditModal = (orcamento: Orcamento) => {
    if (orcamento.status === 'CONVERTIDO') {
      toast.warning('Orçamento já foi convertido em O.S.');
      return;
    }

    fetchProdutos();

    setEditingOrcamento(orcamento);
    setNomeCliente(orcamento.nomeCliente || '');
    setTelefoneCliente(orcamento.telefoneCliente || '');
    setObservacoes(orcamento.observacoes || '');
    setServicosExtras(orcamento.servicosExtras?.map(s => ({
      descricao: s.descricao,
      valor: s.valor,
    })) || []);
    setSelectedProdutos(orcamento.itensProduto.map(i => ({
      produtoId: i.produtoId,
      quantidade: i.quantidade,
      precoUnitario: i.precoUnitario,
    })));
    setSearchProduto('');
    setNovoServicoExtra({ descricao: '', valor: '' });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (servicosExtras.length === 0 && selectedProdutos.length === 0) {
      toast.warning('Adicione pelo menos um produto ou serviço');
      return;
    }

    const isEditing = !!editingOrcamento;
    setSaving(true);
    try {
      const payload = {
        nomeCliente: nomeCliente || null,
        telefoneCliente: telefoneCliente || null,
        observacoes: observacoes || null,
        servicosExtras: servicosExtras,
        itensProduto: selectedProdutos,
      };

      const url = isEditing ? `/api/orcamentos/${editingOrcamento.id}` : '/api/orcamentos';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(isEditing
          ? 'Orçamento atualizado com sucesso!'
          : `Orçamento ${data.data.numero} criado com sucesso!`
        );
        setShowModal(false);
        setEditingOrcamento(null);
        fetchOrcamentos();
      } else {
        toast.error(data.error || `Erro ao ${isEditing ? 'atualizar' : 'criar'} orçamento`);
      }
    } catch (error) {
      console.error(`Erro ao ${isEditing ? 'atualizar' : 'criar'} orçamento:`, error);
      toast.error(`Erro ao ${isEditing ? 'atualizar' : 'criar'} orçamento`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedOrcamento) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/orcamentos/${selectedOrcamento.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Orçamento excluído com sucesso!');
        setShowDeleteConfirm(false);
        setSelectedOrcamento(null);
        fetchOrcamentos();
      } else {
        toast.error(data.error || 'Erro ao excluir orçamento');
      }
    } catch (error) {
      toast.error('Erro ao excluir orçamento');
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

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const sendWhatsApp = async (orcamento: Orcamento) => {
    if (!orcamento.telefoneCliente) {
      toast.warning('Este orçamento não tem telefone cadastrado');
      return;
    }

    setSendingWhatsApp(orcamento.id);

    const telefone = orcamento.telefoneCliente.replace(/\D/g, '');

    try {
      const doc = generateOrcamentoPDF(orcamento as any, empresaConfig || undefined);
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      const caption = `*Orçamento ${orcamento.numero}*\n\n` +
        (orcamento.nomeCliente ? `*Cliente:* ${orcamento.nomeCliente}\n\n` : '') +
        (orcamento.itensProduto.length > 0 ? `*Produtos:*\n` +
          orcamento.itensProduto.map(i => `  • ${i.produtoNome} (${i.quantidade}x) - ${formatCurrency(i.subtotal)}`).join('\n') + '\n\n' : '') +
        (orcamento.servicosExtras.length > 0 ? `*Serviços:*\n` +
          orcamento.servicosExtras.map(s => `  • ${s.descricao} - ${formatCurrency(s.valor)}`).join('\n') + '\n\n' : '') +
        `*Total: ${formatCurrency(orcamento.total)}*\n\n` +
        `_Orçamento válido mediante aprovação._`;

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: telefone,
          type: 'media',
          file: `data:application/pdf;base64,${pdfBase64}`,
          docName: `${orcamento.numero}.pdf`,
          caption,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Orçamento enviado via WhatsApp!');
      } else {
        toast.error(data.error || 'Erro ao enviar via WhatsApp');
      }
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      toast.error('Erro ao enviar via WhatsApp');
    } finally {
      setSendingWhatsApp(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#E85D04]/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-[#E85D04] rounded-full animate-spin"></div>
          </div>
          <p className="text-zinc-400 animate-pulse">Carregando orçamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Header
        title="Orçamentos"
        subtitle="Crie e gerencie orçamentos para seus clientes"
      />

      {/* Stats Banner */}
      <div className="px-4 lg:px-8 space-y-8">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-8">
        <div className="group relative overflow-hidden bg-gradient-to-br from-[#E85D04]/20 to-[#E85D04]/5 rounded-2xl p-6 border border-[#E85D04]/20 hover:border-[#E85D04]/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#E85D04]/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-[#E85D04]/20 rounded-xl">
                <FileText className="h-6 w-6 text-[#E85D04]" />
              </div>
              <span className="text-xs font-medium text-[#E85D04] bg-[#E85D04]/10 px-2 py-1 rounded-full">Total</span>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{stats.total}</p>
            <p className="text-sm text-zinc-400">orçamentos criados</p>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-amber-500/20 to-amber-500/5 rounded-2xl p-6 border border-amber-500/20 hover:border-amber-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-500/20 rounded-xl">
                <Clock className="h-6 w-6 text-amber-400" />
              </div>
              <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">Aguardando</span>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{stats.pendentes}</p>
            <p className="text-sm text-zinc-400">pendentes de resposta</p>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-2xl p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <CheckCircle className="h-6 w-6 text-emerald-400" />
              </div>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">Aceitos</span>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{stats.aprovados}</p>
            <p className="text-sm text-zinc-400">aprovados pelo cliente</p>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-2xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
              <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">Sucesso</span>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{stats.convertidos}</p>
            <p className="text-sm text-zinc-400">convertidos em O.S.</p>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-[#1a1a1a] rounded-2xl p-4 border border-zinc-800/50">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por número, cliente ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#232323] border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04]/50 focus:border-[#E85D04]/50 transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-[#232323] border border-zinc-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E85D04]/50 cursor-pointer min-w-[160px]"
          >
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="APROVADO">Aprovado</option>
            <option value="RECUSADO">Recusado</option>
            <option value="CONVERTIDO">Convertido</option>
          </select>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E85D04] to-[#ff6b1a] hover:from-[#ff6b1a] hover:to-[#E85D04] text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-[#E85D04]/25 hover:shadow-[#E85D04]/40 hover:scale-[1.02] w-full lg:w-auto justify-center"
        >
          <Plus className="h-5 w-5" />
          <span>Novo Orçamento</span>
        </button>
      </div>

      {/* Orçamentos List */}
      {orcamentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#1a1a1a] rounded-2xl border border-zinc-800/50">
          <div className="p-6 bg-zinc-800/50 rounded-full mb-6">
            <FileText className="h-12 w-12 text-zinc-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Nenhum orçamento encontrado</h3>
          <p className="text-zinc-400 mb-6">Comece criando seu primeiro orçamento</p>
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 px-6 py-3 bg-[#E85D04] hover:bg-[#E85D04]/90 text-white font-medium rounded-xl transition-colors"
          >
            <Plus className="h-5 w-5" />
            Criar Orçamento
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orcamentos.map((orcamento) => {
            const statusInfo = statusConfig[orcamento.status] || statusConfig.PENDENTE;
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={orcamento.id}
                className="group bg-[#1a1a1a] hover:bg-[#1e1e1e] rounded-2xl border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-300 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Número e Data */}
                    <div className="flex items-center gap-4 min-w-[180px]">
                      <div className="p-3 bg-[#E85D04]/10 rounded-xl group-hover:bg-[#E85D04]/20 transition-colors">
                        <FileText className="h-6 w-6 text-[#E85D04]" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white">{orcamento.numero}</p>
                        <p className="text-sm text-zinc-500">{formatDate(orcamento.createdAt)}</p>
                      </div>
                    </div>

                    {/* Cliente */}
                    <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                      <div className="p-3 bg-zinc-800 rounded-xl">
                        <User className="h-5 w-5 text-zinc-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {orcamento.nomeCliente || 'Cliente não informado'}
                        </p>
                        <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{formatPhone(orcamento.telefoneCliente)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center">
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}>
                        <StatusIcon className="h-4 w-4" />
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Total */}
                    <div className="flex flex-col items-end min-w-[140px]">
                      <span className="text-2xl font-bold text-white">{formatCurrency(orcamento.total)}</span>
                      <span className="text-xs text-zinc-500">
                        {orcamento.itensProduto.length + orcamento.servicosExtras.length} itens
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pl-4 border-l border-zinc-800">
                      <button
                        onClick={() => {
                          setSelectedOrcamento(orcamento);
                          setShowDetailModal(true);
                        }}
                        className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
                        title="Ver detalhes"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      {orcamento.telefoneCliente && (
                        <button
                          onClick={() => sendWhatsApp(orcamento)}
                          disabled={sendingWhatsApp === orcamento.id}
                          className="p-2.5 text-zinc-400 hover:text-green-400 hover:bg-green-500/10 rounded-xl transition-all disabled:opacity-50"
                          title="Enviar via WhatsApp"
                        >
                          {sendingWhatsApp === orcamento.id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Send className="h-5 w-5" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => downloadOrcamentoPDF(orcamento as any, empresaConfig || undefined)}
                        className="p-2.5 text-zinc-400 hover:text-[#E85D04] hover:bg-[#E85D04]/10 rounded-xl transition-all"
                        title="Baixar PDF"
                      >
                        <FileDown className="h-5 w-5" />
                      </button>
                      {orcamento.status !== 'CONVERTIDO' && orcamento.status !== 'RECUSADO' && (
                        <button
                          onClick={() => openConvertModal(orcamento)}
                          className="p-2.5 text-zinc-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-xl transition-all"
                          title="Converter em O.S."
                        >
                          <ArrowRight className="h-5 w-5" />
                        </button>
                      )}
                      {orcamento.status !== 'CONVERTIDO' && (
                        <>
                          <button
                            onClick={() => openEditModal(orcamento)}
                            className="p-2.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                            title="Editar"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrcamento(orcamento);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                            title="Excluir"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#1a1a1a] rounded-2xl p-4 border border-zinc-800/50">
          <p className="text-sm text-zinc-400">
            Mostrando <span className="text-white font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> a{' '}
            <span className="text-white font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> de{' '}
            <span className="text-white font-medium">{totalItems}</span> orçamentos
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-xl font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-[#E85D04] text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-zinc-800">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {editingOrcamento ? 'Editar Orçamento' : 'Novo Orçamento'}
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  {editingOrcamento ? 'Atualize as informações do orçamento' : 'Preencha os dados para criar um novo orçamento'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
              >
                <X className="h-6 w-6 text-zinc-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Nome do Cliente
                  </label>
                  <input
                    type="text"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    placeholder="Nome (opcional)"
                    className="w-full px-4 py-3 bg-[#232323] border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04]/50 focus:border-[#E85D04]/50 transition-all"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                    <Phone className="h-4 w-4" />
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    value={telefoneCliente}
                    onChange={(e) => setTelefoneCliente(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-4 py-3 bg-[#232323] border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04]/50 focus:border-[#E85D04]/50 transition-all"
                  />
                </div>
              </div>

              {/* Produtos */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-zinc-300">
                  Adicionar Produtos
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Buscar produto..."
                    value={searchProduto}
                    onChange={(e) => setSearchProduto(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-[#232323] border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04]/50 focus:border-[#E85D04]/50 transition-all"
                  />
                </div>
                {searchProduto && (
                  <div className="max-h-40 overflow-y-auto space-y-2 p-2 bg-[#232323] rounded-xl border border-zinc-700/50">
                    {produtos
                      .filter(p =>
                        p.nome.toLowerCase().includes(searchProduto.toLowerCase()) ||
                        p.codigo.toLowerCase().includes(searchProduto.toLowerCase())
                      )
                      .slice(0, 5)
                      .map((produto) => (
                        <button
                          key={produto.id}
                          onClick={() => {
                            addProduto(produto);
                            setSearchProduto('');
                          }}
                          className="w-full p-3 bg-[#1a1a1a] border border-zinc-700/50 rounded-xl text-left hover:border-[#E85D04]/50 hover:bg-[#E85D04]/5 transition-all"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-white font-medium">{produto.nome}</p>
                              <p className="text-xs text-zinc-400">{produto.codigo}</p>
                            </div>
                            <span className="text-[#E85D04] font-bold">{formatCurrency(produto.precoVenda)}</span>
                          </div>
                        </button>
                      ))}
                  </div>
                )}

                {selectedProdutos.length > 0 && (
                  <div className="space-y-2">
                    {selectedProdutos.map((sp) => {
                      const produto = produtos.find(p => p.id === sp.produtoId);
                      const isGranel = produto && UNIDADES_GRANEL.includes(produto.unidade);
                      return (
                        <div key={sp.produtoId} className="flex items-center gap-3 p-3 bg-[#232323] rounded-xl border border-zinc-700/50">
                          <Package className="h-5 w-5 text-[#E85D04]" />
                          <span className="flex-1 text-white font-medium">
                            {produto?.nome}
                            {isGranel && <span className="ml-2 text-xs text-amber-400">(Granel)</span>}
                          </span>
                          <input
                            type="number"
                            min={isGranel ? "0.1" : "1"}
                            step={isGranel ? "0.1" : "1"}
                            value={sp.quantidade}
                            onChange={(e) => {
                              const newQtd = parseFloat(e.target.value) || (isGranel ? 0.1 : 1);
                              setSelectedProdutos(selectedProdutos.map(p =>
                                p.produtoId === sp.produtoId ? { ...p, quantidade: newQtd } : p
                              ));
                            }}
                            className="w-20 px-3 py-2 bg-[#1a1a1a] border border-zinc-700/50 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-[#E85D04]/50"
                          />
                          <span className="text-zinc-300 font-medium min-w-[100px] text-right">{formatCurrency(sp.precoUnitario * sp.quantidade)}</span>
                          <button
                            onClick={() => removeProduto(sp.produtoId)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Serviços Extras */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-zinc-300">
                  Serviços / Mão de Obra
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Descrição do serviço..."
                    value={novoServicoExtra.descricao}
                    onChange={(e) => setNovoServicoExtra({ ...novoServicoExtra, descricao: e.target.value })}
                    className="flex-1 px-4 py-3 bg-[#232323] border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04]/50 focus:border-[#E85D04]/50 transition-all"
                  />
                  <input
                    type="number"
                    placeholder="Valor"
                    value={novoServicoExtra.valor}
                    onChange={(e) => setNovoServicoExtra({ ...novoServicoExtra, valor: e.target.value })}
                    className="w-32 px-4 py-3 bg-[#232323] border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04]/50 focus:border-[#E85D04]/50 transition-all"
                  />
                  <button
                    onClick={addServicoExtra}
                    className="px-4 py-3 bg-[#E85D04] hover:bg-[#E85D04]/90 text-white rounded-xl transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                {servicosExtras.length > 0 && (
                  <div className="space-y-2">
                    {servicosExtras.map((servico, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-[#232323] rounded-xl border border-zinc-700/50">
                        <DollarSign className="h-5 w-5 text-emerald-400" />
                        <span className="flex-1 text-white font-medium">{servico.descricao}</span>
                        <span className="text-zinc-300 font-medium">{formatCurrency(servico.valor)}</span>
                        <button
                          onClick={() => removeServicoExtra(index)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Observações
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#232323] border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04]/50 focus:border-[#E85D04]/50 transition-all resize-none"
                  placeholder="Observações adicionais (opcional)..."
                />
              </div>

              {/* Total */}
              <div className="p-5 bg-gradient-to-r from-[#E85D04]/20 to-[#E85D04]/10 rounded-xl border border-[#E85D04]/30">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-white">Total do Orçamento:</span>
                  <span className="text-3xl font-bold text-[#E85D04]">{formatCurrency(calcularTotal())}</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-between">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#E85D04] to-[#ff6b1a] hover:from-[#ff6b1a] hover:to-[#E85D04] text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="h-5 w-5 animate-spin" />}
                {editingOrcamento ? 'Salvar Alterações' : 'Criar Orçamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedOrcamento && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-zinc-800">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedOrcamento.numero}
                </h2>
                <p className="text-sm text-zinc-400 mt-1">{formatDate(selectedOrcamento.createdAt)}</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedOrcamento(null);
                }}
                className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
              >
                <X className="h-6 w-6 text-zinc-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-[#232323] rounded-xl">
                <span className="text-zinc-400">Status:</span>
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${statusConfig[selectedOrcamento.status].bg} ${statusConfig[selectedOrcamento.status].color}`}>
                  {statusConfig[selectedOrcamento.status].label}
                </span>
              </div>

              {/* Cliente */}
              <div className="p-4 bg-[#232323] rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-zinc-700 rounded-xl">
                    <User className="h-6 w-6 text-zinc-300" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-lg">{selectedOrcamento.nomeCliente || 'Cliente não informado'}</p>
                    <p className="text-zinc-400 flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4" />
                      {formatPhone(selectedOrcamento.telefoneCliente)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Products */}
              {selectedOrcamento.itensProduto.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Produtos
                  </h4>
                  <div className="space-y-2">
                    {selectedOrcamento.itensProduto.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-4 bg-[#232323] rounded-xl">
                        <div>
                          <p className="text-white font-medium">{item.produtoNome}</p>
                          <p className="text-sm text-zinc-400">{item.quantidade}x {formatCurrency(item.precoUnitario)}</p>
                        </div>
                        <span className="text-white font-bold">{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Services */}
              {selectedOrcamento.servicosExtras.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Serviços
                  </h4>
                  <div className="space-y-2">
                    {selectedOrcamento.servicosExtras.map((servico, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-[#232323] rounded-xl">
                        <span className="text-white font-medium">{servico.descricao}</span>
                        <span className="text-white font-bold">{formatCurrency(servico.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="p-5 bg-gradient-to-r from-[#E85D04]/20 to-[#E85D04]/10 rounded-xl border border-[#E85D04]/30">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-white">Total:</span>
                  <span className="text-3xl font-bold text-[#E85D04]">{formatCurrency(selectedOrcamento.total)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => downloadOrcamentoPDF(selectedOrcamento as any, empresaConfig || undefined)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-[#E85D04] hover:bg-[#E85D04]/90 text-white font-medium rounded-xl transition-colors"
                >
                  <FileDown className="h-5 w-5" />
                  Baixar PDF
                </button>
                {selectedOrcamento.telefoneCliente && (
                  <button
                    onClick={() => sendWhatsApp(selectedOrcamento)}
                    disabled={sendingWhatsApp === selectedOrcamento.id}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                  >
                    {sendingWhatsApp === selectedOrcamento.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                    WhatsApp
                  </button>
                )}
              </div>

              {/* Convert Button */}
              {selectedOrcamento.status !== 'CONVERTIDO' && selectedOrcamento.status !== 'RECUSADO' && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openConvertModal(selectedOrcamento);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors"
                >
                  <ArrowRight className="h-5 w-5" />
                  Converter em O.S.
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedOrcamento && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-sm p-6 border border-zinc-800">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-red-500/10 rounded-full">
                <Trash2 className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Excluir Orçamento</h3>
                <p className="text-zinc-400">{selectedOrcamento.numero}</p>
              </div>
            </div>
            <p className="text-zinc-300 mb-8">
              Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedOrcamento(null);
                }}
                className="flex-1 px-4 py-3 border border-zinc-700 text-white rounded-xl hover:bg-zinc-800 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium disabled:opacity-50"
              >
                {saving && <Loader2 className="h-5 w-5 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to O.S. Modal */}
      {showConvertModal && convertingOrcamento && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-zinc-800">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div>
                <h2 className="text-2xl font-bold text-white">Converter em O.S.</h2>
                <p className="text-sm text-zinc-400 mt-1">
                  {convertingOrcamento.numero} - {convertingOrcamento.nomeCliente || 'Cliente não informado'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowConvertModal(false);
                  setConvertingOrcamento(null);
                }}
                className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
              >
                <X className="h-6 w-6 text-zinc-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Toggle Tabs */}
              <div className="flex gap-2 p-1 bg-[#232323] rounded-xl">
                <button
                  onClick={() => setShowQuickRegister(false)}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                    !showQuickRegister
                      ? 'bg-purple-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Selecionar Veículo
                </button>
                <button
                  onClick={() => setShowQuickRegister(true)}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                    showQuickRegister
                      ? 'bg-purple-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  + Cadastro Rápido
                </button>
              </div>

              {!showQuickRegister ? (
                <>
                  {/* Info */}
                  <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                    <p className="text-purple-300 text-sm">
                      Selecione o veículo do cliente para criar a Ordem de Serviço. Os produtos e serviços serão copiados automaticamente.
                    </p>
                  </div>

                  {/* Vehicle Search */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      Buscar Veículo
                    </label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Buscar por placa, modelo ou cliente..."
                        value={searchVeiculo}
                        onChange={(e) => setSearchVeiculo(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-[#232323] border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Vehicle List */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {veiculos
                      .filter(v => {
                        const search = searchVeiculo.toLowerCase();
                        return !search ||
                          v.placa.toLowerCase().includes(search) ||
                          v.modelo.toLowerCase().includes(search) ||
                          v.marca.toLowerCase().includes(search) ||
                          v.cliente.nome.toLowerCase().includes(search);
                      })
                      .map((veiculo) => (
                        <button
                          key={veiculo.id}
                          onClick={() => setSelectedVeiculoId(veiculo.id)}
                          className={`w-full p-4 rounded-xl border transition-all text-left ${
                            selectedVeiculoId === veiculo.id
                              ? 'bg-purple-500/20 border-purple-500'
                              : 'bg-[#232323] border-zinc-700 hover:border-zinc-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-white">{veiculo.placa}</p>
                              <p className="text-sm text-zinc-400">{veiculo.marca} {veiculo.modelo}</p>
                              <p className="text-xs text-zinc-500">{veiculo.cliente.nome}</p>
                            </div>
                            {selectedVeiculoId === veiculo.id && (
                              <CheckCircle className="h-6 w-6 text-purple-400" />
                            )}
                          </div>
                        </button>
                      ))}
                    {veiculos.length === 0 && (
                      <p className="text-center text-zinc-500 py-8">Nenhum veículo cadastrado</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Quick Registration Form */}
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <p className="text-emerald-300 text-sm">
                      Cadastre rapidamente o cliente e veículo. Os dados do orçamento foram preenchidos automaticamente.
                    </p>
                  </div>

                  {/* Customer Fields */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Dados do Cliente
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Nome *</label>
                        <input
                          type="text"
                          value={quickNome}
                          onChange={(e) => setQuickNome(e.target.value)}
                          placeholder="Nome do cliente"
                          className="w-full px-4 py-2.5 bg-[#232323] border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Telefone *</label>
                        <input
                          type="text"
                          value={quickTelefone}
                          onChange={(e) => setQuickTelefone(e.target.value)}
                          placeholder="(00) 00000-0000"
                          className="w-full px-4 py-2.5 bg-[#232323] border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Fields */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Dados do Veículo
                    </h4>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Placa *</label>
                        <input
                          type="text"
                          value={quickPlaca}
                          onChange={(e) => setQuickPlaca(e.target.value.toUpperCase())}
                          placeholder="ABC1234"
                          maxLength={7}
                          className="w-full px-4 py-2.5 bg-[#232323] border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Marca *</label>
                        <input
                          type="text"
                          value={quickMarca}
                          onChange={(e) => setQuickMarca(e.target.value)}
                          placeholder="Fiat"
                          className="w-full px-4 py-2.5 bg-[#232323] border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Modelo *</label>
                        <input
                          type="text"
                          value={quickModelo}
                          onChange={(e) => setQuickModelo(e.target.value)}
                          placeholder="Uno"
                          className="w-full px-4 py-2.5 bg-[#232323] border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Cilindrada</label>
                        <input
                          type="text"
                          value={quickCilindrada}
                          onChange={(e) => setQuickCilindrada(e.target.value)}
                          placeholder="1.0"
                          maxLength={20}
                          className="w-full px-4 py-2.5 bg-[#232323] border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Register Button */}
                  <button
                    onClick={handleQuickRegister}
                    disabled={creatingQuick}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                  >
                    {creatingQuick ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Plus className="h-5 w-5" />
                    )}
                    Cadastrar e Selecionar
                  </button>
                </>
              )}

              {/* Total */}
              <div className="p-4 bg-[#232323] rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Total do Orçamento:</span>
                  <span className="text-2xl font-bold text-[#E85D04]">
                    R$ {convertingOrcamento.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-zinc-800">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConvertModal(false);
                    setConvertingOrcamento(null);
                  }}
                  className="flex-1 px-4 py-3 border border-zinc-700 text-white rounded-xl hover:bg-zinc-800 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConvert}
                  disabled={converting || !selectedVeiculoId}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {converting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ArrowRight className="h-5 w-5" />
                  )}
                  Converter em O.S.
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrcamentosPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#E85D04]/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-[#E85D04] rounded-full animate-spin"></div>
          </div>
          <p className="text-zinc-400 animate-pulse">Carregando orçamentos...</p>
        </div>
      </div>
    }>
      <OrcamentosPageContent />
    </Suspense>
  );
}
