'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import {
  Users,
  Search,
  RefreshCw,
  Phone,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Loader2,
  Calendar,
  Zap,
  Bot,
} from 'lucide-react';

// ─── Tipos ───

interface Lead {
  id: string;
  phone: string;
  name: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  messageCount: number;
  score: 'qualified' | 'interested' | 'new_lead';
  scoreLabel: { label: string; emoji: string; color: string };
  confidence: number;
  reasons: string[];
  suggestedAction?: string;
  activated: boolean;
  demoScheduled: boolean;
  followUpStep: number;
  agentId: string;
  adminLocked: boolean;
  createdAt: string;
}

interface Stats {
  total: number;
  activated: number;
  demoScheduled: number;
  agents: Record<string, number>;
  recentToday: number;
}

type ScoreFilter = 'all' | 'qualified' | 'interested' | 'new_lead';

// ─── Helpers ───

function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 13) return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  if (clean.length === 12) return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`;
  if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  return phone;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const scoreColors: Record<string, string> = {
  qualified: 'bg-green-500/20 text-green-400 border-green-500/30',
  interested: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  new_lead: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const scoreBorderColors: Record<string, string> = {
  qualified: 'border-l-green-500',
  interested: 'border-l-yellow-500',
  new_lead: 'border-l-blue-500',
};

// ─── Componente Principal ───

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);
  const [filter, setFilter] = useState<ScoreFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({ qualified: 0, interested: 0, new_lead: 0, total: 0 });

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (filter !== 'all') params.append('score', filter);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`/api/crm/leads?${params}`);
      const json = await res.json();

      if (json.success) {
        setLeads(json.data);
        setCounts(json.counts);
        setTotalPages(json.pagination.totalPages);
      }
    } catch (error) {
      console.error('[CRM] Erro ao buscar leads:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filter, searchTerm]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/stats');
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch (error) {
      console.error('[CRM] Erro ao buscar stats:', error);
    }
  }, []);

  const fetchLeadDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/crm/leads/${id}`);
      const json = await res.json();
      if (json.success) setSelectedLead(json.data);
    } catch (error) {
      console.error('[CRM] Erro ao buscar lead:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleReclassify = async () => {
    if (!selectedLead) return;
    setReclassifying(true);
    try {
      const res = await fetch(`/api/crm/leads/${selectedLead.id}/reclassify`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await fetchLeadDetail(selectedLead.id);
        await fetchLeads();
        await fetchStats();
      }
    } catch (error) {
      console.error('[CRM] Erro ao reclassificar:', error);
    } finally {
      setReclassifying(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, [fetchLeads, fetchStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchLeads();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="space-y-8">
      <Header title="CRM" subtitle="Leads LoopIA - Prospecção" />

      <div className="px-3 sm:px-4 lg:px-8 space-y-8">
        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="group relative overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-6 border border-primary/20 hover:border-primary/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary/20 rounded-xl">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
              <p className="text-4xl font-bold text-foreground mb-1">{stats?.total || 0}</p>
              <p className="text-sm text-muted">Total de Leads</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-2xl p-6 border border-green-500/20 hover:border-green-500/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <Zap className="h-6 w-6 text-green-400" />
                </div>
                <span className="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                  {stats && stats.total > 0 ? `${Math.round((stats.activated / stats.total) * 100)}%` : '0%'}
                </span>
              </div>
              <p className="text-4xl font-bold text-foreground mb-1">{stats?.activated || 0}</p>
              <p className="text-sm text-muted">Responderam</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 rounded-2xl p-6 border border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-500/20 rounded-xl">
                  <Calendar className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
              <p className="text-4xl font-bold text-foreground mb-1">{stats?.demoScheduled || 0}</p>
              <p className="text-sm text-muted">Demos Agendadas</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-2xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                </div>
              </div>
              <p className="text-4xl font-bold text-foreground mb-1">{stats?.recentToday || 0}</p>
              <p className="text-sm text-muted">Ativos Hoje</p>
            </div>
          </div>
        </div>

        {/* ── Filtros ── */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2 flex-wrap">
            {([
              { key: 'all' as ScoreFilter, label: 'Todos', count: counts.total },
              { key: 'qualified' as ScoreFilter, label: 'Qualificados', count: counts.qualified },
              { key: 'interested' as ScoreFilter, label: 'Interessados', count: counts.interested },
              { key: 'new_lead' as ScoreFilter, label: 'Novos', count: counts.new_lead },
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f.key
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-card border border-border text-foreground hover:bg-card-hover'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* ── Layout Principal: Lista + Detalhe ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: '600px' }}>
          {/* Lista de Leads */}
          <div className="lg:col-span-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="animate-spin text-primary" size={32} />
                </div>
              ) : leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted">
                  <Users size={48} className="mb-4 opacity-30" />
                  <p>Nenhum lead encontrado</p>
                </div>
              ) : (
                leads.map(lead => (
                  <div
                    key={lead.id}
                    onClick={() => fetchLeadDetail(lead.id)}
                    className={`p-4 border-b border-border cursor-pointer transition-all border-l-4 ${
                      scoreBorderColors[lead.score] || 'border-l-gray-500'
                    } ${
                      selectedLead?.id === lead.id
                        ? 'bg-gradient-to-r from-primary/20 to-transparent'
                        : 'hover:bg-card-hover'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          scoreColors[lead.score] || 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {(lead.name || lead.phone).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {lead.name || formatPhone(lead.phone)}
                          </p>
                          <p className="text-xs text-muted">{formatPhone(lead.phone)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted">{timeAgo(lead.lastMessageAt)}</span>
                        {lead.demoScheduled && (
                          <div className="mt-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">DEMO</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted truncate max-w-[60%]">
                        {lead.lastMessage || 'Sem mensagens'}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${scoreColors[lead.score]}`}>
                        {lead.scoreLabel.emoji} {lead.scoreLabel.label}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {totalPages > 1 && (
              <div className="p-3 border-t border-border flex items-center justify-between">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-card-hover disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-xs text-muted">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-card-hover disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Painel de Detalhe */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
            {!selectedLead ? (
              <div className="flex flex-col items-center justify-center h-full text-muted py-20">
                <MessageCircle size={64} className="mb-4 opacity-20" />
                <p className="text-lg">Selecione um lead</p>
                <p className="text-sm">Clique em um lead para ver a classificacao IA</p>
              </div>
            ) : loadingDetail ? (
              <div className="flex items-center justify-center h-full py-20">
                <Loader2 className="animate-spin text-primary" size={32} />
              </div>
            ) : (
              <>
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${
                        scoreColors[selectedLead.score] || 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {(selectedLead.name || selectedLead.phone).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-foreground">
                          {selectedLead.name || formatPhone(selectedLead.phone)}
                        </h2>
                        <div className="flex items-center gap-3 text-sm text-muted flex-wrap">
                          <span className="flex items-center gap-1">
                            <Phone size={14} />
                            {formatPhone(selectedLead.phone)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full border text-xs ${scoreColors[selectedLead.score]}`}>
                            {selectedLead.scoreLabel.emoji} {selectedLead.scoreLabel.label}
                          </span>
                          <span className="flex items-center gap-1 text-xs">
                            <Bot size={12} />
                            {selectedLead.agentId}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleReclassify}
                      disabled={reclassifying}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary text-white rounded-xl transition-all text-sm disabled:opacity-50"
                    >
                      {reclassifying ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <RefreshCw size={16} />
                      )}
                      Reclassificar IA
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                    <div className="bg-background rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{selectedLead.confidence}%</p>
                      <p className="text-xs text-muted">Confianca</p>
                    </div>
                    <div className="bg-background rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{selectedLead.messageCount}</p>
                      <p className="text-xs text-muted">Mensagens</p>
                    </div>
                    <div className="bg-background rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">
                        {selectedLead.demoScheduled ? 'Sim' : 'Nao'}
                      </p>
                      <p className="text-xs text-muted">Demo</p>
                    </div>
                    <div className="bg-background rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{selectedLead.followUpStep || 0}</p>
                      <p className="text-xs text-muted">Follow-ups</p>
                    </div>
                  </div>

                  {selectedLead.reasons?.length > 0 && (
                    <div className="mt-4 p-3 bg-background rounded-xl">
                      <p className="text-xs font-medium text-muted mb-2">Analise da IA:</p>
                      <ul className="space-y-1">
                        {selectedLead.reasons.map((r: string, i: number) => (
                          <li key={i} className="text-sm text-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                      {selectedLead.suggestedAction && (
                        <p className="mt-2 text-sm text-primary font-medium">
                          Acao sugerida: {selectedLead.suggestedAction}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-3" style={{ maxHeight: '500px' }}>
                  {selectedLead.messages?.map((msg: any, i: number) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'assistant' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                          msg.role === 'assistant'
                            ? 'bg-primary/20 text-foreground rounded-br-md'
                            : 'bg-background border border-border text-foreground rounded-bl-md'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
