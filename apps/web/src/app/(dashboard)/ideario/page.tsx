'use client';

import Header from '@/components/Header';
import StarRating from '@/components/StarRating';
import {
  Lightbulb, Search, Plus, X, Loader2, Filter,
  CheckCircle, Clock, Code, Archive, Sparkles, User
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';

// Tipos
interface Ideia {
  id: number;
  titulo: string;
  descricao: string;
  categoria: string;
  impacto: string;
  status: string;
  notaMedia: number | null;
  totalAvaliacoes: number;
  autor: string;
  autorId: number;
  createdAt: string;
}

interface Stats {
  todas: number;
  minhas: number;
  aprovadas: number;
  implementadas: number;
}

// Constantes
const CATEGORIAS = [
  { value: 'FUNCIONALIDADE', label: 'Funcionalidade', cor: 'purple' },
  { value: 'MELHORIA', label: 'Melhoria', cor: 'blue' },
  { value: 'CORRECAO', label: 'Correção', cor: 'red' },
  { value: 'INTEGRACAO', label: 'Integração', cor: 'cyan' },
  { value: 'INTERFACE', label: 'Interface', cor: 'pink' },
  { value: 'OUTRO', label: 'Outro', cor: 'zinc' },
];

const STATUS = [
  { value: 'SUGERIDA', label: 'Sugerida', cor: 'zinc', icon: Lightbulb },
  { value: 'EM_AVALIACAO', label: 'Em Avaliação', cor: 'amber', icon: Clock },
  { value: 'APROVADA', label: 'Aprovada', cor: 'emerald', icon: CheckCircle },
  { value: 'EM_DESENVOLVIMENTO', label: 'Em Desenvolvimento', cor: 'blue', icon: Code },
  { value: 'IMPLEMENTADA', label: 'Implementada', cor: 'green', icon: Sparkles },
  { value: 'ARQUIVADA', label: 'Arquivada', cor: 'gray', icon: Archive },
];

const IMPACTOS = [
  { value: 'BAIXO', label: 'Baixo' },
  { value: 'MEDIO', label: 'Médio' },
  { value: 'ALTO', label: 'Alto' },
  { value: 'CRITICO', label: 'Crítico' },
];

// Helpers
const getCategoriaInfo = (cat: string) => CATEGORIAS.find((c) => c.value === cat) || CATEGORIAS[5];
const getStatusInfo = (st: string) => STATUS.find((s) => s.value === st) || STATUS[0];

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('pt-BR');
};

