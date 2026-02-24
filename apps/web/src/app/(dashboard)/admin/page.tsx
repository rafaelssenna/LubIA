'use client';

import Header from '@/components/Header';
import StarRating from '@/components/StarRating';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Building2, Users, Car, ShoppingCart, Lightbulb, Loader2,
  CheckCircle, Clock, Code, Archive, Sparkles, AlertCircle,
  TrendingUp, Package, FileText, X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';

interface Stats {
  totalEmpresas: number;
  empresasAtivas: number;
  totalUsuarios: number;
  totalClientes: number;
  totalOrdens: number;
  totalVendas: number;
  totalIdeias: number;
}

interface Empresa {
  id: number;
  nome: string;
  slug: string;
  ativo: boolean;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  createdAt: string;
  usuarios: number;
  clientes: number;
  ordens: number;
  vendas: number;
  ideias: number;
}

interface IdeiaRecente {
  id: number;
  titulo: string;
  status: string;
  categoria: string;
  notaMedia: number | null;
  autor: string;
  empresa: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  SUGERIDA: 'zinc',
  EM_AVALIACAO: 'amber',
  APROVADA: 'emerald',
  EM_DESENVOLVIMENTO: 'blue',
  IMPLEMENTADA: 'green',
  ARQUIVADA: 'gray',
};

const STATUS_LABELS: Record<string, string> = {
  SUGERIDA: 'Sugerida',
  EM_AVALIACAO: 'Em Avaliação',
  APROVADA: 'Aprovada',
  EM_DESENVOLVIMENTO: 'Em Dev',
  IMPLEMENTADA: 'Implementada',
  ARQUIVADA: 'Arquivada',
};

const SUBSCRIPTION_COLORS: Record<string, string> = {
  TRIAL: 'amber',
  ACTIVE: 'emerald',
  PAST_DUE: 'orange',
  CANCELED: 'red',
  UNPAID: 'red',
};

