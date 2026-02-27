'use client';

import Header from '@/components/Header';
import {
  Search,
  RotateCcw,
  RefreshCw,
  DollarSign,
  Package,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Minus,
  Plus,
  Loader2,
} from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface Produto {
  id: number;
  codigo: string;
  nome: string;
  marca?: string;
  unidade?: string;
  precoVenda?: number;
  quantidade?: number;
}

interface ItemVenda {
  id: number;
  produtoId: number;
  produto: Produto;
  quantidade: number;
  quantidadeDevolvida: number;
  quantidadeDisponivel: number;
  valorUnitario: number;
  subtotal: number;
}

interface Cliente {
  nome: string;
}

interface VendaRapida {
  id: number;
  numero: string;
  nomeCliente: string | null;
  formaPagamento: string;
  observacoes: string | null;
  desconto: number;
  total: number;
  createdAt: string;
  itens: ItemVenda[];
  devolucoes: Devolucao[];
}

interface ItemDevolucao {
  id: number;
  produtoId: number;
  produto: Produto;
  quantidadeDevolvida: number;
  valorUnitario: number;
  subtotal: number;
  produtoTrocaId: number | null;
  produtoTroca: Produto | null;
  quantidadeTroca: number | null;
}

interface Devolucao {
  id: number;
  numero: string;
  tipo: 'TROCA' | 'REEMBOLSO';
  motivo: 'DEFEITO' | 'ARREPENDIMENTO' | 'OUTRO';
  motivoOutro: string | null;
  observacoes: string | null;
  valorTotal: number;
  createdAt: string;
  venda?: {
    id: number;
    numero: string;
    cliente: Cliente | null;
  };
  itens: ItemDevolucao[];
}

interface ProdutoTroca {
  produtoId: number;
  produtoNome: string;
  quantidade: number;
  preco: number;
}

interface ItemParaDevolver {
  itemVendaId: number;
  produtoId: number;
  produtoNome: string;
  quantidade: number; // Quantidade a devolver
  maxQuantidade: number;
  valorUnitario: number;
  // Para TROCA - múltiplos produtos
  produtosTroca: ProdutoTroca[];
}

interface VendaResumo {
  id: number;
  numero: string;
  nomeCliente: string | null;
  total: number;
  createdAt: string;
}

function DevolucoesPageContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  // States for searching venda
  const [buscaVenda, setBuscaVenda] = useState('');
  const [searchingVenda, setSearchingVenda] = useState(false);
  const [venda, setVenda] = useState<VendaRapida | null>(null);
  const [vendaError, setVendaError] = useState<string | null>(null);
  const [urlParamHandled, setUrlParamHandled] = useState(false);

  // States for devolução form
  const [step, setStep] = useState<'buscar' | 'itens' | 'confirmar'>('buscar');
  const [tipoDevolucao, setTipoDevolucao] = useState<'TROCA' | 'REEMBOLSO'>('REEMBOLSO');
  const [motivo, setMotivo] = useState<'DEFEITO' | 'ARREPENDIMENTO' | 'OUTRO'>('DEFEITO');
  const [motivoOutro, setMotivoOutro] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [itensParaDevolver, setItensParaDevolver] = useState<ItemParaDevolver[]>([]);
  const [saving, setSaving] = useState(false);

  // States for product search (for TROCA)
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [selectedItemForTroca, setSelectedItemForTroca] = useState<number | null>(null);

  // States for listing devoluções
  const [devolucoes, setDevolucoes] = useState<Devolucao[]>([]);
  const [loadingDevolucoes, setLoadingDevolucoes] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtroTipo, setFiltroTipo] = useState<'' | 'TROCA' | 'REEMBOLSO'>('');

  // Modal for viewing devolução details
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [devolucaoSelecionada, setDevolucaoSelecionada] = useState<Devolucao | null>(null);

  // States for recent vendas
  const [ultimasVendas, setUltimasVendas] = useState<VendaResumo[]>([]);
  const [loadingUltimasVendas, setLoadingUltimasVendas] = useState(true);

  // Handle URL parameter from vendas-rapidas page
  useEffect(() => {
    const vendaParam = searchParams.get('venda');
    if (vendaParam && !urlParamHandled) {
      setBuscaVenda(vendaParam);
      setUrlParamHandled(true);
      // Clean URL
      window.history.replaceState({}, '', '/devolucoes');
    }
  }, [searchParams, urlParamHandled]);

  // Fetch devoluções list
  const fetchDevolucoes = async () => {
    setLoadingDevolucoes(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (filtroTipo) params.append('tipo', filtroTipo);

      const res = await fetch(`/api/devolucoes?${params}`);
      const data = await res.json();

      if (data.devolucoes) {
        setDevolucoes(data.devolucoes);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Erro ao carregar devoluções:', error);
    } finally {
      setLoadingDevolucoes(false);
    }
  };

  useEffect(() => {
    fetchDevolucoes();
  }, [page, filtroTipo]);

  // Fetch recent vendas for quick access (only those with items available for return)
  const fetchUltimasVendas = async () => {
    setLoadingUltimasVendas(true);
    try {
      const res = await fetch('/api/vendas-rapidas?limit=5&paraDevolver=true');
      const data = await res.json();
      if (data.data) {
        setUltimasVendas(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar últimas vendas:', error);
    } finally {
      setLoadingUltimasVendas(false);
    }
  };

  useEffect(() => {
    fetchUltimasVendas();
  }, []);

  // Select venda from recent list
  const selecionarVenda = async (vendaId: number) => {
    setSearchingVenda(true);
    setVendaError(null);
    setVenda(null);

    try {
      const res = await fetch(`/api/vendas-rapidas/${vendaId}`);
      const data = await res.json();

      if (res.ok) {
        const itensDisponiveis = data.itens.filter((i: ItemVenda) => i.quantidadeDisponivel > 0);
        if (itensDisponiveis.length === 0) {
          setVendaError('Todos os itens desta venda já foram devolvidos');
          return;
        }
        setVenda(data);
        setStep('itens');
      } else {
        setVendaError(data.error || 'Erro ao buscar venda');
      }
    } catch (error) {
      setVendaError('Erro ao conectar com o servidor');
    } finally {
      setSearchingVenda(false);
    }
  };

  // Search venda by number
  const buscarVenda = async () => {
    if (!buscaVenda.trim()) {
      setVendaError('Digite o número da venda');
      return;
    }

    setSearchingVenda(true);
    setVendaError(null);
    setVenda(null);

    try {
      // First, try to find the venda ID by searching
      const searchRes = await fetch(`/api/vendas-rapidas?busca=${encodeURIComponent(buscaVenda.trim())}&limit=1`);
      const searchData = await searchRes.json();

      if (!searchData.data || searchData.data.length === 0) {
        setVendaError('Venda não encontrada');
        return;
      }

      const vendaId = searchData.data[0].id;

      // Now fetch the full details
      const res = await fetch(`/api/vendas-rapidas/${vendaId}`);
      const data = await res.json();

      if (res.ok) {
        // Check if there are items available to return
        const itensDisponiveis = data.itens.filter((i: ItemVenda) => i.quantidadeDisponivel > 0);
        if (itensDisponiveis.length === 0) {
          setVendaError('Todos os itens desta venda já foram devolvidos');
          return;
        }
        setVenda(data);
        setStep('itens');
      } else {
        setVendaError(data.error || 'Erro ao buscar venda');
      }
    } catch (error) {
      setVendaError('Erro ao conectar com o servidor');
    } finally {
      setSearchingVenda(false);
    }
  };

  // Toggle item selection for devolução
  const toggleItemSelection = (item: ItemVenda) => {
    const existing = itensParaDevolver.find((i) => i.itemVendaId === item.id);
    if (existing) {
      setItensParaDevolver(itensParaDevolver.filter((i) => i.itemVendaId !== item.id));
    } else {
      setItensParaDevolver([
        ...itensParaDevolver,
        {
          itemVendaId: item.id,
          produtoId: item.produtoId,
          produtoNome: item.produto.nome,
          quantidade: item.quantidadeDisponivel,
          maxQuantidade: item.quantidadeDisponivel,
          valorUnitario: item.valorUnitario,
          produtosTroca: [],
        },
      ]);
    }
  };

  // Update quantity for item to return
  const updateItemQuantidade = (itemVendaId: number, delta: number) => {
    setItensParaDevolver(
      itensParaDevolver.map((item) => {
        if (item.itemVendaId === itemVendaId) {
          const newQtd = Math.max(1, Math.min(item.maxQuantidade, item.quantidade + delta));
          return { ...item, quantidade: newQtd };
        }
        return item;
      })
    );
  };

  // Search products for TROCA
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
        setProdutos(data.data.filter((p: any) => p.quantidade > 0));
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

  // Select product for TROCA - adiciona ao array
  const selecionarProdutoTroca = (produto: any) => {
    if (selectedItemForTroca === null) return;

    setItensParaDevolver(
      itensParaDevolver.map((item) => {
        if (item.itemVendaId === selectedItemForTroca) {
          // Verifica se o produto já foi adicionado
          const jaExiste = item.produtosTroca.some(p => p.produtoId === produto.id);
          if (jaExiste) return item;

          return {
            ...item,
            produtosTroca: [
              ...item.produtosTroca,
              {
                produtoId: produto.id,
                produtoNome: produto.nome,
                quantidade: 1,
                preco: produto.precoVenda || 0,
              },
            ],
          };
        }
        return item;
      })
    );
    setBuscaProduto('');
    setProdutos([]);
  };

  // Remove product from TROCA array
  const removerProdutoTroca = (itemVendaId: number, produtoId: number) => {
    setItensParaDevolver(
      itensParaDevolver.map((item) => {
        if (item.itemVendaId === itemVendaId) {
          return {
            ...item,
            produtosTroca: item.produtosTroca.filter(p => p.produtoId !== produtoId),
          };
        }
        return item;
      })
    );
  };

  // Update quantity for exchange product
  const updateQuantidadeTroca = (itemVendaId: number, produtoId: number, delta: number) => {
    setItensParaDevolver(
      itensParaDevolver.map((item) => {
        if (item.itemVendaId === itemVendaId) {
          return {
            ...item,
            produtosTroca: item.produtosTroca.map(p => {
              if (p.produtoId === produtoId) {
                return { ...p, quantidade: Math.max(1, p.quantidade + delta) };
              }
              return p;
            }),
          };
        }
        return item;
      })
    );
  };

  // Calculate total to return/refund
  const totalDevolucao = itensParaDevolver.reduce(
    (acc, item) => acc + item.quantidade * item.valorUnitario,
    0
  );

  // Calculate total of exchange products (for TROCA) - soma todos os produtos de troca
  const totalTroca = itensParaDevolver.reduce(
    (acc, item) => acc + item.produtosTroca.reduce(
      (sum, p) => sum + p.quantidade * p.preco,
      0
    ),
    0
  );

  // Difference: positive = customer pays, negative = customer receives
  const diferencaTroca = totalTroca - totalDevolucao;

  // Submit devolução
  const confirmarDevolucao = async () => {
    if (!venda || itensParaDevolver.length === 0) return;

    // Validate TROCA has at least one product selected for each item
    if (tipoDevolucao === 'TROCA') {
      const semTroca = itensParaDevolver.find((i) => i.produtosTroca.length === 0);
      if (semTroca) {
        showToast('Selecione ao menos um produto de troca para cada item', 'error');
        return;
      }
    }

    if (motivo === 'OUTRO' && !motivoOutro.trim()) {
      showToast('Descreva o motivo da devolução', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/vendas-rapidas/${venda.id}/devolucao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: tipoDevolucao,
          motivo,
          motivoOutro: motivo === 'OUTRO' ? motivoOutro : null,
          observacoes: observacoes || null,
          itens: itensParaDevolver.map((item) => ({
            itemVendaId: item.itemVendaId,
            produtoId: item.produtoId,
            quantidadeDevolvida: item.quantidade,
            valorUnitario: item.valorUnitario,
            produtosTroca: tipoDevolucao === 'TROCA' ? item.produtosTroca : [],
          })),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(
          `Devolução ${data.devolucao.numero} registrada com sucesso!`,
          'success'
        );
        resetForm();
        fetchDevolucoes();
      } else {
        showToast(data.error || 'Erro ao registrar devolução', 'error');
      }
    } catch (error) {
      showToast('Erro ao conectar com o servidor', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setBuscaVenda('');
    setVenda(null);
    setVendaError(null);
    setStep('buscar');
    setTipoDevolucao('REEMBOLSO');
    setMotivo('DEFEITO');
    setMotivoOutro('');
    setObservacoes('');
    setItensParaDevolver([]);
    setSelectedItemForTroca(null);
    setBuscaProduto('');
    setProdutos([]);
  };

  const formatCurrency = useFormatCurrency();

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMotivoLabel = (motivo: string) => {
    const labels: Record<string, string> = {
      DEFEITO: 'Defeito',
      ARREPENDIMENTO: 'Arrependimento',
      OUTRO: 'Outro',
    };
    return labels[motivo] || motivo;
  };

  return (
    <>
      <Header title="Devoluções" subtitle="Gerenciar devoluções e trocas de vendas rápidas" />

      <div className="p-8 space-y-6">
        {/* Form de Nova Devolução */}
        <div className="bg-card rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <RotateCcw size={20} className="text-primary" />
              Nova Devolução
            </h2>
          </div>

          <div className="p-6">
            {/* Step 1: Buscar Venda */}
            {step === 'buscar' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-muted mb-2">
                    Número da Venda (ex: VR-0001)
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Search
                        size={20}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted"
                      />
                      <input
                        type="text"
                        value={buscaVenda}
                        onChange={(e) => setBuscaVenda(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && buscarVenda()}
                        placeholder="Digite o número da venda..."
                        className="w-full pl-12 pr-4 py-3 bg-background rounded-xl border border-white/10 text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <button
                      onClick={buscarVenda}
                      disabled={searchingVenda}
                      className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                    >
                      {searchingVenda ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                  {vendaError && (
                    <p className="mt-2 text-red-400 text-sm flex items-center gap-2">
                      <AlertCircle size={16} />
                      {vendaError}
                    </p>
                  )}
                </div>

                {/* Últimas Vendas */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-sm text-muted mb-3">Últimas vendas:</p>
                  {loadingUltimasVendas ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : ultimasVendas.length === 0 ? (
                    <p className="text-muted text-sm text-center py-4">Nenhuma venda encontrada</p>
                  ) : (
                    <div className="space-y-2">
                      {ultimasVendas.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => selecionarVenda(v.id)}
                          disabled={searchingVenda}
                          className="w-full flex items-center justify-between p-3 bg-background rounded-xl border border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all text-left disabled:opacity-50"
                        >
                          <div>
                            <p className="text-primary font-mono font-medium">{v.numero}</p>
                            <p className="text-muted text-sm">
                              {v.nomeCliente || 'Balcão'} • {formatDate(v.createdAt)}
                            </p>
                          </div>
                          <p className="text-emerald-400 font-medium">{formatCurrency(v.total)}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Selecionar Itens */}
            {step === 'itens' && venda && (
              <div className="space-y-6">
                {/* Venda Info */}
                <div className="bg-background rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-primary font-mono font-medium text-lg">
                        {venda.numero}
                      </p>
                      <p className="text-muted text-sm">
                        {formatDate(venda.createdAt)}
                        {venda.nomeCliente && ` • ${venda.nomeCliente}`}
                      </p>
                    </div>
                    <p className="text-emerald-400 font-semibold">
                      {formatCurrency(venda.total)}
                    </p>
                  </div>
                </div>

                {/* Tipo de Devolução */}
                <div>
                  <label className="block text-sm text-muted mb-2">Tipo de Devolução</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setTipoDevolucao('REEMBOLSO')}
                      className={`p-4 rounded-xl border transition-all flex items-center justify-center gap-3 ${
                        tipoDevolucao === 'REEMBOLSO'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-background border-white/10 text-muted hover:border-white/20'
                      }`}
                    >
                      <DollarSign size={20} />
                      <span className="font-medium">Reembolso</span>
                    </button>
                    <button
                      onClick={() => setTipoDevolucao('TROCA')}
                      className={`p-4 rounded-xl border transition-all flex items-center justify-center gap-3 ${
                        tipoDevolucao === 'TROCA'
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'bg-background border-white/10 text-muted hover:border-white/20'
                      }`}
                    >
                      <RefreshCw size={20} />
                      <span className="font-medium">Troca</span>
                    </button>
                  </div>
                </div>

                {/* Motivo */}
                <div>
                  <label className="block text-sm text-muted mb-2">Motivo</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['DEFEITO', 'ARREPENDIMENTO', 'OUTRO'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMotivo(m)}
                        className={`p-3 rounded-xl border transition-all ${
                          motivo === m
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-background border-white/10 text-muted hover:border-white/20'
                        }`}
                      >
                        {getMotivoLabel(m)}
                      </button>
                    ))}
                  </div>
                  {motivo === 'OUTRO' && (
                    <input
                      type="text"
                      value={motivoOutro}
                      onChange={(e) => setMotivoOutro(e.target.value)}
                      placeholder="Descreva o motivo..."
                      className="mt-3 w-full px-4 py-3 bg-background rounded-xl border border-white/10 text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary/50"
                    />
                  )}
                </div>

                {/* Itens para devolver */}
                <div>
                  <label className="block text-sm text-muted mb-2">
                    Selecione os itens para devolver
                  </label>
                  <div className="space-y-2">
                    {venda.itens
                      .filter((item) => item.quantidadeDisponivel > 0)
                      .map((item) => {
                        const selected = itensParaDevolver.find(
                          (i) => i.itemVendaId === item.id
                        );
                        return (
                          <div
                            key={item.id}
                            className={`rounded-xl border p-4 transition-all ${
                              selected
                                ? 'bg-primary/10 border-primary'
                                : 'bg-background border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => toggleItemSelection(item)}
                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                                  selected
                                    ? 'bg-primary border-primary'
                                    : 'border-white/30 hover:border-primary'
                                }`}
                              >
                                {selected && <Check size={14} className="text-white" />}
                              </button>

                              <div className="flex-1">
                                <p className="text-white font-medium">{item.produto.nome}</p>
                                <p className="text-muted text-sm">
                                  {item.produto.codigo}
                                  {item.quantidadeDevolvida > 0 && (
                                    <span className="text-amber-400 ml-2">
                                      ({item.quantidadeDevolvida} já devolvido)
                                    </span>
                                  )}
                                </p>
                              </div>

                              {selected && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => updateItemQuantidade(item.id, -1)}
                                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span className="w-10 text-center text-white font-medium">
                                    {selected.quantidade}
                                  </span>
                                  <button
                                    onClick={() => updateItemQuantidade(item.id, 1)}
                                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              )}

                              <div className="text-right min-w-[80px]">
                                <p className="text-foreground-muted text-sm">
                                  Disp: {item.quantidadeDisponivel}
                                </p>
                                <p className="text-emerald-400 font-medium">
                                  {formatCurrency(item.valorUnitario)}
                                </p>
                              </div>
                            </div>

                            {/* Produtos de troca (múltiplos) */}
                            {tipoDevolucao === 'TROCA' && (
                              <div className="mt-4 pt-4 border-t border-white/10">
                                {!selected ? (
                                  <p className="text-sm text-blue-400/70 italic">
                                    Marque o item acima para selecionar os produtos de troca
                                  </p>
                                ) : (
                                  <div className="space-y-3">
                                    {/* Lista de produtos selecionados para troca */}
                                    {selected.produtosTroca.length > 0 && (
                                      <div className="space-y-2">
                                        <p className="text-sm text-muted">Produtos para troca:</p>
                                        {selected.produtosTroca.map((prodTroca) => (
                                          <div
                                            key={prodTroca.produtoId}
                                            className="bg-blue-500/10 rounded-lg p-3"
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="flex-1 min-w-0">
                                                <p className="text-blue-400 font-medium truncate">
                                                  {prodTroca.produtoNome}
                                                </p>
                                                <p className="text-emerald-400 text-sm">
                                                  {formatCurrency(prodTroca.preco)} /un
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-3">
                                                {/* Quantidade */}
                                                <div className="flex items-center gap-1">
                                                  <button
                                                    onClick={() => updateQuantidadeTroca(item.id, prodTroca.produtoId, -1)}
                                                    className="w-6 h-6 bg-blue-500/20 hover:bg-blue-500/30 rounded flex items-center justify-center text-blue-400 transition-colors"
                                                  >
                                                    <Minus size={12} />
                                                  </button>
                                                  <span className="w-8 text-center text-blue-400 font-medium text-sm">
                                                    {prodTroca.quantidade}
                                                  </span>
                                                  <button
                                                    onClick={() => updateQuantidadeTroca(item.id, prodTroca.produtoId, 1)}
                                                    className="w-6 h-6 bg-blue-500/20 hover:bg-blue-500/30 rounded flex items-center justify-center text-blue-400 transition-colors"
                                                  >
                                                    <Plus size={12} />
                                                  </button>
                                                </div>
                                                {/* Subtotal */}
                                                <span className="text-white font-medium min-w-[80px] text-right">
                                                  {formatCurrency(prodTroca.quantidade * prodTroca.preco)}
                                                </span>
                                                {/* Remover */}
                                                <button
                                                  onClick={() => removerProdutoTroca(item.id, prodTroca.produtoId)}
                                                  className="text-red-400 hover:text-red-300 p-1"
                                                >
                                                  <X size={16} />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Campo de busca para adicionar mais produtos */}
                                    <div className="relative">
                                      <p className="text-sm text-muted mb-2">
                                        {selected.produtosTroca.length === 0
                                          ? 'Selecione o(s) produto(s) para troca:'
                                          : 'Adicionar outro produto:'}
                                      </p>
                                      <div className="relative">
                                        <Search
                                          size={16}
                                          className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
                                        />
                                        <input
                                          type="text"
                                          value={selectedItemForTroca === item.id ? buscaProduto : ''}
                                          onChange={(e) => {
                                            setSelectedItemForTroca(item.id);
                                            setBuscaProduto(e.target.value);
                                          }}
                                          onFocus={() => setSelectedItemForTroca(item.id)}
                                          placeholder="Buscar produto..."
                                          className="w-full pl-10 pr-4 py-2 bg-blue-500/10 rounded-lg border border-blue-500/30 text-foreground text-sm placeholder:text-foreground-muted focus:outline-none focus:border-blue-500/50"
                                        />
                                      </div>
                                      {/* Dropdown produtos */}
                                      {selectedItemForTroca === item.id && produtos.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-background-secondary rounded-lg border border-white/10 max-h-48 overflow-y-auto z-10">
                                          {produtos.map((produto) => {
                                            const jaAdicionado = selected.produtosTroca.some(
                                              (p) => p.produtoId === produto.id
                                            );
                                            return (
                                              <button
                                                key={produto.id}
                                                onClick={() => selecionarProdutoTroca(produto)}
                                                disabled={jaAdicionado}
                                                className={`w-full flex items-center justify-between p-2 transition-colors text-left text-sm gap-2 ${
                                                  jaAdicionado
                                                    ? 'opacity-50 cursor-not-allowed bg-white/5'
                                                    : 'hover:bg-white/10'
                                                }`}
                                              >
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-white truncate">
                                                    {produto.nome}
                                                    {jaAdicionado && (
                                                      <span className="text-blue-400 ml-2">(já adicionado)</span>
                                                    )}
                                                  </p>
                                                  <p className="text-muted text-xs">{produto.codigo}</p>
                                                </div>
                                                <span className="text-emerald-400 font-medium whitespace-nowrap">
                                                  {formatCurrency(produto.precoVenda || 0)}
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}
                                      {selectedItemForTroca === item.id && loadingProdutos && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-background-secondary rounded-lg border border-white/10 p-2 text-center text-muted text-sm">
                                          Buscando...
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-sm text-muted mb-2">Observações (opcional)</label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Observações adicionais..."
                    rows={2}
                    className="w-full px-4 py-3 bg-background rounded-xl border border-white/10 text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary/50 resize-none"
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div>
                    {tipoDevolucao === 'REEMBOLSO' ? (
                      <>
                        <p className="text-muted text-sm">Valor a reembolsar</p>
                        <p className="text-2xl font-bold text-emerald-400">
                          {formatCurrency(totalDevolucao)}
                        </p>
                      </>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted">Devolvido:</span>
                          <span className="text-white">{formatCurrency(totalDevolucao)}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted">Novo produto:</span>
                          <span className="text-white">{formatCurrency(totalTroca)}</span>
                        </div>
                        <div className="flex items-center gap-4 pt-1 border-t border-white/10">
                          <span className="text-muted font-medium">
                            {diferencaTroca > 0 ? 'Cliente paga:' : diferencaTroca < 0 ? 'Cliente recebe:' : 'Sem diferença'}
                          </span>
                          <span className={`text-xl font-bold ${diferencaTroca > 0 ? 'text-amber-400' : diferencaTroca < 0 ? 'text-emerald-400' : 'text-white'}`}>
                            {diferencaTroca !== 0 ? formatCurrency(Math.abs(diferencaTroca)) : '-'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={resetForm}
                      className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmarDevolucao}
                      disabled={saving || itensParaDevolver.length === 0}
                      className={`px-6 py-3 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                        tipoDevolucao === 'TROCA'
                          ? 'bg-blue-500 hover:bg-blue-600'
                          : 'bg-emerald-500 hover:bg-emerald-600'
                      }`}
                    >
                      {saving ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Check size={20} />
                          Confirmar {tipoDevolucao === 'TROCA' ? 'Troca' : 'Reembolso'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lista de Devoluções */}
        <div className="bg-card rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Histórico de Devoluções</h2>
            <div className="flex gap-2">
              {(['', 'TROCA', 'REEMBOLSO'] as const).map((tipo) => (
                <button
                  key={tipo || 'all'}
                  onClick={() => setFiltroTipo(tipo)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    filtroTipo === tipo
                      ? 'bg-primary text-white'
                      : 'bg-white/5 text-muted hover:bg-white/10'
                  }`}
                >
                  {tipo === '' ? 'Todos' : tipo === 'TROCA' ? 'Trocas' : 'Reembolsos'}
                </button>
              ))}
            </div>
          </div>

          {loadingDevolucoes ? (
            <div className="p-8 text-center text-muted">Carregando...</div>
          ) : devolucoes.length === 0 ? (
            <div className="p-8 text-center text-muted">
              <RotateCcw size={48} className="mx-auto mb-4 opacity-50" />
              <p>Nenhuma devolução encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-muted font-medium">Número</th>
                    <th className="text-left p-4 text-muted font-medium">Venda</th>
                    <th className="text-left p-4 text-muted font-medium">Tipo</th>
                    <th className="text-left p-4 text-muted font-medium">Motivo</th>
                    <th className="text-left p-4 text-muted font-medium">Valor</th>
                    <th className="text-left p-4 text-muted font-medium">Data</th>
                    <th className="text-right p-4 text-muted font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {devolucoes.map((dev) => (
                    <tr
                      key={dev.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4">
                        <span className="text-primary font-mono font-medium">{dev.numero}</span>
                      </td>
                      <td className="p-4 text-foreground">{dev.venda?.numero || '-'}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            dev.tipo === 'TROCA'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {dev.tipo}
                        </span>
                      </td>
                      <td className="p-4 text-muted">{getMotivoLabel(dev.motivo)}</td>
                      <td className="p-4">
                        <span className="text-emerald-400 font-medium">
                          {formatCurrency(dev.valorTotal)}
                        </span>
                      </td>
                      <td className="p-4 text-muted">{formatDate(dev.createdAt)}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            setDevolucaoSelecionada(dev);
                            setShowDetalhes(true);
                          }}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-foreground rounded-lg transition-colors"
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={20} className="text-muted" />
              </button>
              <span className="text-muted px-4">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={20} className="text-muted" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Detalhes */}
      {showDetalhes && devolucaoSelecionada && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Devolução {devolucaoSelecionada.numero}
                </h2>
                <p className="text-muted text-sm">{formatDate(devolucaoSelecionada.createdAt)}</p>
              </div>
              <button
                onClick={() => {
                  setShowDetalhes(false);
                  setDevolucaoSelecionada(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} className="text-muted" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted text-sm">Venda</p>
                  <p className="text-white font-medium">
                    {devolucaoSelecionada.venda?.numero || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-sm">Tipo</p>
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      devolucaoSelecionada.tipo === 'TROCA'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {devolucaoSelecionada.tipo}
                  </span>
                </div>
                <div>
                  <p className="text-muted text-sm">Motivo</p>
                  <p className="text-white">
                    {getMotivoLabel(devolucaoSelecionada.motivo)}
                    {devolucaoSelecionada.motivoOutro && (
                      <span className="text-muted ml-1">
                        ({devolucaoSelecionada.motivoOutro})
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-sm">Cliente</p>
                  <p className="text-white">
                    {devolucaoSelecionada.venda?.cliente?.nome || 'Balcão'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-muted text-sm mb-2">Itens</p>
                <div className="space-y-2">
                  {devolucaoSelecionada.itens.map((item) => (
                    <div
                      key={item.id}
                      className="bg-background rounded-xl p-3 border border-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{item.produto.nome}</p>
                          <p className="text-muted text-sm">
                            {item.quantidadeDevolvida}x {formatCurrency(item.valorUnitario)}
                          </p>
                        </div>
                        <p className="text-emerald-400 font-medium">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                      {item.produtoTroca && (
                        <div className="mt-2 pt-2 border-t border-white/10">
                          <p className="text-sm text-muted">
                            Trocado por:{' '}
                            <span className="text-blue-400">{item.produtoTroca.nome}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {devolucaoSelecionada.observacoes && (
                <div>
                  <p className="text-muted text-sm">Observações</p>
                  <p className="text-white">{devolucaoSelecionada.observacoes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-background">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted text-sm">Valor Total</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatCurrency(devolucaoSelecionada.valorTotal)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDetalhes(false);
                    setDevolucaoSelecionada(null);
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

function LoadingSpinner() {
  return (
    <>
      <Header title="Devoluções" subtitle="Gerenciar devoluções e trocas de vendas rápidas" />
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </>
  );
}

export default function DevolucoesPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DevolucoesPageContent />
    </Suspense>
  );
}
