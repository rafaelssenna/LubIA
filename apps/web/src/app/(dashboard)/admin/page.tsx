'use client';

import Header from '@/components/Header';
import StarRating from '@/components/StarRating';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Building2, Users, Car, ShoppingCart, Lightbulb, Loader2,
  CheckCircle, Clock, Code, Archive, Sparkles, AlertCircle,
  TrendingUp, Package, FileText, X, Search, Mail, Shield,
  UserCheck, UserX
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
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

interface Usuario {
  id: number;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  empresa: string;
}

interface Ideia {
  id: number;
  titulo: string;
  descricao: string;
  status: string;
  categoria: string;
  impacto: string;
  notaMedia: number | null;
  totalAvaliacoes: number;
  autor: string;
  empresa: string;
  createdAt: string;
}

type Tab = 'visao-geral' | 'usuarios' | 'ideario';

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
  EM_AVALIACAO: 'Em Avaliacao',
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

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'purple',
  GERENTE: 'blue',
  MECANICO: 'cyan',
  ATENDENTE: 'emerald',
};

const IMPACTO_LABELS: Record<string, string> = {
  BAIXO: 'Baixo',
  MEDIO: 'Medio',
  ALTO: 'Alto',
  CRITICO: 'Critico',
};

export default function AdminPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('visao-geral');
  const [stats, setStats] = useState<Stats | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [ideias, setIdeias] = useState<Ideia[]>([]);
  const [ideiasPorStatus, setIdeiasPorStatus] = useState<Record<string, number>>({});

  // Filtros de usuarios
  const [userSearch, setUserSearch] = useState('');
  const [userEmpresaFilter, setUserEmpresaFilter] = useState('');

  // Filtros de ideias
  const [ideiaSearch, setIdeiaSearch] = useState('');
  const [ideiaStatusFilter, setIdeiaStatusFilter] = useState('');
  const [ideiaEmpresaFilter, setIdeiaEmpresaFilter] = useState('');

  // Modal de avaliacao
  const [showAvaliarModal, setShowAvaliarModal] = useState(false);
  const [selectedIdeia, setSelectedIdeia] = useState<Ideia | null>(null);
  const [notaAvaliacao, setNotaAvaliacao] = useState(0);
  const [novoStatus, setNovoStatus] = useState('');
  const [savingAvaliacao, setSavingAvaliacao] = useState(false);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.push('/dashboard');
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
      if (!res.ok) throw new Error('Sem permissao');
      const data = await res.json();
      setStats(data.stats);
      setEmpresas(data.empresas);
      setUsuarios(data.usuarios || []);
      setIdeias(data.ideias || []);
      setIdeiasPorStatus(data.ideiasPorStatus || {});
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Listas de empresas unicas para filtros
  const empresasUnicas = useMemo(() => {
    const nomes = new Set(empresas.map((e) => e.nome));
    return Array.from(nomes).sort();
  }, [empresas]);

  // Filtrar usuarios
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const matchSearch =
        !userSearch ||
        u.nome.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchEmpresa = !userEmpresaFilter || u.empresa === userEmpresaFilter;
      return matchSearch && matchEmpresa;
    });
  }, [usuarios, userSearch, userEmpresaFilter]);

  // Filtrar ideias
  const ideiasFiltradas = useMemo(() => {
    return ideias.filter((i) => {
      const matchSearch =
        !ideiaSearch ||
        i.titulo.toLowerCase().includes(ideiaSearch.toLowerCase()) ||
        i.descricao?.toLowerCase().includes(ideiaSearch.toLowerCase());
      const matchStatus = !ideiaStatusFilter || i.status === ideiaStatusFilter;
      const matchEmpresa = !ideiaEmpresaFilter || i.empresa === ideiaEmpresaFilter;
      return matchSearch && matchStatus && matchEmpresa;
    });
  }, [ideias, ideiaSearch, ideiaStatusFilter, ideiaEmpresaFilter]);

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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'visao-geral', label: 'Visao Geral', icon: <TrendingUp size={16} /> },
    { key: 'usuarios', label: `Usuarios (${usuarios.length})`, icon: <Users size={16} /> },
    { key: 'ideario', label: `Ideario (${ideias.length})`, icon: <Lightbulb size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header title="Painel Admin" subtitle="Helsen IA - Acesso Total" />
      <main className="p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-card border border-border rounded-xl p-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? 'bg-primary text-white shadow-md'
                    : 'text-muted hover:text-foreground hover:bg-card-hover'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ==================== ABA: VISAO GERAL ==================== */}
          {activeTab === 'visao-geral' && (
            <>
              {/* Stats Gerais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-3 sm:p-4">
                  <Building2 size={20} className="text-purple-400 mb-2" />
                  <p className="text-2xl font-bold text-purple-400">{stats?.totalEmpresas || 0}</p>
                  <p className="text-xs text-muted">Empresas</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-3 sm:p-4">
                  <CheckCircle size={20} className="text-emerald-400 mb-2" />
                  <p className="text-2xl font-bold text-emerald-400">{stats?.empresasAtivas || 0}</p>
                  <p className="text-xs text-muted">Ativas</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-3 sm:p-4">
                  <Users size={20} className="text-blue-400 mb-2" />
                  <p className="text-2xl font-bold text-blue-400">{stats?.totalUsuarios || 0}</p>
                  <p className="text-xs text-muted">Usuarios</p>
                </div>
                <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-2xl p-3 sm:p-4">
                  <Car size={20} className="text-cyan-400 mb-2" />
                  <p className="text-2xl font-bold text-cyan-400">{stats?.totalClientes || 0}</p>
                  <p className="text-xs text-muted">Clientes</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-2xl p-3 sm:p-4">
                  <FileText size={20} className="text-orange-400 mb-2" />
                  <p className="text-2xl font-bold text-orange-400">{stats?.totalOrdens || 0}</p>
                  <p className="text-xs text-muted">O.S.</p>
                </div>
                <div className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/20 rounded-2xl p-3 sm:p-4">
                  <ShoppingCart size={20} className="text-pink-400 mb-2" />
                  <p className="text-2xl font-bold text-pink-400">{stats?.totalVendas || 0}</p>
                  <p className="text-xs text-muted">Vendas</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-3 sm:p-4">
                  <Lightbulb size={20} className="text-amber-400 mb-2" />
                  <p className="text-2xl font-bold text-amber-400">{stats?.totalIdeias || 0}</p>
                  <p className="text-xs text-muted">Ideias</p>
                </div>
              </div>

              {/* Lista de Empresas */}
              <div className="bg-card border border-border rounded-2xl p-3 sm:p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Building2 size={20} />
                  Empresas ({empresas.length})
                </h2>
                <div className="space-y-3">
                  {empresas.map((empresa) => (
                    <div
                      key={empresa.id}
                      className="bg-background rounded-xl p-3 sm:p-4 border border-border hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-foreground">{empresa.nome}</h3>
                          <p className="text-xs text-muted">{empresa.slug} • Criada em {formatDate(empresa.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            empresa.ativo
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {empresa.ativo ? 'Ativa' : 'Inativa'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full bg-${SUBSCRIPTION_COLORS[empresa.subscriptionStatus] || 'zinc'}-500/20 text-${SUBSCRIPTION_COLORS[empresa.subscriptionStatus] || 'zinc'}-400`}>
                            {empresa.subscriptionStatus}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-muted">
                        <div>
                          <span className="text-foreground font-medium">{empresa.usuarios}</span> usuarios
                        </div>
                        <div>
                          <span className="text-foreground font-medium">{empresa.clientes}</span> clientes
                        </div>
                        <div>
                          <span className="text-foreground font-medium">{empresa.ordens}</span> O.S.
                        </div>
                        <div>
                          <span className="text-foreground font-medium">{empresa.vendas}</span> vendas
                        </div>
                        <div>
                          <span className="text-foreground font-medium">{empresa.ideias}</span> ideias
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ==================== ABA: USUARIOS ==================== */}
          {activeTab === 'usuarios' && (
            <div className="space-y-4">
              {/* Filtros */}
              <div className="bg-card border border-border rounded-2xl p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      placeholder="Buscar por nome ou email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <select
                    value={userEmpresaFilter}
                    onChange={(e) => setUserEmpresaFilter(e.target.value)}
                    className="px-4 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Todas as empresas</option>
                    {empresasUnicas.map((nome) => (
                      <option key={nome} value={nome}>{nome}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-muted mt-2">
                  {usuariosFiltrados.length} de {usuarios.length} usuarios
                </p>
              </div>

              {/* Tabela desktop */}
              <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-background/50">
                      <th className="text-left p-3 text-xs font-medium text-muted uppercase">Nome</th>
                      <th className="text-left p-3 text-xs font-medium text-muted uppercase">Email</th>
                      <th className="text-left p-3 text-xs font-medium text-muted uppercase">Role</th>
                      <th className="text-left p-3 text-xs font-medium text-muted uppercase">Empresa</th>
                      <th className="text-left p-3 text-xs font-medium text-muted uppercase">Ultimo Login</th>
                      <th className="text-left p-3 text-xs font-medium text-muted uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosFiltrados.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                        <td className="p-3">
                          <span className="font-medium text-foreground text-sm">{u.nome}</span>
                        </td>
                        <td className="p-3 text-sm text-muted">{u.email}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full bg-${ROLE_COLORS[u.role] || 'zinc'}-500/20 text-${ROLE_COLORS[u.role] || 'zinc'}-400`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-muted">{u.empresa}</td>
                        <td className="p-3 text-sm text-muted">{formatDateTime(u.lastLoginAt)}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            u.ativo
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {u.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {usuariosFiltrados.length === 0 && (
                  <div className="p-8 text-center text-muted text-sm">
                    Nenhum usuario encontrado
                  </div>
                )}
              </div>

              {/* Cards mobile */}
              <div className="md:hidden space-y-3">
                {usuariosFiltrados.map((u) => (
                  <div key={u.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-foreground text-sm">{u.nome}</h3>
                        <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                          <Mail size={12} /> {u.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-${ROLE_COLORS[u.role] || 'zinc'}-500/20 text-${ROLE_COLORS[u.role] || 'zinc'}-400`}>
                          {u.role}
                        </span>
                        {u.ativo ? (
                          <UserCheck size={14} className="text-emerald-400" />
                        ) : (
                          <UserX size={14} className="text-red-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted mt-2">
                      <span>{u.empresa}</span>
                      <span>Login: {formatDateTime(u.lastLoginAt)}</span>
                    </div>
                  </div>
                ))}
                {usuariosFiltrados.length === 0 && (
                  <div className="p-8 text-center text-muted text-sm bg-card border border-border rounded-xl">
                    Nenhum usuario encontrado
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== ABA: IDEARIO ==================== */}
          {activeTab === 'ideario' && (
            <div className="space-y-4">
              {/* Stats de ideias por status */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(ideiasPorStatus).map(([status, count]) => (
                  <button
                    key={status}
                    onClick={() => setIdeiaStatusFilter(ideiaStatusFilter === status ? '' : status)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                      ideiaStatusFilter === status
                        ? `bg-${STATUS_COLORS[status]}-500/30 text-${STATUS_COLORS[status]}-400 ring-1 ring-${STATUS_COLORS[status]}-500`
                        : `bg-${STATUS_COLORS[status]}-500/20 text-${STATUS_COLORS[status]}-400 hover:bg-${STATUS_COLORS[status]}-500/30`
                    }`}
                  >
                    {STATUS_LABELS[status]}: {count}
                  </button>
                ))}
              </div>

              {/* Filtros */}
              <div className="bg-card border border-border rounded-2xl p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      placeholder="Buscar por titulo ou descricao..."
                      value={ideiaSearch}
                      onChange={(e) => setIdeiaSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <select
                    value={ideiaEmpresaFilter}
                    onChange={(e) => setIdeiaEmpresaFilter(e.target.value)}
                    className="px-4 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Todas as empresas</option>
                    {empresasUnicas.map((nome) => (
                      <option key={nome} value={nome}>{nome}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-muted mt-2">
                  {ideiasFiltradas.length} de {ideias.length} ideias
                </p>
              </div>

              {/* Lista de ideias */}
              <div className="space-y-3">
                {ideiasFiltradas.map((ideia) => (
                  <div
                    key={ideia.id}
                    onClick={() => {
                      setSelectedIdeia(ideia);
                      setNovoStatus(ideia.status);
                      setNotaAvaliacao(ideia.notaMedia || 0);
                      setShowAvaliarModal(true);
                    }}
                    className="bg-card border border-border rounded-xl p-4 hover:border-amber-500/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground">{ideia.titulo}</h3>
                        {ideia.descricao && (
                          <p className="text-sm text-muted mt-1 line-clamp-2">{ideia.descricao}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted">
                          <span>{ideia.autor}</span>
                          <span>•</span>
                          <span>{ideia.empresa}</span>
                          <span>•</span>
                          <span>{formatDate(ideia.createdAt)}</span>
                          {ideia.categoria && (
                            <>
                              <span>•</span>
                              <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded">{ideia.categoria}</span>
                            </>
                          )}
                          {ideia.impacto && (
                            <>
                              <span>•</span>
                              <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded">
                                {IMPACTO_LABELS[ideia.impacto] || ideia.impacto}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-${STATUS_COLORS[ideia.status] || 'zinc'}-500/20 text-${STATUS_COLORS[ideia.status] || 'zinc'}-400`}>
                          {STATUS_LABELS[ideia.status] || ideia.status}
                        </span>
                        {ideia.notaMedia !== null && (
                          <StarRating value={ideia.notaMedia} readonly size="sm" />
                        )}
                        {ideia.totalAvaliacoes > 0 && (
                          <span className="text-xs text-muted">{ideia.totalAvaliacoes} aval.</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {ideiasFiltradas.length === 0 && (
                  <div className="p-8 text-center text-muted text-sm bg-card border border-border rounded-xl">
                    Nenhuma ideia encontrada
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Avaliar Ideia */}
      {showAvaliarModal && selectedIdeia && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-3 sm:p-6 border-b border-border flex items-center justify-between">
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
            <div className="p-3 sm:p-6 space-y-4">
              <div>
                <h3 className="font-medium text-foreground">{selectedIdeia.titulo}</h3>
                {selectedIdeia.descricao && (
                  <p className="text-sm text-muted mt-1">{selectedIdeia.descricao}</p>
                )}
                <p className="text-xs text-muted mt-2">
                  {selectedIdeia.autor} • {selectedIdeia.empresa}
                </p>
              </div>

              {/* Nota */}
              <div>
                <label className="block text-sm text-muted mb-2">Sua Avaliacao</label>
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
            <div className="p-3 sm:p-6 border-t border-border flex flex-col-reverse sm:flex-row gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAvaliarModal(false);
                  setSelectedIdeia(null);
                }}
                className="px-6 py-3 border border-border rounded-xl text-muted hover:bg-card-hover transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleAvaliar}
                disabled={savingAvaliacao}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-700 rounded-xl text-white font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