export default function IdearioPage() {
  const toast = useToast();

  // Estado
  const [ideias, setIdeias] = useState<Ideia[]>([]);
  const [stats, setStats] = useState<Stats>({ todas: 0, minhas: 0, aprovadas: 0, implementadas: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [minhaIdeia, setMinhaIdeia] = useState(false);

  // Modais
  const [showNovaIdeia, setShowNovaIdeia] = useState(false);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [selectedIdeia, setSelectedIdeia] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);

  // Form nova ideia
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formCategoria, setFormCategoria] = useState('FUNCIONALIDADE');
  const [formImpacto, setFormImpacto] = useState('MEDIO');

  // Avaliação
  const [notaAvaliacao, setNotaAvaliacao] = useState(0);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState('');
  const [savingAvaliacao, setSavingAvaliacao] = useState(false);

  // Fetch ideias
  const fetchIdeias = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroStatus !== 'todos') params.append('status', filtroStatus);
      if (filtroCategoria !== 'todos') params.append('categoria', filtroCategoria);
      if (minhaIdeia) params.append('minhaIdeia', 'true');
      if (searchTerm) params.append('busca', searchTerm);

      const res = await fetch(`/api/ideario?${params.toString()}`);
      const data = await res.json();
      setIdeias(data.data || []);
      setStats(data.stats || { todas: 0, minhas: 0, aprovadas: 0, implementadas: 0 });
    } catch (error) {
      console.error('Erro ao buscar ideias:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdeias();
  }, [filtroStatus, filtroCategoria, minhaIdeia, searchTerm]);

  // Criar ideia
  const handleCriarIdeia = async () => {
    if (!formTitulo.trim() || !formDescricao.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/ideario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: formTitulo,
          descricao: formDescricao,
          categoria: formCategoria,
          impacto: formImpacto,
        }),
      });

      if (res.ok) {
        toast.success('Ideia enviada com sucesso!');
        setShowNovaIdeia(false);
        setFormTitulo('');
        setFormDescricao('');
        setFormCategoria('FUNCIONALIDADE');
        setFormImpacto('MEDIO');
        fetchIdeias();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao criar ideia');
      }
    } catch (error) {
      toast.error('Erro ao criar ideia');
    } finally {
      setSaving(false);
    }
  };

  // Ver detalhes
  const handleVerDetalhes = async (ideia: Ideia) => {
    setLoadingDetalhes(true);
    setShowDetalhes(true);
    setSelectedIdeia(null);

    try {
      const res = await fetch(`/api/ideario/${ideia.id}`);
      const data = await res.json();
      setSelectedIdeia(data.data);

      // Se já avaliou, preencher nota
      if (data.data?.minhaAvaliacao) {
        setNotaAvaliacao(data.data.minhaAvaliacao.nota);
        setComentarioAvaliacao(data.data.minhaAvaliacao.comentario || '');
      } else {
        setNotaAvaliacao(0);
        setComentarioAvaliacao('');
      }
    } catch (error) {
      toast.error('Erro ao carregar detalhes');
      setShowDetalhes(false);
    } finally {
      setLoadingDetalhes(false);
    }
  };

  // Avaliar
  const handleAvaliar = async () => {
    if (notaAvaliacao < 1) {
      toast.error('Selecione uma nota');
      return;
    }

    setSavingAvaliacao(true);
    try {
      const res = await fetch(`/api/ideario/${selectedIdeia.id}/avaliar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nota: notaAvaliacao,
          comentario: comentarioAvaliacao,
        }),
      });

      if (res.ok) {
        toast.success('Avaliação registrada!');
        // Atualizar detalhes
        handleVerDetalhes(selectedIdeia);
        fetchIdeias();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao avaliar');
      }
    } catch (error) {
      toast.error('Erro ao avaliar');
    } finally {
      setSavingAvaliacao(false);
    }
  };

  // Mudar status
  const handleMudarStatus = async (novoStatus: string) => {
    try {
      const res = await fetch(`/api/ideario/${selectedIdeia.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      });

      if (res.ok) {
        toast.success('Status atualizado!');
        handleVerDetalhes(selectedIdeia);
        fetchIdeias();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao atualizar status');
      }
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Ideário" subtitle="Compartilhe suas ideias e sugestões" />
      <main className="p-6">
        <div className="max-w-7xl mx-auto">

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-4">
              <p className="text-sm text-purple-400/70">Total</p>
              <p className="text-2xl font-bold text-purple-400">{stats.todas}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-4">
              <p className="text-sm text-blue-400/70">Minhas</p>
              <p className="text-2xl font-bold text-blue-400">{stats.minhas}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-4">
              <p className="text-sm text-emerald-400/70">Aprovadas</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.aprovadas}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-4">
              <p className="text-sm text-amber-400/70">Implementadas</p>
              <p className="text-2xl font-bold text-amber-400">{stats.implementadas}</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Busca */}
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar ideias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-card rounded-xl border border-border text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/50"
              />
            </div>

            {/* Status */}
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-4 py-3 bg-card rounded-xl border border-border text-foreground focus:outline-none focus:border-purple-500/50"
            >
              <option value="todos">Todos os Status</option>
              {STATUS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* Categoria */}
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="px-4 py-3 bg-card rounded-xl border border-border text-foreground focus:outline-none focus:border-purple-500/50"
            >
              <option value="todos">Todas as Categorias</option>
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            {/* Minhas ideias */}
            <button
              onClick={() => setMinhaIdeia(!minhaIdeia)}
              className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 ${
                minhaIdeia
                  ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                  : 'bg-card border-border text-muted hover:border-purple-500/50'
              }`}
            >
              <User size={18} />
              Minhas
            </button>

            {/* Nova ideia */}
            <button
              onClick={() => setShowNovaIdeia(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-700 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              Nova Ideia
            </button>
          </div>

          {/* Lista de ideias */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="text-purple-500 animate-spin" />
            </div>
          ) : ideias.length === 0 ? (
            <div className="text-center py-20">
              <Lightbulb size={48} className="text-purple-500/50 mx-auto mb-4" />
              <p className="text-foreground text-lg font-medium">Nenhuma ideia encontrada</p>
              <p className="text-muted">Seja o primeiro a compartilhar uma ideia!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {ideias.map((ideia) => {
                const catInfo = getCategoriaInfo(ideia.categoria);
                const statusInfo = getStatusInfo(ideia.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={ideia.id}
                    onClick={() => handleVerDetalhes(ideia)}
                    className="bg-card border border-border rounded-xl p-5 hover:border-purple-500/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Título */}
                        <h3 className="text-foreground font-medium text-lg group-hover:text-purple-400 transition-colors truncate">
                          {ideia.titulo}
                        </h3>

                        {/* Descrição */}
                        <p className="text-muted text-sm mt-1 line-clamp-2">
                          {ideia.descricao}
                        </p>

                        {/* Badges e info */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {/* Categoria */}
                          <span className={`text-xs px-2 py-1 rounded-full bg-${catInfo.cor}-500/20 text-${catInfo.cor}-400`}>
                            {catInfo.label}
                          </span>

                          {/* Status */}
                          <span className={`text-xs px-2 py-1 rounded-full bg-${statusInfo.cor}-500/20 text-${statusInfo.cor}-400 flex items-center gap-1`}>
                            <StatusIcon size={12} />
                            {statusInfo.label}
                          </span>

                          {/* Autor e data */}
                          <span className="text-xs text-muted">
                            por {ideia.autor} em {formatDate(ideia.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Nota */}
                      <div className="flex flex-col items-end">
                        {ideia.notaMedia !== null ? (
                          <>
                            <StarRating value={ideia.notaMedia} readonly size="sm" />
                            <span className="text-xs text-muted mt-1">
                              {ideia.totalAvaliacoes} {ideia.totalAvaliacoes === 1 ? 'avaliação' : 'avaliações'}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted">Sem avaliação</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal Nova Ideia */}
      {showNovaIdeia && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl shadow-black/50">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Nova Ideia</h2>
              <button
                onClick={() => setShowNovaIdeia(false)}
                className="p-2 text-muted hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Título */}
              <div>
                <label className="block text-sm text-muted mb-2">Título *</label>
                <input
                  type="text"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="Título da sua ideia"
                  maxLength={200}
                  className="w-full px-4 py-3 bg-background rounded-xl border border-border text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm text-muted mb-2">Descrição *</label>
                <textarea
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Descreva sua ideia em detalhes..."
                  rows={4}
                  className="w-full px-4 py-3 bg-background rounded-xl border border-border text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/50 resize-none"
                />
              </div>

              {/* Categoria e Impacto */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-2">Categoria *</label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value)}
                    className="w-full px-4 py-3 bg-background rounded-xl border border-border text-foreground focus:outline-none focus:border-purple-500/50"
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">Impacto</label>
                  <select
                    value={formImpacto}
                    onChange={(e) => setFormImpacto(e.target.value)}
                    className="w-full px-4 py-3 bg-background rounded-xl border border-border text-foreground focus:outline-none focus:border-purple-500/50"
                  >
                    {IMPACTOS.map((i) => (
                      <option key={i.value} value={i.value}>{i.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <button
                onClick={() => setShowNovaIdeia(false)}
                className="px-6 py-3 border border-border rounded-xl text-muted hover:bg-zinc-800 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleCriarIdeia}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-700 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Lightbulb size={18} />}
                Enviar Ideia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {showDetalhes && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl shadow-black/50 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <h2 className="text-xl font-semibold text-foreground">Detalhes da Ideia</h2>
              <button
                onClick={() => {
                  setShowDetalhes(false);
                  setSelectedIdeia(null);
                }}
                className="p-2 text-muted hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {loadingDetalhes ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 size={32} className="text-purple-500 animate-spin" />
              </div>
            ) : selectedIdeia && (
              <div className="p-6 space-y-6">
                {/* Info básica */}
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{selectedIdeia.titulo}</h3>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className={`text-xs px-2 py-1 rounded-full bg-${getCategoriaInfo(selectedIdeia.categoria).cor}-500/20 text-${getCategoriaInfo(selectedIdeia.categoria).cor}-400`}>
                      {getCategoriaInfo(selectedIdeia.categoria).label}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full bg-${getStatusInfo(selectedIdeia.status).cor}-500/20 text-${getStatusInfo(selectedIdeia.status).cor}-400`}>
                      {getStatusInfo(selectedIdeia.status).label}
                    </span>
                    <span className="text-xs text-muted">
                      Impacto: {IMPACTOS.find((i) => i.value === selectedIdeia.impacto)?.label}
                    </span>
                  </div>
                  <p className="text-muted whitespace-pre-wrap">{selectedIdeia.descricao}</p>
                </div>

                {/* Autor e data */}
                <div className="flex items-center justify-between text-sm text-muted border-t border-border pt-4">
                  <span>por {selectedIdeia.autor}</span>
                  <span>{formatDate(selectedIdeia.createdAt)}</span>
                </div>

                {/* Nota atual */}
                {selectedIdeia.notaMedia !== null && (
                  <div className="bg-background rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Nota média:</span>
                      <div className="flex items-center gap-2">
                        <StarRating value={selectedIdeia.notaMedia} readonly />
                        <span className="text-amber-400 font-medium">{selectedIdeia.notaMedia.toFixed(1)}</span>
                        <span className="text-muted text-sm">({selectedIdeia.totalAvaliacoes})</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Seção de avaliação (apenas interno) */}
                {selectedIdeia.isInternal && (
                  <div className="border-t border-border pt-6">
                    <h4 className="text-foreground font-medium mb-4">Sua Avaliação</h4>
                    <div className="bg-background rounded-xl p-4 space-y-4">
                      <div>
                        <label className="block text-sm text-muted mb-2">Nota</label>
                        <StarRating value={notaAvaliacao} onChange={setNotaAvaliacao} size="lg" />
                      </div>
                      <div>
                        <label className="block text-sm text-muted mb-2">Comentário (opcional)</label>
                        <textarea
                          value={comentarioAvaliacao}
                          onChange={(e) => setComentarioAvaliacao(e.target.value)}
                          placeholder="Deixe um comentário..."
                          rows={2}
                          className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/50 resize-none"
                        />
                      </div>
                      <button
                        onClick={handleAvaliar}
                        disabled={savingAvaliacao || notaAvaliacao < 1}
                        className="px-4 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl hover:bg-amber-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {savingAvaliacao && <Loader2 size={16} className="animate-spin" />}
                        {selectedIdeia.minhaAvaliacao ? 'Atualizar Avaliação' : 'Avaliar'}
                      </button>
                    </div>

                    {/* Mudar status */}
                    <div className="mt-4">
                      <label className="block text-sm text-muted mb-2">Alterar Status</label>
                      <div className="flex flex-wrap gap-2">
                        {STATUS.map((s) => (
                          <button
                            key={s.value}
                            onClick={() => handleMudarStatus(s.value)}
                            disabled={selectedIdeia.status === s.value}
                            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                              selectedIdeia.status === s.value
                                ? `bg-${s.cor}-500/30 text-${s.cor}-400 border border-${s.cor}-500`
                                : `bg-${s.cor}-500/10 text-${s.cor}-400 hover:bg-${s.cor}-500/20`
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Avaliações anteriores */}
                    {selectedIdeia.avaliacoes && selectedIdeia.avaliacoes.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-foreground font-medium mb-3">Avaliações ({selectedIdeia.avaliacoes.length})</h4>
                        <div className="space-y-3">
                          {selectedIdeia.avaliacoes.map((av: any) => (
                            <div key={av.id} className="bg-background rounded-xl p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-foreground">{av.avaliador}</span>
                                <StarRating value={av.nota} readonly size="sm" />
                              </div>
                              {av.comentario && (
                                <p className="text-sm text-muted">{av.comentario}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
