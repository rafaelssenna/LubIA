'use client';

import Header from '@/components/Header';
import {
  Plus,
  Search,
  ShoppingCart,
  DollarSign,
  Package,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Clock,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';

interface Produto {
  id: number;
  codigo: string;
  nome: string;
  marca: string;
  quantidade: number;
  precoVenda: number;
  unidade: string;
}

interface ItemVenda {
  produtoId: number;
  produtoNome: string;
  produtoCodigo: string;
  unidade: string;
  quantidade: number;
  precoUnitario: number;
  desconto: number;
  subtotal: number;
}

// Unidades que permitem decimais (granel)
const UNIDADES_GRANEL = ['LITRO', 'KG', 'METRO'];

interface VendaRapida {
  id: number;
  numero: string;
  nomeCliente: string | null;
  observacoes: string | null;
  total: number;
  createdAt: string;
  itens: ItemVenda[];
}

interface Stats {
  total: number;
  hoje: number;
  faturamentoHoje: number;
}

export default function VendasRapidasPage() {
  const { showToast } = useToast();
  const [vendas, setVendas] = useState<VendaRapida[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, hoje: 0, faturamentoHoje: 0 });
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal Nova Venda
  const [showNovaVenda, setShowNovaVenda] = useState(false);
  const [nomeCliente, setNomeCliente] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  const [saving, setSaving] = useState(false);

  // Busca de produtos
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [loadingProdutos, setLoadingProdutos] = useState(false);

  // Modal Detalhes
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaRapida | null>(null);

  // Carregar vendas
  const fetchVendas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (busca) params.append('busca', busca);

      const res = await fetch(`/api/vendas-rapidas?${params}`);
      const data = await res.json();

      if (data.data) {
        setVendas(data.data);
        setStats(data.stats);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendas();
  }, [page, busca]);

  // Buscar produtos para adicionar
  const buscarProdutos = async (termo: string) => {
    if (!termo || termo.length < 2) {
      setProdutos([]);
      return;
    }

    setLoadingProdutos(true);
    try {
      const res = await fetch(`/api/produtos?busca=${encodeURIComponent(termo)}&ativo=true`);
      const data = await res.json();
      if (data.data) {
        setProdutos(data.data.filter((p: Produto) => p.quantidade > 0));
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoadingProdutos(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      buscarProdutos(buscaProduto);
    }, 300);
    return () => clearTimeout(timer);
  }, [buscaProduto]);

  // Adicionar produto à venda
  const adicionarProduto = (produto: Produto) => {
    const isGranel = UNIDADES_GRANEL.includes(produto.unidade);
    const incremento = isGranel ? 1 : 1; // Sempre começa com 1

    const existente = itensVenda.find(i => i.produtoId === produto.id);
    if (existente) {
      const novaQtd = existente.quantidade + incremento;
      setItensVenda(itensVenda.map(i =>
        i.produtoId === produto.id
          ? { ...i, quantidade: novaQtd, subtotal: novaQtd * i.precoUnitario - i.desconto }
          : i
      ));
    } else {
      setItensVenda([...itensVenda, {
        produtoId: produto.id,
        produtoNome: produto.nome,
        produtoCodigo: produto.codigo,
        unidade: produto.unidade,
        quantidade: 1,
        precoUnitario: produto.precoVenda,
        desconto: 0,
        subtotal: produto.precoVenda,
      }]);
    }
    setBuscaProduto('');
    setProdutos([]);
  };

  // Atualizar quantidade de item
  const atualizarQuantidade = (produtoId: number, quantidade: number) => {
    if (quantidade <= 0) {
      removerItem(produtoId);
      return;
    }
    setItensVenda(itensVenda.map(i =>
      i.produtoId === produtoId
        ? { ...i, quantidade, subtotal: quantidade * i.precoUnitario - i.desconto }
        : i
    ));
  };

  // Remover item
  const removerItem = (produtoId: number) => {
    setItensVenda(itensVenda.filter(i => i.produtoId !== produtoId));
  };

  // Calcular total
  const totalVenda = itensVenda.reduce((acc, item) => acc + item.subtotal, 0);

  // Finalizar venda
  const finalizarVenda = async () => {
    if (itensVenda.length === 0) {
      showToast('Adicione pelo menos um produto', 'error');
      return;
    }

    if (!formaPagamento) {
      showToast('Selecione a forma de pagamento', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/vendas-rapidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeCliente: nomeCliente || null,
          observacoes: observacoes || null,
          formaPagamento,
          itens: itensVenda.map(i => ({
            produtoId: i.produtoId,
            quantidade: i.quantidade,
            precoUnitario: i.precoUnitario,
            desconto: i.desconto,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Venda ${data.data.numero} realizada com sucesso!`, 'success');
        setShowNovaVenda(false);
        resetForm();
        fetchVendas();
      } else {
        showToast(data.error || 'Erro ao finalizar venda', 'error');
      }
    } catch (error) {
      showToast('Erro ao finalizar venda', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setNomeCliente('');
    setObservacoes('');
    setFormaPagamento('');
    setItensVenda([]);
    setBuscaProduto('');
    setProdutos([]);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Header title="Vendas Rápidas" subtitle="Venda de balcão sem cadastro de cliente" />

      <div className="p-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1E1E1E] rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Receipt size={24} className="text-blue-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Total de Vendas</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1E1E1E] rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <Clock size={24} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Vendas Hoje</p>
                <p className="text-2xl font-bold text-white">{stats.hoje}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1E1E1E] rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <DollarSign size={24} className="text-amber-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Faturamento Hoje</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(stats.faturamentoHoje)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Buscar por número ou cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#1E1E1E] rounded-xl border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-[#43A047]/50"
            />
          </div>
          <button
            onClick={() => setShowNovaVenda(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#43A047] text-white rounded-xl hover:bg-[#388E3C] transition-colors"
          >
            <Plus size={20} />
            Nova Venda
          </button>
        </div>

        {/* Lista de Vendas */}
        <div className="bg-[#1E1E1E] rounded-2xl border border-white/10 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-white/60">Carregando...</div>
          ) : vendas.length === 0 ? (
            <div className="p-8 text-center text-white/60">
              <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
              <p>Nenhuma venda encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-white/60 font-medium">Número</th>
                    <th className="text-left p-4 text-white/60 font-medium">Cliente</th>
                    <th className="text-left p-4 text-white/60 font-medium">Itens</th>
                    <th className="text-left p-4 text-white/60 font-medium">Total</th>
                    <th className="text-left p-4 text-white/60 font-medium">Data</th>
                    <th className="text-right p-4 text-white/60 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.map((venda) => (
                    <tr key={venda.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <span className="text-[#43A047] font-mono font-medium">{venda.numero}</span>
                      </td>
                      <td className="p-4 text-white">
                        {venda.nomeCliente || <span className="text-white/40">Balcão</span>}
                      </td>
                      <td className="p-4">
                        <span className="text-white/80">{venda.itens.length} produto(s)</span>
                      </td>
                      <td className="p-4">
                        <span className="text-emerald-400 font-medium">{formatCurrency(venda.total)}</span>
                      </td>
                      <td className="p-4 text-white/60">{formatDate(venda.createdAt)}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            setVendaSelecionada(venda);
                            setShowDetalhes(true);
                          }}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg transition-colors"
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-white/10">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={20} className="text-white/60" />
              </button>
              <span className="text-white/60 px-4">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={20} className="text-white/60" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nova Venda */}
      {showNovaVenda && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Nova Venda Rápida</h2>
              <button
                onClick={() => {
                  setShowNovaVenda(false);
                  resetForm();
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} className="text-white/60" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Cliente (opcional) */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Nome do Cliente (opcional)</label>
                <input
                  type="text"
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  placeholder="Ex: João"
                  className="w-full px-4 py-3 bg-[#121212] rounded-xl border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-[#43A047]/50"
                />
              </div>

              {/* Busca de Produtos */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Adicionar Produto</label>
                <div className="relative">
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={buscaProduto}
                    onChange={(e) => setBuscaProduto(e.target.value)}
                    placeholder="Buscar por código ou nome..."
                    className="w-full pl-12 pr-4 py-3 bg-[#121212] rounded-xl border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-[#43A047]/50"
                  />
                  {/* Dropdown de resultados */}
                  {produtos.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#252525] rounded-xl border border-white/10 max-h-60 overflow-y-auto z-10">
                      {produtos.map((produto) => {
                        const isGranel = UNIDADES_GRANEL.includes(produto.unidade);
                        const unidadeLabel = produto.unidade === 'LITRO' ? 'L' : produto.unidade === 'KG' ? 'kg' : produto.unidade === 'METRO' ? 'm' : 'un';

                        return (
                          <button
                            key={produto.id}
                            onClick={() => adicionarProduto(produto)}
                            className="w-full flex items-center justify-between p-3 hover:bg-white/10 transition-colors text-left"
                          >
                            <div>
                              <p className="text-white font-medium">
                                {produto.nome}
                                {isGranel && (
                                  <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                                    Granel
                                  </span>
                                )}
                              </p>
                              <p className="text-white/60 text-sm">{produto.codigo} • {produto.marca}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-emerald-400 font-medium">{formatCurrency(produto.precoVenda)}/{unidadeLabel}</p>
                              <p className="text-white/40 text-sm">Estoque: {produto.quantidade} {unidadeLabel}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {loadingProdutos && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#252525] rounded-xl border border-white/10 p-4 text-center text-white/60">
                      Buscando...
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de Itens */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Itens da Venda</label>
                {itensVenda.length === 0 ? (
                  <div className="bg-[#121212] rounded-xl border border-white/10 p-8 text-center text-white/40">
                    <Package size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Nenhum produto adicionado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {itensVenda.map((item) => {
                      const isGranel = UNIDADES_GRANEL.includes(item.unidade);
                      const step = isGranel ? 0.5 : 1;
                      const unidadeLabel = item.unidade === 'LITRO' ? 'L' : item.unidade === 'KG' ? 'kg' : item.unidade === 'METRO' ? 'm' : 'un';

                      return (
                        <div
                          key={item.produtoId}
                          className="flex items-center gap-4 bg-[#121212] rounded-xl border border-white/10 p-4"
                        >
                          <div className="flex-1">
                            <p className="text-white font-medium">{item.produtoNome}</p>
                            <p className="text-white/60 text-sm">
                              {item.produtoCodigo}
                              {isGranel && <span className="ml-2 text-amber-400">(Granel)</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => atualizarQuantidade(item.produtoId, item.quantidade - step)}
                              className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={item.quantidade}
                              onChange={(e) => {
                                let val = parseFloat(e.target.value) || 0;
                                if (!isGranel) val = Math.round(val); // Força inteiro para unidades
                                atualizarQuantidade(item.produtoId, val);
                              }}
                              step={step}
                              min={step}
                              className="w-16 text-center bg-[#1E1E1E] border border-white/10 rounded-lg py-1 text-white focus:outline-none focus:border-[#43A047]/50"
                            />
                            <button
                              onClick={() => atualizarQuantidade(item.produtoId, item.quantidade + step)}
                              className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors"
                            >
                              +
                            </button>
                          </div>
                          <div className="text-right min-w-[100px]">
                            <p className="text-emerald-400 font-medium">{formatCurrency(item.subtotal)}</p>
                            <p className="text-white/40 text-sm">{formatCurrency(item.precoUnitario)}/{unidadeLabel}</p>
                          </div>
                          <button
                            onClick={() => removerItem(item.produtoId)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} className="text-red-400" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Observações (opcional)</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Troco para R$100"
                  rows={2}
                  className="w-full px-4 py-3 bg-[#121212] rounded-xl border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-[#43A047]/50 resize-none"
                />
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Forma de Pagamento *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'PIX', label: 'PIX', icon: '📱' },
                    { value: 'DINHEIRO', label: 'Dinheiro', icon: '💵' },
                    { value: 'CREDITO', label: 'Crédito', icon: '💳' },
                    { value: 'DEBITO', label: 'Débito', icon: '💳' },
                  ].map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setFormaPagamento(method.value)}
                      className={`p-3 rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 ${
                        formaPagamento === method.value
                          ? 'bg-[#43A047]/20 border-[#43A047] text-[#43A047]'
                          : 'bg-[#121212] border-white/10 text-white/60 hover:border-white/20'
                      }`}
                    >
                      <span>{method.icon}</span>
                      <span className="font-medium">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-[#121212]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Total da Venda</p>
                  <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalVenda)}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowNovaVenda(false);
                      resetForm();
                    }}
                    className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={finalizarVenda}
                    disabled={saving || itensVenda.length === 0 || !formaPagamento}
                    className="px-6 py-3 bg-[#43A047] text-white rounded-xl hover:bg-[#388E3C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Finalizando...
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={20} />
                        {!formaPagamento ? 'Selecione o pagamento' : 'Finalizar Venda'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {showDetalhes && vendaSelecionada && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-xl font-semibold text-white">Venda {vendaSelecionada.numero}</h2>
                <p className="text-white/60 text-sm">{formatDate(vendaSelecionada.createdAt)}</p>
              </div>
              <button
                onClick={() => {
                  setShowDetalhes(false);
                  setVendaSelecionada(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} className="text-white/60" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {vendaSelecionada.nomeCliente && (
                <div>
                  <p className="text-white/60 text-sm">Cliente</p>
                  <p className="text-white">{vendaSelecionada.nomeCliente}</p>
                </div>
              )}

              <div>
                <p className="text-white/60 text-sm mb-2">Itens</p>
                <div className="space-y-2">
                  {vendaSelecionada.itens.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-[#121212] rounded-xl p-3">
                      <div>
                        <p className="text-white font-medium">{item.produtoNome}</p>
                        <p className="text-white/60 text-sm">{item.quantidade}x {formatCurrency(item.precoUnitario)}</p>
                      </div>
                      <p className="text-emerald-400 font-medium">{formatCurrency(item.subtotal)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {vendaSelecionada.observacoes && (
                <div>
                  <p className="text-white/60 text-sm">Observações</p>
                  <p className="text-white">{vendaSelecionada.observacoes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-[#121212]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Total</p>
                  <p className="text-2xl font-bold text-emerald-400">{formatCurrency(vendaSelecionada.total)}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetalhes(false);
                    setVendaSelecionada(null);
                  }}
                  className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
