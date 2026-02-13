'use client';

import Header from '@/components/Header';
import {
  Plus, Search, X, FileText, Car, User, Calendar,
  CheckCircle, XCircle, Clock, ArrowRight, Eye, Edit,
  Trash2, Loader2, Package, DollarSign, FileDown,
  AlertCircle, Send, Copy
} from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { useToast } from '@/components/Toast';
import { capitalize, formatPlate } from '@/utils/format';
import { downloadOrcamentoPDF, EmpresaConfig } from '@/lib/pdfGenerator';

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

interface Orcamento {
  id: number;
  numero: string;
  status: string;
  validade: string;
  observacoes: string | null;
  total: number;
  ordemServicoId: number | null;
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
  PENDENTE: { label: 'Pendente', color: 'text-amber-400', icon: Clock, bg: 'bg-amber-500/10' },
  APROVADO: { label: 'Aprovado', color: 'text-[#43A047]', icon: CheckCircle, bg: 'bg-green-500/10' },
  RECUSADO: { label: 'Recusado', color: 'text-red-500', icon: XCircle, bg: 'bg-red-500/10' },
  EXPIRADO: { label: 'Expirado', color: 'text-gray-400', icon: AlertCircle, bg: 'bg-gray-500/10' },
  CONVERTIDO: { label: 'Convertido', color: 'text-blue-400', icon: ArrowRight, bg: 'bg-blue-500/10' },
};

