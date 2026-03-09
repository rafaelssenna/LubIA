'use client';

import Header from '@/components/Header';
import { useToast } from '@/components/Toast';
import {
  FileText,
  Search,
  Download,
  XCircle,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  Ban,
  Clock,
  Filter,
  RefreshCw,
  Hash,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Code } from 'lucide-react';

interface NotaFiscal {
  id: number;
  numero: number;
  serie: number;
  chaveAcesso: string | null;
  protocolo: string | null;
  status: 'PENDENTE' | 'AUTORIZADA' | 'REJEITADA' | 'CANCELADA' | 'INUTILIZADA';
  valorTotal: string;
  valorProdutos: string;
  valorServicos: string | null;
  motivoCancelamento: string | null;
  createdAt: string;
  ordemServicoId: number | null;
  vendaRapidaId: number | null;
  ordemServico?: {
    numero: string;
    veiculo?: {
      cliente?: { nome: string };
    };
  };
  vendaRapida?: {
    numero: string;
    nomeCliente: string | null;
  };
}

interface Stats {
  total: number;
  autorizadas: number;
  canceladas: number;
  rejeitadas: number;
  valorTotal: number;
}

export default function NotasFiscaisPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, autorizadas: 0, canceladas: 0, rejeitadas: 0, valorTotal: 0 });
  const [filtroStatus, setFiltroStatus] = useState('all');
  const [filtroPeriodo, setFiltroPeriodo] = useState('30d');
  const [filtroTipo, setFiltroTipo] = useState('all');
  const [selectedNota, setSelectedNota] = useState<NotaFiscal | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [notaParaCancelar, setNotaParaCancelar] = useState<NotaFiscal | null>(null);

  // Inutilização
  const [showInutilizarModal, setShowInutilizarModal] = useState(false);
  const [inutNumInicial, setInutNumInicial] = useState('');
  const [inutNumFinal, setInutNumFinal] = useState('');
  const [inutMotivo, setInutMotivo] = useState('');
  const [inutilizando, setInutilizando] = useState(false);

  // Consulta
  const [consultando, setConsultando] = useState<number | null>(null);

  // Bloqueio em desenvolvimento
  const [nfeDesbloqueado, setNfeDesbloqueado] = useState(false);
  const [nfeSenhaInput, setNfeSenhaInput] = useState('');

  const fetchNotas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroStatus !== 'all') params.set('status', filtroStatus);
      if (filtroPeriodo !== 'all') params.set('periodo', filtroPeriodo);
      if (filtroTipo !== 'all') params.set('tipo', filtroTipo);

      const res = await fetch(`/api/nfe?${params}`);
      const data = await res.json();
      if (data.data) setNotas(data.data);
      if (data.stats) setStats(data.stats);
    } catch {
      toast.error('Erro ao carregar notas fiscais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotas();
  }, [filtroStatus, filtroPeriodo, filtroTipo]);

  const handleCancelar = async () => {
    if (!notaParaCancelar) return;
    if (motivoCancelamento.length < 15) {
      toast.error('Motivo deve ter no mínimo 15 caracteres');
      return;
    }

    setCancelando(true);
    try {
      const res = await fetch(`/api/nfe/cancelar/${notaParaCancelar.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoCancelamento }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('NF-e cancelada com sucesso!');
        setShowCancelModal(false);
        setNotaParaCancelar(null);
        setMotivoCancelamento('');
        fetchNotas();
      } else {
        toast.error(data.error || 'Erro ao cancelar NF-e');
      }
    } catch {
      toast.error('Erro ao cancelar NF-e');
    } finally {
      setCancelando(false);
    }
  };

  const handleInutilizar = async () => {
    const numIni = parseInt(inutNumInicial);
    const numFin = parseInt(inutNumFinal);

    if (!numIni || !numFin || numIni > numFin) {
      toast.error('Número inicial deve ser menor ou igual ao final');
      return;
    }
    if (inutMotivo.length < 15) {
      toast.error('Motivo deve ter no mínimo 15 caracteres');
      return;
    }

    setInutilizando(true);
    try {
      const res = await fetch('/api/nfe/inutilizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeroInicial: numIni,
          numeroFinal: numFin,
          motivo: inutMotivo,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Numeração inutilizada com sucesso!');
        setShowInutilizarModal(false);
        setInutNumInicial('');
        setInutNumFinal('');
        setInutMotivo('');
        fetchNotas();
      } else {
        toast.error(data.error || 'Erro ao inutilizar numeração');
      }
    } catch {
      toast.error('Erro ao inutilizar numeração');
    } finally {
      setInutilizando(false);
    }
  };

  const handleConsultar = async (nota: NotaFiscal) => {
    setConsultando(nota.id);
    try {
      const res = await fetch(`/api/nfe/consultar/${nota.id}`, { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Status: ${data.data.motivo}`);
      } else {
        toast.error(data.error || 'Erro ao consultar NF-e');
      }
    } catch {
      toast.error('Erro ao consultar NF-e');
    } finally {
      setConsultando(null);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; icon: any; label: string }> = {
      AUTORIZADA: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: CheckCircle, label: 'Autorizada' },
      REJEITADA: { color: 'bg-red-500/10 text-red-400 border-red-500/30', icon: XCircle, label: 'Rejeitada' },
      CANCELADA: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: Ban, label: 'Cancelada' },
      INUTILIZADA: { color: 'bg-gray-500/10 text-gray-400 border-gray-500/30', icon: Ban, label: 'Inutilizada' },
      PENDENTE: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: Clock, label: 'Pendente' },
    };
    const s = map[status] || map.PENDENTE;
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${s.color}`}>
        <Icon size={12} />
        {s.label}
      </span>
    );
  };

  const getClienteNome = (nota: NotaFiscal) => {
    if (nota.ordemServico?.veiculo?.cliente?.nome) return nota.ordemServico.veiculo.cliente.nome;
    if (nota.vendaRapida?.nomeCliente) return nota.vendaRapida.nomeCliente;
    return 'Consumidor Final';
  };

  const getTipoOrigem = (nota: NotaFiscal) => {
    if (nota.ordemServicoId) return `OS ${nota.ordemServico?.numero || ''}`;
    if (nota.vendaRapidaId) return `VR ${nota.vendaRapida?.numero || ''}`;
    return '-';
  };

  if (!nfeDesbloqueado) {
    return (
      <>
        <Header title="Notas Fiscais" subtitle="Gestao de NF-e emitidas" />
        <div className="px-3 sm:px-4 lg:px-8 flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-4 bg-amber-500/10 rounded-full border border-amber-500/20">
              <Code size={32} className="text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Em Desenvolvimento</h3>
            <p className="text-sm text-muted max-w-sm">
              O modulo de Nota Fiscal Eletronica esta em fase de desenvolvimento e sera liberado em breve.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="password"
                value={nfeSenhaInput}
                onChange={(e) => setNfeSenhaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nfeSenhaInput === 'helsen2026') {
                    setNfeDesbloqueado(true);
                    setNfeSenhaInput('');
                  }
                }}
                placeholder="Senha de acesso"
                className="px-4 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm placeholder-muted focus:outline-none focus:ring-2 focus:ring-amber-500/50 w-48"
              />
              <button
                onClick={() => {
                  if (nfeSenhaInput === 'helsen2026') {
                    setNfeDesbloqueado(true);
                    setNfeSenhaInput('');
                  } else {
                    toast.error('Senha incorreta');
                  }
                }}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Desbloquear
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Notas Fiscais" subtitle="Gestão de NF-e emitidas" />

      <div className="px-3 sm:px-4 lg:px-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted">Total Emitidas</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted">Autorizadas</p>
            <p className="text-2xl font-bold text-emerald-400">{stats.autorizadas}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted">Canceladas</p>
            <p className="text-2xl font-bold text-amber-400">{stats.canceladas}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted">Valor Total</p>
            <p className="text-2xl font-bold text-foreground">
              R$ {stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Filtros + Botão Inutilizar */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter size={16} className="text-muted" />
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
            >
              <option value="all">Todos os Status</option>
              <option value="AUTORIZADA">Autorizadas</option>
              <option value="REJEITADA">Rejeitadas</option>
              <option value="CANCELADA">Canceladas</option>
              <option value="INUTILIZADA">Inutilizadas</option>
            </select>
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="all">Todo período</option>
            </select>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
            >
              <option value="all">Todos os Tipos</option>
              <option value="os">Ordem de Serviço</option>
              <option value="venda">Venda Rápida</option>
            </select>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setShowInutilizarModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-500/10 border border-gray-500/30 rounded-lg text-sm text-gray-400 hover:bg-gray-500/20 transition-colors"
                title="Inutilizar numeração"
              >
                <Hash size={14} />
                <span className="hidden sm:inline">Inutilizar</span>
              </button>
              <button
                onClick={fetchNotas}
                className="p-2 text-muted hover:text-foreground transition-colors"
                title="Atualizar"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : notas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted">
              <FileText size={48} className="mb-3 opacity-30" />
              <p className="text-lg font-medium">Nenhuma nota fiscal encontrada</p>
              <p className="text-sm">As NF-e emitidas aparecerão aqui</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted px-4 py-3">Número</th>
                      <th className="text-left text-xs font-medium text-muted px-4 py-3">Cliente</th>
                      <th className="text-left text-xs font-medium text-muted px-4 py-3">Origem</th>
                      <th className="text-left text-xs font-medium text-muted px-4 py-3">Valor</th>
                      <th className="text-left text-xs font-medium text-muted px-4 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-muted px-4 py-3">Data</th>
                      <th className="text-right text-xs font-medium text-muted px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {notas.map((nota) => (
                      <tr key={nota.id} className="hover:bg-card-hover transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium text-foreground">
                            {String(nota.numero).padStart(6, '0')}
                          </span>
                          <span className="text-xs text-muted ml-1">/{nota.serie}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{getClienteNome(nota)}</td>
                        <td className="px-4 py-3 text-sm text-muted">{getTipoOrigem(nota)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          R$ {Number(nota.valorTotal).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">{statusBadge(nota.status)}</td>
                        <td className="px-4 py-3 text-sm text-muted">
                          {new Date(nota.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSelectedNota(nota)}
                              className="p-2 text-muted hover:text-foreground hover:bg-card-hover rounded-lg transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye size={16} />
                            </button>
                            {nota.status === 'AUTORIZADA' && (
                              <>
                                <a
                                  href={`/api/nfe/danfe/${nota.id}`}
                                  target="_blank"
                                  rel="noopener"
                                  className="p-2 text-muted hover:text-foreground hover:bg-card-hover rounded-lg transition-colors"
                                  title="Baixar DANFE"
                                >
                                  <Download size={16} />
                                </a>
                                <button
                                  onClick={() => handleConsultar(nota)}
                                  disabled={consultando === nota.id}
                                  className="p-2 text-muted hover:text-blue-400 hover:bg-card-hover rounded-lg transition-colors disabled:opacity-50"
                                  title="Consultar na SEFAZ"
                                >
                                  {consultando === nota.id ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                </button>
                                <button
                                  onClick={() => {
                                    setNotaParaCancelar(nota);
                                    setShowCancelModal(true);
                                  }}
                                  className="p-2 text-muted hover:text-red-400 hover:bg-card-hover rounded-lg transition-colors"
                                  title="Cancelar NF-e"
                                >
                                  <Ban size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-border">
                {notas.map((nota) => (
                  <div key={nota.id} className="p-4 hover:bg-card-hover transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-medium text-foreground">
                        NF-e {String(nota.numero).padStart(6, '0')}/{nota.serie}
                      </span>
                      {statusBadge(nota.status)}
                    </div>
                    <div className="text-sm text-muted space-y-1">
                      <p>{getClienteNome(nota)} - {getTipoOrigem(nota)}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">R$ {Number(nota.valorTotal).toFixed(2)}</span>
                        <span>{new Date(nota.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => setSelectedNota(nota)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:bg-card-hover transition-colors"
                      >
                        <Eye size={14} /> Detalhes
                      </button>
                      {nota.status === 'AUTORIZADA' && (
                        <>
                          <a
                            href={`/api/nfe/danfe/${nota.id}`}
                            target="_blank"
                            rel="noopener"
                            className="flex items-center justify-center gap-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:bg-card-hover transition-colors"
                          >
                            <Download size={14} /> DANFE
                          </a>
                          <button
                            onClick={() => {
                              setNotaParaCancelar(nota);
                              setShowCancelModal(true);
                            }}
                            className="flex items-center justify-center gap-1 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            <Ban size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Detalhes */}
      {selectedNota && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedNota(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                NF-e {String(selectedNota.numero).padStart(6, '0')}/{selectedNota.serie}
              </h2>
              {statusBadge(selectedNota.status)}
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted">Cliente</p>
                  <p className="text-sm font-medium text-foreground">{getClienteNome(selectedNota)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Origem</p>
                  <p className="text-sm font-medium text-foreground">{getTipoOrigem(selectedNota)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Valor Total</p>
                  <p className="text-sm font-medium text-foreground">R$ {Number(selectedNota.valorTotal).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Data</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(selectedNota.createdAt).toLocaleDateString('pt-BR')} {new Date(selectedNota.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {selectedNota.chaveAcesso && (
                <div>
                  <p className="text-xs text-muted mb-1">Chave de Acesso</p>
                  <p className="text-xs font-mono text-foreground bg-background p-2 rounded-lg break-all">
                    {selectedNota.chaveAcesso}
                  </p>
                </div>
              )}

              {selectedNota.protocolo && (
                <div>
                  <p className="text-xs text-muted mb-1">Protocolo</p>
                  <p className="text-sm font-mono text-foreground">{selectedNota.protocolo}</p>
                </div>
              )}

              {selectedNota.motivoCancelamento && (
                <div>
                  <p className="text-xs text-muted mb-1">Motivo</p>
                  <p className="text-sm text-red-400">{selectedNota.motivoCancelamento}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 justify-end pt-2">
                {selectedNota.status === 'AUTORIZADA' && (
                  <>
                    <a
                      href={`/api/nfe/danfe/${selectedNota.id}`}
                      target="_blank"
                      rel="noopener"
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-sm text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                      <Download size={14} /> DANFE
                    </a>
                    <button
                      onClick={() => handleConsultar(selectedNota)}
                      disabled={consultando === selectedNota.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                    >
                      {consultando === selectedNota.id ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                      Consultar
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedNota(null)}
                  className="px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:bg-card-hover transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelamento */}
      {showCancelModal && notaParaCancelar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setShowCancelModal(false); setNotaParaCancelar(null); }}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Cancelar NF-e</h2>
              <p className="text-sm text-muted">
                NF-e {String(notaParaCancelar.numero).padStart(6, '0')} - R$ {Number(notaParaCancelar.valorTotal).toFixed(2)}
              </p>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Motivo do cancelamento (mínimo 15 caracteres)
                </label>
                <textarea
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  placeholder="Informe o motivo do cancelamento..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:border-primary resize-none"
                />
                <p className="text-xs text-muted mt-1">{motivoCancelamento.length}/15 caracteres mínimos</p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setShowCancelModal(false); setNotaParaCancelar(null); setMotivoCancelamento(''); }}
                  className="px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:bg-card-hover transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleCancelar}
                  disabled={cancelando || motivoCancelamento.length < 15}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {cancelando ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                  {cancelando ? 'Cancelando...' : 'Confirmar Cancelamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inutilização */}
      {showInutilizarModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowInutilizarModal(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Inutilizar Numeração</h2>
              <p className="text-sm text-muted">
                Inutilize faixas de numeração que não serão utilizadas
              </p>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Número Inicial</label>
                  <input
                    type="number"
                    value={inutNumInicial}
                    onChange={(e) => setInutNumInicial(e.target.value)}
                    placeholder="1"
                    min={1}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Número Final</label>
                  <input
                    type="number"
                    value={inutNumFinal}
                    onChange={(e) => setInutNumFinal(e.target.value)}
                    placeholder="10"
                    min={1}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Motivo (mínimo 15 caracteres)
                </label>
                <textarea
                  value={inutMotivo}
                  onChange={(e) => setInutMotivo(e.target.value)}
                  placeholder="Informe o motivo da inutilização..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:border-primary resize-none"
                />
                <p className="text-xs text-muted mt-1">{inutMotivo.length}/15 caracteres mínimos</p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setShowInutilizarModal(false); setInutNumInicial(''); setInutNumFinal(''); setInutMotivo(''); }}
                  className="px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:bg-card-hover transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleInutilizar}
                  disabled={inutilizando || inutMotivo.length < 15 || !inutNumInicial || !inutNumFinal}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {inutilizando ? <Loader2 size={16} className="animate-spin" /> : <Hash size={16} />}
                  {inutilizando ? 'Inutilizando...' : 'Confirmar Inutilização'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
