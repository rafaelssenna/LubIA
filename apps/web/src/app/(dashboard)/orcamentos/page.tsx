'use client';

import Header from '@/components/Header';
import {
  Plus, Search, X, FileText, User, Phone,
  CheckCircle, XCircle, Clock, Eye, Edit,
  Trash2, Loader2, Package, DollarSign, FileDown,
  AlertCircle, Send
} from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
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
}

const statusConfig: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  PENDENTE: { label: 'Pendente', color: 'text-amber-400', icon: Clock, bg: 'bg-amber-500/10' },
  APROVADO: { label: 'Aprovado', color: 'text-[#43A047]', icon: CheckCircle, bg: 'bg-green-500/10' },
  RECUSADO: { label: 'Recusado', color: 'text-red-500', icon: XCircle, bg: 'bg-red-500/10' },
  EXPIRADO: { label: 'Expirado', color: 'text-gray-400', icon: AlertCircle, bg: 'bg-gray-500/10' },
  CONVERTIDO: { label: 'Convertido', color: 'text-blue-400', icon: CheckCircle, bg: 'bg-blue-500/10' },
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
      // Gerar PDF e converter para base64
      const doc = generateOrcamentoPDF(orcamento as any, empresaConfig || undefined);
      const pdfBase64 = doc.output('datauristring').split(',')[1]; // Remove o prefixo "data:application/pdf;base64,"

      // Montar caption do PDF com todos os detalhes
      const caption = `*Orçamento ${orcamento.numero}*\n\n` +
        (orcamento.nomeCliente ? `*Cliente:* ${orcamento.nomeCliente}\n\n` : '') +
        (orcamento.itensProduto.length > 0 ? `*Produtos:*\n` +
          orcamento.itensProduto.map(i => `  • ${i.produtoNome} (${i.quantidade}x) - ${formatCurrency(i.subtotal)}`).join('\n') + '\n\n' : '') +
        (orcamento.servicosExtras.length > 0 ? `*Serviços:*\n` +
          orcamento.servicosExtras.map(s => `  • ${s.descricao} - ${formatCurrency(s.valor)}`).join('\n') + '\n\n' : '') +
        `*Total: ${formatCurrency(orcamento.total)}*\n\n` +
        `_Orçamento válido mediante aprovação._`;

      // Enviar PDF via API
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
              <CheckCircle className="h-5 w-5 text-blue-400" />
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
            placeholder="Buscar por número, cliente ou telefone..."
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
                  <th className="text-left px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Número</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Cliente</th>
                  <th className="text-center px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Total</th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {orcamentos.map((orcamento) => {
                  const statusInfo = statusConfig[orcamento.status] || statusConfig.PENDENTE;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr key={orcamento.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-white text-base">ORC-{orcamento.numero}</span>
                        <p className="text-sm text-zinc-500 mt-0.5">{formatDate(orcamento.createdAt)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-700 rounded-lg">
                            <User className="h-5 w-5 text-zinc-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-base">{orcamento.nomeCliente || 'Não informado'}</p>
                            <p className="text-sm text-zinc-400">{formatPhone(orcamento.telefoneCliente)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                          <StatusIcon className="h-4 w-4" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-white font-semibold text-lg">{formatCurrency(orcamento.total)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedOrcamento(orcamento);
                              setShowDetailModal(true);
                            }}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          {orcamento.telefoneCliente && (
                            <button
                              onClick={() => sendWhatsApp(orcamento)}
                              disabled={sendingWhatsApp === orcamento.id}
                              className="p-2 text-zinc-400 hover:text-green-400 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
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
                            className="p-2 text-zinc-400 hover:text-[#E85D04] hover:bg-zinc-700 rounded-lg transition-colors"
                            title="Baixar PDF"
                          >
                            <FileDown className="h-5 w-5" />
                          </button>
                          {orcamento.status !== 'CONVERTIDO' && (
                            <>
                              <button
                                onClick={() => openEditModal(orcamento)}
                                className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-zinc-700 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedOrcamento(orcamento);
                                  setShowDeleteConfirm(true);
                                }}
                                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="h-5 w-5" />
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

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Cliente */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Nome do Cliente
                  </label>
                  <input
                    type="text"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    placeholder="Nome (opcional)"
                    className="w-full px-4 py-2 bg-[#232323] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    <Phone className="inline h-4 w-4 mr-1" />
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    value={telefoneCliente}
                    onChange={(e) => setTelefoneCliente(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-4 py-2 bg-[#232323] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04]"
                  />
                </div>
              </div>

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

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Observações
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 bg-[#232323] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04]"
                  placeholder="Observações (opcional)..."
                />
              </div>

              {/* Total */}
              <div className="p-4 bg-[#E85D04]/10 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-white">Total do Orçamento:</span>
                  <span className="text-2xl font-bold text-[#E85D04]">{formatCurrency(calcularTotal())}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-between">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-[#E85D04] hover:bg-[#E85D04]/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingOrcamento ? 'Salvar Alterações' : 'Criar Orçamento'}
              </button>
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

              {/* Cliente */}
              <div className="p-3 bg-[#232323] rounded-lg">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-zinc-400" />
                  <div>
                    <p className="text-white font-medium">{selectedOrcamento.nomeCliente || 'Cliente não informado'}</p>
                    <p className="text-sm text-zinc-400">{formatPhone(selectedOrcamento.telefoneCliente)}</p>
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
                    {selectedOrcamento.servicosExtras.map((servico, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-[#232323] rounded">
                        <span className="text-white text-sm">{servico.descricao}</span>
                        <span className="text-white font-medium">{formatCurrency(servico.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="p-4 bg-[#E85D04]/10 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-white">Total:</span>
                  <span className="text-2xl font-bold text-[#E85D04]">{formatCurrency(selectedOrcamento.total)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => downloadOrcamentoPDF(selectedOrcamento as any, empresaConfig || undefined)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#E85D04] hover:bg-[#E85D04]/90 text-white font-medium rounded-lg transition-colors"
                >
                  <FileDown className="h-4 w-4" />
                  Baixar PDF
                </button>
                {selectedOrcamento.telefoneCliente && (
                  <button
                    onClick={() => sendWhatsApp(selectedOrcamento)}
                    disabled={sendingWhatsApp === selectedOrcamento.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {sendingWhatsApp === selectedOrcamento.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {sendingWhatsApp === selectedOrcamento.id ? 'Enviando...' : 'Enviar WhatsApp'}
                  </button>
                )}
              </div>
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
