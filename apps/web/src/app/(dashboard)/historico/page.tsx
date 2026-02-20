'use client';

import Header from '@/components/Header';
import {
  Search,
  History,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  ClipboardList,
  ShoppingCart,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface HistoricoItem {
  id: number;
  tipo: 'OS' | 'VENDA';
  numero: string;
  cliente: string;
  telefone: string | null;
  descricao: string;
  itens: string;
  total: number;
  formaPagamento: string | null;
  data: string;
  status: string | null;
}

interface Stats {
  vendasHoje: number;
  faturamentoHoje: number;
}

const formaPagamentoConfig: Record<string, { label: string; icon: any; color: string }> = {
  DINHEIRO: { label: 'Dinheiro', icon: Banknote, color: 'text-green-400' },
  PIX: { label: 'PIX', icon: Smartphone, color: 'text-cyan-400' },
  CREDITO: { label: 'Crédito', icon: CreditCard, color: 'text-purple-400' },
  DEBITO: { label: 'Débito', icon: CreditCard, color: 'text-blue-400' },
};

export default function HistoricoPage() {
  const [items, setItems] = useState<HistoricoItem[]>([]);
  const [stats, setStats] = useState<Stats>({ vendasHoje: 0, faturamentoHoje: 0 });
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const fetchHistorico = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        tipo: tipoFilter,
      });
      if (busca) params.append('busca', busca);
      if (dataInicio) params.append('dataInicio', dataInicio);
      if (dataFim) params.append('dataFim', dataFim);

      const res = await fetch(`/api/historico?${params}`);
      const data = await res.json();

      if (data.data) {
        setItems(data.data);
        setStats(data.stats);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorico();
  }, [page, tipoFilter, dataInicio, dataFim]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      fetchHistorico();
    }, 300);
    return () => clearTimeout(timeout);
  }, [busca]);

  const clearFilters = () => {
    setBusca('');
    setTipoFilter('todos');
    setDataInicio('');
    setDataFim('');
    setPage(1);
  };

  const hasActiveFilters = busca || tipoFilter !== 'todos' || dataInicio || dataFim;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Header title="Histórico de Vendas" subtitle="Acompanhe suas vendas e serviços concluídos" />

      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Receipt size={24} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-foreground-muted">Vendas Hoje</p>
                <p className="text-2xl font-bold text-foreground">{stats.vendasHoje}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <DollarSign size={24} className="text-green-400" />
              </div>
              <div>
                <p className="text-sm text-foreground-muted">Faturamento Hoje</p>
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.faturamentoHoje)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar por número, cliente ou placa..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-background-secondary border border-border rounded-xl text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTipoFilter('todos')}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tipoFilter === 'todos'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-background-secondary text-muted border border-border hover:border-border'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setTipoFilter('os')}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  tipoFilter === 'os'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-background-secondary text-muted border border-border hover:border-border'
                }`}
              >
                <ClipboardList size={16} />
                O.S.
              </button>
              <button
                onClick={() => setTipoFilter('vendas')}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  tipoFilter === 'vendas'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-background-secondary text-muted border border-border hover:border-border'
                }`}
              >
                <ShoppingCart size={16} />
                Vendas
              </button>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                showFilters || hasActiveFilters
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-background-secondary text-muted border border-border hover:border-border'
              }`}
            >
              <Filter size={16} />
              Filtros
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs text-foreground-muted mb-1">Data Início</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="px-4 py-2.5 bg-background-secondary border border-border rounded-xl text-foreground focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-foreground-muted mb-1">Data Fim</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="px-4 py-2.5 bg-background-secondary border border-border rounded-xl text-foreground focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-all flex items-center gap-2"
                >
                  <X size={16} />
                  Limpar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-foreground-muted">
              <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              Carregando...
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-foreground-muted">
              <History size={48} className="mx-auto mb-4 opacity-50" />
              <p>Nenhum registro encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => {
                const pagamento = item.formaPagamento
                  ? formaPagamentoConfig[item.formaPagamento]
                  : null;
                const PagamentoIcon = pagamento?.icon || DollarSign;

                return (
                  <div
                    key={`${item.tipo}-${item.id}`}
                    className="p-4 hover:bg-background-secondary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {/* Type Badge */}
                        <div
                          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                            item.tipo === 'OS'
                              ? 'bg-blue-500/10'
                              : 'bg-purple-500/10'
                          }`}
                        >
                          {item.tipo === 'OS' ? (
                            <ClipboardList size={20} className="text-blue-400" />
                          ) : (
                            <ShoppingCart size={20} className="text-purple-400" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">
                              {item.numero}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                item.tipo === 'OS'
                                  ? 'bg-blue-500/10 text-blue-400'
                                  : 'bg-purple-500/10 text-purple-400'
                              }`}
                            >
                              {item.tipo === 'OS' ? 'O.S.' : 'Venda'}
                            </span>
                          </div>
                          <p className="text-sm text-muted truncate">
                            {item.cliente}
                            {item.descricao && item.tipo === 'OS' && (
                              <span className="text-foreground-muted"> - {item.descricao}</span>
                            )}
                          </p>
                          {item.itens && (
                            <p className="text-xs text-foreground-muted truncate mt-0.5">
                              {item.itens}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Side */}
                      <div className="flex items-center gap-4 shrink-0">
                        {/* Payment Method */}
                        {pagamento && (
                          <div className={`flex items-center gap-1.5 ${pagamento.color}`}>
                            <PagamentoIcon size={16} />
                            <span className="text-sm hidden md:inline">{pagamento.label}</span>
                          </div>
                        )}

                        {/* Total */}
                        <div className="text-right">
                          <p className="font-bold text-emerald-400">
                            {formatCurrency(item.total)}
                          </p>
                          <p className="text-xs text-foreground-muted">
                            {formatDateTime(item.data)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 bg-card border border-border rounded-2xl px-6 py-4">
            <p className="text-sm text-muted">
              Mostrando {((page - 1) * 20) + 1} - {Math.min(page * 20, total)} de {total} registros
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-background-secondary border border-border rounded-lg text-foreground-muted hover:text-foreground hover:border-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="px-4 py-2 text-foreground font-medium">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 bg-background-secondary border border-border rounded-lg text-foreground-muted hover:text-foreground hover:border-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
