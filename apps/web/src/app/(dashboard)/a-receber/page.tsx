'use client';

import Header from '@/components/Header';
import {
  Clock, DollarSign, Search, CheckCircle, X,
  Car, Package, Filter, Loader2, AlertCircle, Calendar
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';

interface Pendencia {
  id: number;
  tipo: 'ORDEM' | 'VENDA';
  numero: string;
  cliente: string;
  telefone: string | null;
  total: number;
  dataCriacao: string;
  dataConclusao: string;
  dataPagamentoPrevista: string | null;
  veiculo: string | null;
}

interface Stats {
  total: number;
  totalPendente: number;
  ordens: number;
  totalOrdens: number;
  vendas: number;
  totalVendas: number;
}

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (date: string | null) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
};

export default function AReceberPage() {
  const toast = useToast();
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, totalPendente: 0, ordens: 0, totalOrdens: 0, vendas: 0, totalVendas: 0 });
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'ordens' | 'vendas'>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de pagamento
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [selectedPendencia, setSelectedPendencia] = useState<Pendencia | null>(null);
  const [formaPagamento, setFormaPagamento] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPendencias = async () => {
    try {
      const res = await fetch(`/api/a-receber?tipo=${filtroTipo}`);
      const data = await res.json();
      setPendencias(data.data || []);
      setStats(data.stats || { total: 0, totalPendente: 0, ordens: 0, totalOrdens: 0, vendas: 0, totalVendas: 0 });
    } catch (error) {
      console.error('Erro ao buscar pendências:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendencias();
  }, [filtroTipo]);

  const handleMarcarPago = async () => {
    if (!selectedPendencia || !formaPagamento) return;

    setSaving(true);
    try {
      const res = await fetch('/api/a-receber', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPendencia.id,
          formaPagamento,
        }),
      });

      if (res.ok) {
        toast.success('Pagamento registrado!');
        setShowPagamentoModal(false);
        setSelectedPendencia(null);
        setFormaPagamento('');
        fetchPendencias();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao registrar pagamento');
      }
    } catch (error) {
      toast.error('Erro ao registrar pagamento');
    } finally {
      setSaving(false);
    }
  };

  const filteredPendencias = pendencias.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.numero.toLowerCase().includes(term) ||
      p.cliente.toLowerCase().includes(term) ||
      (p.veiculo && p.veiculo.toLowerCase().includes(term))
    );
  });

  const isVencido = (data: string | null) => {
    if (!data) return false;
    return new Date(data) < new Date();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Crédito Pessoal" subtitle="Gerencie os pagamentos pendentes" />
      <main className="p-6">
        <div className="max-w-7xl mx-auto">

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-400/70">Total Pendente</p>
                  <p className="text-2xl font-bold text-amber-400">{formatCurrency(stats.totalPendente)}</p>
                  <p className="text-xs text-foreground-muted mt-1">{stats.total} pendências</p>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-xl">
                  <Clock size={24} className="text-amber-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-400/70">Ordens de Serviço</p>
                  <p className="text-2xl font-bold text-purple-400">{formatCurrency(stats.totalOrdens)}</p>
                  <p className="text-xs text-foreground-muted mt-1">{stats.ordens} ordens</p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-xl">
                  <Car size={24} className="text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-400/70">Vendas Rápidas</p>
                  <p className="text-2xl font-bold text-blue-400">{formatCurrency(stats.totalVendas)}</p>
                  <p className="text-xs text-foreground-muted mt-1">{stats.vendas} vendas</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Package size={24} className="text-blue-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar por cliente, número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-card rounded-xl border border-border text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div className="flex gap-2">
              {[
                { value: 'todos', label: 'Todos' },
                { value: 'ordens', label: 'O.S.' },
                { value: 'vendas', label: 'Vendas' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFiltroTipo(opt.value as typeof filtroTipo)}
                  className={`px-4 py-3 rounded-xl border transition-all duration-200 ${
                    filtroTipo === opt.value
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : 'bg-card border-border text-muted hover:border-border'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="text-amber-500 animate-spin" />
            </div>
          ) : filteredPendencias.length === 0 ? (
            <div className="text-center py-20">
              <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
              <p className="text-foreground text-lg font-medium">Nenhuma pendência!</p>
              <p className="text-foreground-muted">Todos os pagamentos estão em dia.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPendencias.map((pendencia) => (
                <div
                  key={`${pendencia.tipo}-${pendencia.id}`}
                  className="bg-card border border-border rounded-xl p-4 hover:border-border transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${
                        pendencia.tipo === 'ORDEM'
                          ? 'bg-purple-500/10 border border-purple-500/20'
                          : 'bg-blue-500/10 border border-blue-500/20'
                      }`}>
                        {pendencia.tipo === 'ORDEM' ? (
                          <Car size={20} className="text-purple-400" />
                        ) : (
                          <Package size={20} className="text-blue-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-medium">{pendencia.numero}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            pendencia.tipo === 'ORDEM'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {pendencia.tipo === 'ORDEM' ? 'O.S.' : 'Venda'}
                          </span>
                          {isVencido(pendencia.dataPagamentoPrevista) && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 flex items-center gap-1">
                              <AlertCircle size={12} />
                              Vencido
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted">{pendencia.cliente}</p>
                        {pendencia.veiculo && (
                          <p className="text-xs text-foreground-muted">{pendencia.veiculo}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-lg font-bold text-amber-400">{formatCurrency(pendencia.total)}</p>
                        <div className="flex items-center gap-1 text-xs text-foreground-muted">
                          <Calendar size={12} />
                          {pendencia.dataPagamentoPrevista ? (
                            <span className={isVencido(pendencia.dataPagamentoPrevista) ? 'text-red-400' : ''}>
                              Prev: {formatDate(pendencia.dataPagamentoPrevista)}
                            </span>
                          ) : (
                            <span>Sem previsão</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPendencia(pendencia);
                          setShowPagamentoModal(true);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-xl text-white text-sm font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300"
                      >
                        Receber
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal de Pagamento */}
      {showPagamentoModal && selectedPendencia && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl shadow-black/50">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Registrar Pagamento</h2>
              <button
                onClick={() => {
                  setShowPagamentoModal(false);
                  setSelectedPendencia(null);
                  setFormaPagamento('');
                }}
                className="p-2 text-muted hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-xl ${
                  selectedPendencia.tipo === 'ORDEM'
                    ? 'bg-purple-500/10 border border-purple-500/20'
                    : 'bg-blue-500/10 border border-blue-500/20'
                }`}>
                  {selectedPendencia.tipo === 'ORDEM' ? (
                    <Car size={24} className="text-purple-400" />
                  ) : (
                    <Package size={24} className="text-blue-400" />
                  )}
                </div>
                <div>
                  <p className="text-foreground font-medium">{selectedPendencia.numero}</p>
                  <p className="text-sm text-muted">{selectedPendencia.cliente}</p>
                </div>
              </div>

              <div className="bg-background rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Valor a receber:</span>
                  <span className="text-2xl font-bold text-emerald-400">{formatCurrency(selectedPendencia.total)}</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-muted mb-2">Forma de Pagamento</label>
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
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-background border-border text-muted hover:border-zinc-600'
                      }`}
                    >
                      <span>{method.icon}</span>
                      <span className="font-medium">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowPagamentoModal(false);
                  setSelectedPendencia(null);
                  setFormaPagamento('');
                }}
                className="px-6 py-3 border border-border rounded-xl text-muted hover:bg-zinc-800 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleMarcarPago}
                disabled={saving || !formaPagamento}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : !formaPagamento ? (
                  'Selecione o pagamento'
                ) : (
                  'Confirmar Recebimento'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