function OrcamentosPageContent() {
  const toast = useToast();
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState({ total: 0, pendentes: 0, aprovados: 0, convertidos: 0 });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showConverterModal, setShowConverterModal] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState<Orcamento | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states for new orçamento
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<number | null>(null);
  const [validade, setValidade] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [servicosExtras, setServicosExtras] = useState<{ descricao: string; valor: number }[]>([]);
  const [selectedProdutos, setSelectedProdutos] = useState<{ produtoId: number; quantidade: number; precoUnitario: number }[]>([]);
  const [searchVeiculo, setSearchVeiculo] = useState('');
  const [searchProduto, setSearchProduto] = useState('');
  const [step, setStep] = useState(1);
  const [editingOrcamento, setEditingOrcamento] = useState<Orcamento | null>(null);
  const [novoServicoExtra, setNovoServicoExtra] = useState({ descricao: '', valor: '' });

  // Converter modal states
  const [dataAgendadaConversao, setDataAgendadaConversao] = useState('');
  const [kmEntradaConversao, setKmEntradaConversao] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;

  // Empresa config for PDF
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig | null>(null);

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

  useEffect(() => {
    fetchOrcamentos();
    fetchEmpresaConfig();
  }, [searchTerm, statusFilter, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const openNewModal = () => {
    fetchVeiculos();
    fetchProdutos();
    setEditingOrcamento(null);
    setSelectedVeiculoId(null);
    // Validade padrão: 7 dias
    const defaultValidade = new Date();
    defaultValidade.setDate(defaultValidade.getDate() + 7);
    setValidade(defaultValidade.toISOString().slice(0, 10));
    setObservacoes('');
    setServicosExtras([]);
    setSelectedProdutos([]);
    setSearchVeiculo('');
    setSearchProduto('');
    setNovoServicoExtra({ descricao: '', valor: '' });
    setStep(1);
    setShowModal(true);
  };

  const openEditModal = (orcamento: Orcamento) => {
    if (orcamento.status === 'CONVERTIDO') {
      toast.warning('Orçamento já foi convertido em O.S.');
      return;
    }

    fetchVeiculos();
    fetchProdutos();

    setEditingOrcamento(orcamento);
    setSelectedVeiculoId(orcamento.veiculo.id);
    setValidade(new Date(orcamento.validade).toISOString().slice(0, 10));
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
      toast.warning('Adicione pelo menos um produto ou serviço');
      return;
    }

    const isEditing = !!editingOrcamento;
    setSaving(true);
    try {
      const payload = {
        veiculoId: selectedVeiculoId,
        validade: validade || null,
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

  const handleStatusChange = async (orcamento: Orcamento, newStatus: string) => {
    try {
      const res = await fetch(`/api/orcamentos/${orcamento.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success('Status atualizado!');
        fetchOrcamentos();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao atualizar status');
      }
    } catch (error) {
      toast.error('Erro ao atualizar status');
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

  const openConverterModal = (orcamento: Orcamento) => {
    if (orcamento.status === 'CONVERTIDO') {
      toast.warning('Orçamento já foi convertido');
      return;
    }
    if (orcamento.status === 'RECUSADO') {
      toast.warning('Orçamento foi recusado');
      return;
    }
    setSelectedOrcamento(orcamento);
    // Data padrão: próxima hora cheia
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    setDataAgendadaConversao(now.toISOString().slice(0, 16));
    setKmEntradaConversao(orcamento.veiculo.kmAtual?.toString() || '');
    setShowConverterModal(true);
  };

  const handleConverter = async () => {
    if (!selectedOrcamento) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/orcamentos/${selectedOrcamento.id}/converter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataAgendada: dataAgendadaConversao || null,
          kmEntrada: kmEntradaConversao ? parseInt(kmEntradaConversao) : null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || 'Orçamento convertido em O.S.!');
        setShowConverterModal(false);
        setSelectedOrcamento(null);
        fetchOrcamentos();
      } else {
        toast.error(data.error || 'Erro ao converter orçamento');
      }
    } catch (error) {
      toast.error('Erro ao converter orçamento');
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

  const filteredVeiculos = veiculos.filter(v =>
    v.placa.toLowerCase().includes(searchVeiculo.toLowerCase()) ||
    v.cliente.nome.toLowerCase().includes(searchVeiculo.toLowerCase()) ||
    `${v.marca} ${v.modelo}`.toLowerCase().includes(searchVeiculo.toLowerCase())
  );

  const isExpired = (validade: string) => {
    return new Date(validade) < new Date();
  };

  const copyToClipboard = (orcamento: Orcamento) => {
    const text = `*Orçamento ${orcamento.numero}*\n` +
      `Veículo: ${orcamento.veiculo.placa} - ${orcamento.veiculo.marca} ${orcamento.veiculo.modelo}\n` +
      `Cliente: ${orcamento.veiculo.cliente.nome}\n\n` +
      `*Itens:*\n` +
      orcamento.itensProduto.map(i => `• ${i.produtoNome} (${i.quantidade}x) - ${formatCurrency(i.subtotal)}`).join('\n') +
      (orcamento.servicosExtras.length > 0 ? '\n' + orcamento.servicosExtras.map(s => `• ${s.descricao} - ${formatCurrency(s.valor)}`).join('\n') : '') +
      `\n\n*Total: ${formatCurrency(orcamento.total)}*\n` +
      `Válido até: ${formatDate(orcamento.validade)}`;

    navigator.clipboard.writeText(text);
    toast.success('Orçamento copiado para WhatsApp!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#E85D04]" />
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Orçamentos"
        subtitle="Crie e gerencie orçamentos para seus clientes"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#232323] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#E85D04]/10 rounded-lg">
              <FileText className="h-5 w-5 text-[#E85D04]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-zinc-400">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-[#232323] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.pendentes}</p>
              <p className="text-xs text-zinc-400">Pendentes</p>
            </div>
          </div>
        </div>
        <div className="bg-[#232323] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="h-5 w-5 text-[#43A047]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.aprovados}</p>
              <p className="text-xs text-zinc-400">Aprovados</p>
            </div>
          </div>
        </div>
        <div className="bg-[#232323] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <ArrowRight className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.convertidos}</p>
              <p className="text-xs text-zinc-400">Convertidos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por número, placa ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#232323] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04] focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-[#232323] border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#E85D04]"
        >
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="APROVADO">Aprovado</option>
          <option value="RECUSADO">Recusado</option>
          <option value="EXPIRADO">Expirado</option>
          <option value="CONVERTIDO">Convertido</option>
        </select>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#E85D04] hover:bg-[#E85D04]/90 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Orçamento</span>
        </button>
      </div>

      {/* Orçamentos List */}
      <div className="bg-[#232323] rounded-lg overflow-hidden">
        {orcamentos.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">Nenhum orçamento encontrado</p>
            <button
              onClick={openNewModal}
              className="mt-4 text-[#E85D04] hover:underline"
            >
              Criar primeiro orçamento
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1a1a1a]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Número</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Cliente / Veículo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Validade</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Total</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {orcamentos.map((orcamento) => {
                  const statusInfo = statusConfig[orcamento.status] || statusConfig.PENDENTE;
                  const StatusIcon = statusInfo.icon;
                  const expired = orcamento.status === 'PENDENTE' && isExpired(orcamento.validade);

                  return (
                    <tr key={orcamento.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-white">{orcamento.numero}</span>
                        <p className="text-xs text-zinc-500">{formatDate(orcamento.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-zinc-700 rounded">
                            <Car className="h-4 w-4 text-zinc-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{formatPlate(orcamento.veiculo.placa)}</p>
                            <p className="text-xs text-zinc-400">{orcamento.veiculo.cliente.nome}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${expired ? 'text-red-400' : 'text-zinc-300'}`}>
                          {formatDate(orcamento.validade)}
                        </span>
                        {expired && (
                          <p className="text-xs text-red-400">Expirado</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-white font-medium">{formatCurrency(orcamento.total)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedOrcamento(orcamento);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => copyToClipboard(orcamento)}
                            className="p-1.5 text-zinc-400 hover:text-green-400 hover:bg-zinc-700 rounded transition-colors"
                            title="Copiar para WhatsApp"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => downloadOrcamentoPDF(orcamento as any, empresaConfig || undefined)}
                            className="p-1.5 text-zinc-400 hover:text-[#E85D04] hover:bg-zinc-700 rounded transition-colors"
                            title="Baixar PDF"
                          >
                            <FileDown className="h-4 w-4" />
                          </button>
                          {orcamento.status !== 'CONVERTIDO' && (
                            <>
                              <button
                                onClick={() => openEditModal(orcamento)}
                                className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-zinc-700 rounded transition-colors"
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openConverterModal(orcamento)}
                                className="p-1.5 text-zinc-400 hover:text-[#E85D04] hover:bg-zinc-700 rounded transition-colors"
                                title="Converter em O.S."
                              >
                                <ArrowRight className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedOrcamento(orcamento);
                                  setShowDeleteConfirm(true);
                                }}
                                className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-4">
          <p className="text-sm text-zinc-400">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-zinc-700 text-white rounded disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-zinc-700 text-white rounded disabled:opacity-50"
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white">
                {editingOrcamento ? 'Editar Orçamento' : 'Novo Orçamento'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Buscar Veículo *
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Buscar por placa, cliente ou modelo..."
                        value={searchVeiculo}
                        onChange={(e) => setSearchVeiculo(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-[#232323] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04]"
                      />
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {filteredVeiculos.map((veiculo) => (
                      <button
                        key={veiculo.id}
                        onClick={() => setSelectedVeiculoId(veiculo.id)}
                        className={`w-full p-3 rounded-lg border transition-colors text-left ${
                          selectedVeiculoId === veiculo.id
                            ? 'bg-[#E85D04]/10 border-[#E85D04] text-white'
                            : 'bg-[#232323] border-zinc-700 text-zinc-300 hover:border-zinc-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Car className="h-5 w-5" />
                          <div>
                            <p className="font-medium">{formatPlate(veiculo.placa)} - {veiculo.marca} {veiculo.modelo}</p>
                            <p className="text-xs text-zinc-400">{veiculo.cliente.nome}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Validade do Orçamento
                    </label>
                    <input
                      type="date"
                      value={validade}
                      onChange={(e) => setValidade(e.target.value)}
                      className="w-full px-4 py-2 bg-[#232323] border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#E85D04]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Observações
                    </label>
                    <textarea
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 bg-[#232323] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04]"
                      placeholder="Observações sobre o orçamento..."
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  {/* Produtos */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Adicionar Produtos
                    </label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Buscar produto..."
                        value={searchProduto}
                        onChange={(e) => setSearchProduto(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-[#232323] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04]"
                      />
                    </div>
                    {searchProduto && (
                      <div className="max-h-32 overflow-y-auto space-y-1 mb-2">
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
                              className="w-full p-2 bg-[#232323] border border-zinc-700 rounded-lg text-left hover:border-[#E85D04] transition-colors"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-white text-sm">{produto.nome}</p>
                                  <p className="text-xs text-zinc-400">{produto.codigo}</p>
                                </div>
                                <span className="text-[#E85D04] font-medium">{formatCurrency(produto.precoVenda)}</span>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}

                    {/* Selected products */}
                    {selectedProdutos.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {selectedProdutos.map((sp) => {
                          const produto = produtos.find(p => p.id === sp.produtoId);
                          return (
                            <div key={sp.produtoId} className="flex items-center gap-2 p-2 bg-[#232323] rounded-lg">
                              <Package className="h-4 w-4 text-zinc-400" />
                              <span className="flex-1 text-white text-sm">{produto?.nome}</span>
                              <input
                                type="number"
                                min="1"
                                value={sp.quantidade}
                                onChange={(e) => {
                                  const newQtd = parseInt(e.target.value) || 1;
                                  setSelectedProdutos(selectedProdutos.map(p =>
                                    p.produtoId === sp.produtoId ? { ...p, quantidade: newQtd } : p
                                  ));
                                }}
                                className="w-16 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-white text-center text-sm"
                              />
                              <span className="text-zinc-400 text-sm">{formatCurrency(sp.precoUnitario * sp.quantidade)}</span>
                              <button
                                onClick={() => removeProduto(sp.produtoId)}
                                className="p-1 text-red-400 hover:bg-red-400/10 rounded"
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
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Serviços / Mão de Obra
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Descrição do serviço..."
                        value={novoServicoExtra.descricao}
                        onChange={(e) => setNovoServicoExtra({ ...novoServicoExtra, descricao: e.target.value })}
                        className="flex-1 px-3 py-2 bg-[#232323] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04] text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Valor"
                        value={novoServicoExtra.valor}
                        onChange={(e) => setNovoServicoExtra({ ...novoServicoExtra, valor: e.target.value })}
                        className="w-24 px-3 py-2 bg-[#232323] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04] text-sm"
                      />
                      <button
                        onClick={addServicoExtra}
                        className="px-3 py-2 bg-[#E85D04] hover:bg-[#E85D04]/90 text-white rounded-lg transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    {servicosExtras.length > 0 && (
                      <div className="space-y-2">
                        {servicosExtras.map((servico, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-[#232323] rounded-lg">
                            <DollarSign className="h-4 w-4 text-zinc-400" />
                            <span className="flex-1 text-white text-sm">{servico.descricao}</span>
                            <span className="text-zinc-400 text-sm">{formatCurrency(servico.valor)}</span>
                            <button
                              onClick={() => removeServicoExtra(index)}
                              className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="p-4 bg-[#E85D04]/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-white">Total do Orçamento:</span>
                      <span className="text-2xl font-bold text-[#E85D04]">{formatCurrency(calcularTotal())}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-between">
              {step === 1 ? (
                <>
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedVeiculoId) {
                        toast.warning('Selecione um veículo');
                        return;
                      }
                      setStep(2);
                    }}
                    className="px-6 py-2 bg-[#E85D04] hover:bg-[#E85D04]/90 text-white font-medium rounded-lg transition-colors"
                  >
                    Próximo
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-[#E85D04] hover:bg-[#E85D04]/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingOrcamento ? 'Salvar Alterações' : 'Criar Orçamento'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedOrcamento && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white">
                Orçamento {selectedOrcamento.numero}
              </h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedOrcamento(null);
                }}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Status:</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[selectedOrcamento.status].bg} ${statusConfig[selectedOrcamento.status].color}`}>
                  {statusConfig[selectedOrcamento.status].label}
                </span>
              </div>

              {/* Vehicle */}
              <div className="p-3 bg-[#232323] rounded-lg">
                <div className="flex items-center gap-3">
                  <Car className="h-5 w-5 text-zinc-400" />
                  <div>
                    <p className="text-white font-medium">{formatPlate(selectedOrcamento.veiculo.placa)}</p>
                    <p className="text-sm text-zinc-400">{selectedOrcamento.veiculo.marca} {selectedOrcamento.veiculo.modelo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-zinc-700">
                  <User className="h-5 w-5 text-zinc-400" />
                  <div>
                    <p className="text-white">{selectedOrcamento.veiculo.cliente.nome}</p>
                    <p className="text-sm text-zinc-400">{selectedOrcamento.veiculo.cliente.telefone}</p>
                  </div>
                </div>
              </div>

              {/* Products */}
              {selectedOrcamento.itensProduto.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-400 mb-2">Produtos</h4>
                  <div className="space-y-2">
                    {selectedOrcamento.itensProduto.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-2 bg-[#232323] rounded">
                        <div>
                          <p className="text-white text-sm">{item.produtoNome}</p>
                          <p className="text-xs text-zinc-400">{item.quantidade}x {formatCurrency(item.precoUnitario)}</p>
                        </div>
                        <span className="text-white font-medium">{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Services */}
              {selectedOrcamento.servicosExtras.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-400 mb-2">Serviços</h4>
                  <div className="space-y-2">
                    {selectedOrcamento.servicosExtras.map((servico) => (
                      <div key={servico.id} className="flex justify-between items-center p-2 bg-[#232323] rounded">
                        <span className="text-white text-sm">{servico.descricao}</span>
                        <span className="text-white font-medium">{formatCurrency(servico.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Validade */}
              <div className="flex items-center justify-between p-3 bg-[#232323] rounded-lg">
                <span className="text-zinc-400">Validade:</span>
                <span className={`font-medium ${isExpired(selectedOrcamento.validade) && selectedOrcamento.status === 'PENDENTE' ? 'text-red-400' : 'text-white'}`}>
                  {formatDate(selectedOrcamento.validade)}
                </span>
              </div>

              {/* Total */}
              <div className="p-4 bg-[#E85D04]/10 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-white">Total:</span>
                  <span className="text-2xl font-bold text-[#E85D04]">{formatCurrency(selectedOrcamento.total)}</span>
                </div>
              </div>

              {/* Status buttons */}
              {selectedOrcamento.status === 'PENDENTE' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      handleStatusChange(selectedOrcamento, 'APROVADO');
                      setShowDetailModal(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Aprovar
                  </button>
                  <button
                    onClick={() => {
                      handleStatusChange(selectedOrcamento, 'RECUSADO');
                      setShowDetailModal(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                    Recusar
                  </button>
                </div>
              )}

              {(selectedOrcamento.status === 'PENDENTE' || selectedOrcamento.status === 'APROVADO') && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openConverterModal(selectedOrcamento);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#E85D04] hover:bg-[#E85D04]/90 text-white font-medium rounded-lg transition-colors"
                >
                  <ArrowRight className="h-4 w-4" />
                  Converter em O.S.
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Converter Modal */}
      {showConverterModal && selectedOrcamento && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white">
                Converter em O.S.
              </h2>
              <button
                onClick={() => {
                  setShowConverterModal(false);
                  setSelectedOrcamento(null);
                }}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="p-3 bg-[#232323] rounded-lg">
                <p className="text-white font-medium">{selectedOrcamento.numero}</p>
                <p className="text-sm text-zinc-400">
                  {formatPlate(selectedOrcamento.veiculo.placa)} - {selectedOrcamento.veiculo.cliente.nome}
                </p>
                <p className="text-[#E85D04] font-medium mt-1">{formatCurrency(selectedOrcamento.total)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Data/Hora Agendada (opcional)
                </label>
                <input
                  type="datetime-local"
                  value={dataAgendadaConversao}
                  onChange={(e) => setDataAgendadaConversao(e.target.value)}
                  className="w-full px-4 py-2 bg-[#232323] border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#E85D04]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  KM de Entrada (opcional)
                </label>
                <input
                  type="number"
                  value={kmEntradaConversao}
                  onChange={(e) => setKmEntradaConversao(e.target.value)}
                  placeholder="Ex: 50000"
                  className="w-full px-4 py-2 bg-[#232323] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04]"
                />
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConverterModal(false);
                  setSelectedOrcamento(null);
                }}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConverter}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-[#E85D04] hover:bg-[#E85D04]/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Converter em O.S.
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedOrcamento && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Excluir Orçamento</h3>
                <p className="text-sm text-zinc-400">{selectedOrcamento.numero}</p>
              </div>
            </div>
            <p className="text-zinc-300 mb-6">
              Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedOrcamento(null);
                }}
                className="flex-1 px-4 py-2 border border-zinc-700 text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Excluir
              </button>
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
        <Loader2 className="h-8 w-8 animate-spin text-[#E85D04]" />
      </div>
    }>
      <OrcamentosPageContent />
    </Suspense>
  );
}