export default function AdminPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [ideiasRecentes, setIdeiasRecentes] = useState<IdeiaRecente[]>([]);
  const [ideiasPorStatus, setIdeiasPorStatus] = useState<Record<string, number>>({});

  // Modal de avaliação
  const [showAvaliarModal, setShowAvaliarModal] = useState(false);
  const [selectedIdeia, setSelectedIdeia] = useState<IdeiaRecente | null>(null);
  const [notaAvaliacao, setNotaAvaliacao] = useState(0);
  const [novoStatus, setNovoStatus] = useState('');
  const [savingAvaliacao, setSavingAvaliacao] = useState(false);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.push('/');
    }
  }, [authLoading, isSuperAdmin, router]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [isSuperAdmin]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin');
      if (!res.ok) throw new Error('Sem permissão');
      const data = await res.json();
      setStats(data.stats);
      setEmpresas(data.empresas);
      setIdeiasRecentes(data.ideiasRecentes);
      setIdeiasPorStatus(data.ideiasPorStatus || {});
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAvaliar = async () => {
    if (!selectedIdeia) return;

    setSavingAvaliacao(true);
    try {
      const res = await fetch('/api/admin/ideias', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedIdeia.id,
          status: novoStatus || undefined,
          nota: notaAvaliacao > 0 ? notaAvaliacao : undefined,
        }),
      });

      if (res.ok) {
        toast.success('Ideia atualizada!');
        setShowAvaliarModal(false);
        setSelectedIdeia(null);
        setNotaAvaliacao(0);
        setNovoStatus('');
        fetchData();
      } else {
        toast.error('Erro ao atualizar');
      }
    } catch (error) {
      toast.error('Erro ao atualizar');
    } finally {
      setSavingAvaliacao(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Painel Admin" subtitle="Helsen IA - Acesso Total" />
      <main className="p-6">
        <div className="max-w-7xl mx-auto">

          {/* Stats Gerais */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-4">
              <Building2 size={20} className="text-purple-400 mb-2" />
              <p className="text-2xl font-bold text-purple-400">{stats?.totalEmpresas || 0}</p>
              <p className="text-xs text-muted">Empresas</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-4">
              <CheckCircle size={20} className="text-emerald-400 mb-2" />
              <p className="text-2xl font-bold text-emerald-400">{stats?.empresasAtivas || 0}</p>
              <p className="text-xs text-muted">Ativas</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-4">
              <Users size={20} className="text-blue-400 mb-2" />
              <p className="text-2xl font-bold text-blue-400">{stats?.totalUsuarios || 0}</p>
              <p className="text-xs text-muted">Usuários</p>
            </div>
            <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-2xl p-4">
              <Car size={20} className="text-cyan-400 mb-2" />
              <p className="text-2xl font-bold text-cyan-400">{stats?.totalClientes || 0}</p>
              <p className="text-xs text-muted">Clientes</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-2xl p-4">
              <FileText size={20} className="text-orange-400 mb-2" />
              <p className="text-2xl font-bold text-orange-400">{stats?.totalOrdens || 0}</p>
              <p className="text-xs text-muted">O.S.</p>
            </div>
            <div className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/20 rounded-2xl p-4">
              <ShoppingCart size={20} className="text-pink-400 mb-2" />
              <p className="text-2xl font-bold text-pink-400">{stats?.totalVendas || 0}</p>
              <p className="text-xs text-muted">Vendas</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-4">
              <Lightbulb size={20} className="text-amber-400 mb-2" />
              <p className="text-2xl font-bold text-amber-400">{stats?.totalIdeias || 0}</p>
              <p className="text-xs text-muted">Ideias</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Lista de Empresas */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Building2 size={20} />
                Empresas ({empresas.length})
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {empresas.map((empresa) => (
                  <div
                    key={empresa.id}
                    className="bg-background rounded-xl p-4 border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-foreground">{empresa.nome}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-${SUBSCRIPTION_COLORS[empresa.subscriptionStatus]}-500/20 text-${SUBSCRIPTION_COLORS[empresa.subscriptionStatus]}-400`}>
                        {empresa.subscriptionStatus}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs text-muted">
                      <div>
                        <span className="text-foreground font-medium">{empresa.usuarios}</span> usuários
                      </div>
                      <div>
                        <span className="text-foreground font-medium">{empresa.clientes}</span> clientes
                      </div>
                      <div>
                        <span className="text-foreground font-medium">{empresa.ordens}</span> O.S.
                      </div>
                      <div>
                        <span className="text-foreground font-medium">{empresa.ideias}</span> ideias
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ideias Recentes */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Lightbulb size={20} />
                Ideias Recentes
              </h2>

              {/* Stats de ideias por status */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(ideiasPorStatus).map(([status, count]) => (
                  <span
                    key={status}
                    className={`text-xs px-2 py-1 rounded-full bg-${STATUS_COLORS[status]}-500/20 text-${STATUS_COLORS[status]}-400`}
                  >
                    {STATUS_LABELS[status]}: {count}
                  </span>
                ))}
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {ideiasRecentes.map((ideia) => (
                  <div
                    key={ideia.id}
                    onClick={() => {
                      setSelectedIdeia(ideia);
                      setNovoStatus(ideia.status);
                      setShowAvaliarModal(true);
                    }}
                    className="bg-background rounded-xl p-4 border border-border hover:border-amber-500/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">{ideia.titulo}</h3>
                        <p className="text-xs text-muted mt-1">
                          {ideia.autor} • {ideia.empresa}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-${STATUS_COLORS[ideia.status]}-500/20 text-${STATUS_COLORS[ideia.status]}-400`}>
                          {STATUS_LABELS[ideia.status]}
                        </span>
                        {ideia.notaMedia !== null && (
                          <StarRating value={ideia.notaMedia} readonly size="sm" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Avaliar Ideia */}
      {showAvaliarModal && selectedIdeia && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Avaliar Ideia</h2>
              <button
                onClick={() => {
                  setShowAvaliarModal(false);
                  setSelectedIdeia(null);
                  setNotaAvaliacao(0);
                  setNovoStatus('');
                }}
                className="p-2 text-muted hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-medium text-foreground">{selectedIdeia.titulo}</h3>
                <p className="text-sm text-muted mt-1">
                  {selectedIdeia.autor} • {selectedIdeia.empresa}
                </p>
              </div>

              {/* Nota */}
              <div>
                <label className="block text-sm text-muted mb-2">Sua Avaliação</label>
                <StarRating value={notaAvaliacao} onChange={setNotaAvaliacao} size="lg" />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm text-muted mb-2">Status</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setNovoStatus(value)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                        novoStatus === value
                          ? `bg-${STATUS_COLORS[value]}-500/30 text-${STATUS_COLORS[value]}-400 ring-1 ring-${STATUS_COLORS[value]}-500`
                          : `bg-${STATUS_COLORS[value]}-500/10 text-${STATUS_COLORS[value]}-400 hover:bg-${STATUS_COLORS[value]}-500/20`
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAvaliarModal(false);
                  setSelectedIdeia(null);
                }}
                className="px-6 py-3 border border-border rounded-xl text-muted hover:bg-zinc-800 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleAvaliar}
                disabled={savingAvaliacao}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-700 rounded-xl text-white font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {savingAvaliacao && <Loader2 size={18} className="animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
