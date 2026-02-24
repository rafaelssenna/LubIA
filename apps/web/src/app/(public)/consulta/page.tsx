'use client';

import { useState, useEffect } from 'react';
import { Search, Car, Calendar, Clock, CheckCircle, Play, Pause, XCircle, Truck, Loader2, AlertCircle, Wrench, Gauge, Droplets, CircleDot, Filter } from 'lucide-react';

interface Veiculo {
  placa: string;
  marca: string;
  modelo: string;
  ano: number | null;
  kmAtual: number | null;
}

interface Ordem {
  numero: string;
  status: string;
  dataAgendada: string | null;
  dataInicio: string | null;
  dataConclusao: string | null;
  createdAt: string;
  servicos: string[];
}

interface ServicoManutencao {
  data: string | null;
  km: number | null;
}

interface ProximaManutencao {
  km: number;
  kmFaltando: number;
}

interface Manutencao {
  ultimaTrocaOleo: ServicoManutencao | null;
  proximaTrocaOleo: ProximaManutencao;
  ultimoAlinhamento: ServicoManutencao | null;
  proximoAlinhamento: ProximaManutencao;
  ultimaTrocaFiltros: ServicoManutencao | null;
  proximaTrocaFiltros: ProximaManutencao;
}

interface ConsultaResult {
  veiculo: Veiculo;
  ordens: Ordem[];
  manutencao: Manutencao;
}

const statusConfig: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  AGENDADO: { label: 'Agendado', color: 'text-blue-400', icon: Calendar, bg: 'bg-blue-500/10' },
  AGUARDANDO_PECAS: { label: 'Aguardando Peças', color: 'text-amber-400', icon: Pause, bg: 'bg-amber-500/10' },
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'text-purple-400', icon: Play, bg: 'bg-purple-500/10' },
  CONCLUIDO: { label: 'Concluído', color: 'text-primary', icon: CheckCircle, bg: 'bg-green-500/10' },
  CANCELADO: { label: 'Cancelado', color: 'text-red-500', icon: XCircle, bg: 'bg-red-500/10' },
  ENTREGUE: { label: 'Entregue', color: 'text-cyan-400', icon: Truck, bg: 'bg-cyan-500/10' },
};


export default function ConsultaPage() {
  const [placa, setPlaca] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsultaResult | null>(null);
  const [error, setError] = useState('');
  const [kmInput, setKmInput] = useState('');
  const [kmLoading, setKmLoading] = useState(false);
  const [kmError, setKmError] = useState('');
  const [kmSuccess, setKmSuccess] = useState('');

  const formatPlaca = (value: string) => {
    const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (clean.length <= 3) return clean;
    if (clean.length <= 7) {
      // Detecta se é Mercosul (5º caractere é letra) ou antiga (5º é número)
      const isMercosul = clean.length >= 5 && /[A-Z]/.test(clean[4]);
      if (isMercosul) {
        return clean; // Mercosul: ABC1D23 (sem hífen)
      }
      return clean.slice(0, 3) + '-' + clean.slice(3); // Antiga: ABC-1234
    }
    // Se passou de 7, limita e formata
    const limited = clean.slice(0, 7);
    const isMercosul = /[A-Z]/.test(limited[4]);
    if (isMercosul) return limited;
    return limited.slice(0, 3) + '-' + limited.slice(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placa.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/public/consulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao consultar');
        return;
      }

      setResult(data);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Update kmInput when result changes
  useEffect(() => {
    if (result?.veiculo?.kmAtual) {
      setKmInput(result.veiculo.kmAtual.toString());
    }
  }, [result?.veiculo?.kmAtual]);

  const formatKmInput = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    // Limit to 6 digits
    return digits.slice(0, 6);
  };

  const handleUpdateKm = async () => {
    if (!result?.veiculo?.placa || !kmInput) return;

    const km = parseInt(kmInput, 10);
    if (isNaN(km) || km <= 0) {
      setKmError('KM inválido');
      return;
    }

    setKmLoading(true);
    setKmError('');
    setKmSuccess('');

    try {
      const res = await fetch('/api/public/atualizar-km', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa: result.veiculo.placa, km }),
      });

      const data = await res.json();

      if (!res.ok) {
        setKmError(data.error || 'Erro ao atualizar KM');
        return;
      }

      // Update local state with new data
      setResult((prev) => prev ? {
        ...prev,
        veiculo: { ...prev.veiculo, kmAtual: km },
        manutencao: data.manutencao,
      } : prev);
      setKmSuccess('KM atualizado com sucesso!');

      // Clear success message after 3 seconds
      setTimeout(() => setKmSuccess(''), 3000);
    } catch {
      setKmError('Erro de conexão. Tente novamente.');
    } finally {
      setKmLoading(false);
    }
  };

  // Encontrar ordem ativa (não entregue/cancelada) para destacar no histórico
  const ordemAtiva = result?.ordens.find(o =>
    !['ENTREGUE', 'CANCELADO'].includes(o.status)
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Titulo */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Consulte o status do seu veículo
        </h1>
        <p className="text-muted">
          Digite a placa para ver o histórico de serviços
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
            <input
              type="text"
              value={placa}
              onChange={(e) => setPlaca(formatPlaca(e.target.value))}
              placeholder="ABC1D23 ou ABC-1234"
              maxLength={8}
              className="w-full bg-card border border-border rounded-xl pl-12 pr-4 py-4 text-lg text-foreground placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all uppercase tracking-wider font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading || placa.length < 7}
            className="px-6 py-4 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-white font-semibold shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <Search size={24} />
            )}
          </button>
        </div>
      </form>

      {/* Erro */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          {/* Dados do Veiculo */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl">
                <Car size={32} className="text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {result.veiculo.marca} {result.veiculo.modelo}
                  {result.veiculo.ano && <span className="text-muted font-normal"> ({result.veiculo.ano})</span>}
                </h2>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-primary font-mono text-lg">{result.veiculo.placa}</span>
                  {result.veiculo.kmAtual && (
                    <span className="text-muted">
                      {result.veiculo.kmAtual.toLocaleString('pt-BR')} km
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Manutenções */}
          {result.manutencao && (
            <div className="space-y-4">
              {/* Header com título */}
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Wrench size={20} className="text-primary" />
                Manutenções Preventivas
              </h3>

              {/* Grid de cards de manutenção */}
              <div className="grid gap-4">
                {/* Troca de Óleo */}
                {(() => {
                  const oleo = result.manutencao.proximaTrocaOleo;
                  const ultimo = result.manutencao.ultimaTrocaOleo;
                  const atrasado = ultimo && oleo.kmFaltando < 0;
                  const urgente = !ultimo || atrasado || oleo.kmFaltando <= 500;
                  const alerta = !urgente && oleo.kmFaltando <= 1000;
                  return (
                    <div className={`bg-card border rounded-2xl p-5 ${urgente ? 'border-red-500/50' : 'border-border'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${urgente ? 'bg-red-500/10' : alerta ? 'bg-amber-500/10' : 'bg-amber-500/10'}`}>
                            <Droplets size={20} className={urgente ? 'text-red-400' : alerta ? 'text-amber-400' : 'text-amber-400'} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">Troca de Óleo</h4>
                            <p className="text-xs text-muted">A cada 5.000 km</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {!ultimo ? (
                            <>
                              <p className="text-red-400 font-medium">Sem registro</p>
                              <p className="text-xs text-red-400">Verificar urgente</p>
                            </>
                          ) : atrasado ? (
                            <>
                              <p className="text-red-400 font-medium">ATRASADO</p>
                              <p className="text-xs text-red-400">
                                {Math.abs(oleo.kmFaltando).toLocaleString('pt-BR')} km além
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-primary font-medium">
                                {oleo.km.toLocaleString('pt-BR')} km
                              </p>
                              <p className={`text-xs ${urgente ? 'text-red-400' : alerta ? 'text-amber-400' : 'text-muted'}`}>
                                Faltam {oleo.kmFaltando.toLocaleString('pt-BR')} km
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Barra de progresso */}
                      <div className="h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            urgente ? 'bg-red-500' : alerta ? 'bg-amber-500' : 'bg-gradient-to-r from-primary to-primary-dark'
                          }`}
                          style={{ width: !ultimo || atrasado ? '100%' : `${Math.min(100, Math.max(0, ((5000 - oleo.kmFaltando) / 5000) * 100))}%` }}
                        />
                      </div>
                      {ultimo ? (
                        <p className="text-xs text-muted mt-2">
                          Última: {ultimo.km?.toLocaleString('pt-BR')} km ({formatDate(ultimo.data)})
                        </p>
                      ) : (
                        <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                          <AlertCircle size={12} />
                          Nenhuma troca registrada no sistema
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Alinhamento e Balanceamento */}
                {(() => {
                  const alinh = result.manutencao.proximoAlinhamento;
                  const ultimo = result.manutencao.ultimoAlinhamento;
                  const atrasado = ultimo && alinh.kmFaltando < 0;
                  const urgente = !ultimo || atrasado || alinh.kmFaltando <= 1000;
                  const alerta = !urgente && alinh.kmFaltando <= 2000;
                  return (
                    <div className={`bg-card border rounded-2xl p-5 ${urgente ? 'border-red-500/50' : 'border-border'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${urgente ? 'bg-red-500/10' : alerta ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
                            <CircleDot size={20} className={urgente ? 'text-red-400' : alerta ? 'text-amber-400' : 'text-blue-400'} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">Alinhamento e Balanceamento</h4>
                            <p className="text-xs text-muted">A cada 10.000 km</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {!ultimo ? (
                            <>
                              <p className="text-red-400 font-medium">Sem registro</p>
                              <p className="text-xs text-red-400">Verificar urgente</p>
                            </>
                          ) : atrasado ? (
                            <>
                              <p className="text-red-400 font-medium">ATRASADO</p>
                              <p className="text-xs text-red-400">
                                {Math.abs(alinh.kmFaltando).toLocaleString('pt-BR')} km além
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-primary font-medium">
                                {alinh.km.toLocaleString('pt-BR')} km
                              </p>
                              <p className={`text-xs ${urgente ? 'text-red-400' : alerta ? 'text-amber-400' : 'text-muted'}`}>
                                Faltam {alinh.kmFaltando.toLocaleString('pt-BR')} km
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Barra de progresso */}
                      <div className="h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            urgente ? 'bg-red-500' : alerta ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                          }`}
                          style={{ width: !ultimo || atrasado ? '100%' : `${Math.min(100, Math.max(0, ((10000 - alinh.kmFaltando) / 10000) * 100))}%` }}
                        />
                      </div>
                      {ultimo ? (
                        <p className="text-xs text-muted mt-2">
                          Último: {ultimo.km?.toLocaleString('pt-BR')} km ({formatDate(ultimo.data)})
                        </p>
                      ) : (
                        <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                          <AlertCircle size={12} />
                          Nenhum serviço registrado no sistema
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Troca de Filtros */}
                {(() => {
                  const filtros = result.manutencao.proximaTrocaFiltros;
                  const ultimo = result.manutencao.ultimaTrocaFiltros;
                  const atrasado = ultimo && filtros.kmFaltando < 0;
                  const urgente = !ultimo || atrasado || filtros.kmFaltando <= 1000;
                  const alerta = !urgente && filtros.kmFaltando <= 2000;
                  return (
                    <div className={`bg-card border rounded-2xl p-5 ${urgente ? 'border-red-500/50' : 'border-border'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${urgente ? 'bg-red-500/10' : alerta ? 'bg-amber-500/10' : 'bg-purple-500/10'}`}>
                            <Filter size={20} className={urgente ? 'text-red-400' : alerta ? 'text-amber-400' : 'text-purple-400'} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">Troca de Filtros</h4>
                            <p className="text-xs text-muted">A cada 10.000 km</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {!ultimo ? (
                            <>
                              <p className="text-red-400 font-medium">Sem registro</p>
                              <p className="text-xs text-red-400">Verificar urgente</p>
                            </>
                          ) : atrasado ? (
                            <>
                              <p className="text-red-400 font-medium">ATRASADO</p>
                              <p className="text-xs text-red-400">
                                {Math.abs(filtros.kmFaltando).toLocaleString('pt-BR')} km além
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-primary font-medium">
                                {filtros.km.toLocaleString('pt-BR')} km
                              </p>
                              <p className={`text-xs ${urgente ? 'text-red-400' : alerta ? 'text-amber-400' : 'text-muted'}`}>
                                Faltam {filtros.kmFaltando.toLocaleString('pt-BR')} km
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Barra de progresso */}
                      <div className="h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            urgente ? 'bg-red-500' : alerta ? 'bg-amber-500' : 'bg-gradient-to-r from-purple-500 to-purple-600'
                          }`}
                          style={{ width: !ultimo || atrasado ? '100%' : `${Math.min(100, Math.max(0, ((10000 - filtros.kmFaltando) / 10000) * 100))}%` }}
                        />
                      </div>
                      {ultimo ? (
                        <p className="text-xs text-muted mt-2">
                          Última: {ultimo.km?.toLocaleString('pt-BR')} km ({formatDate(ultimo.data)})
                        </p>
                      ) : (
                        <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                          <AlertCircle size={12} />
                          Nenhuma troca registrada no sistema
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Atualizar KM */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <p className="text-sm text-muted mb-3 flex items-center gap-2">
                  <Gauge size={16} />
                  Atualize a quilometragem do veículo
                </p>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={kmInput}
                      onChange={(e) => setKmInput(formatKmInput(e.target.value))}
                      placeholder="Ex: 42000"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-sm">
                      km
                    </span>
                  </div>
                  <button
                    onClick={handleUpdateKm}
                    disabled={kmLoading || !kmInput || parseInt(kmInput, 10) <= (result.veiculo.kmAtual || 0)}
                    className="px-5 py-3 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-white font-medium shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {kmLoading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      'Atualizar'
                    )}
                  </button>
                </div>
                {kmError && (
                  <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {kmError}
                  </p>
                )}
                {kmSuccess && (
                  <p className="text-primary text-sm mt-2 flex items-center gap-1">
                    <CheckCircle size={14} />
                    {kmSuccess}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Histórico de Serviços */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock size={20} className="text-primary" />
              Histórico de Serviços
            </h3>

            {result.ordens.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <p className="text-muted">Nenhum serviço encontrado para este veículo</p>
              </div>
            ) : (
              <div className="space-y-3">
                {result.ordens.map((ordem, index) => {
                  const status = statusConfig[ordem.status] || statusConfig.AGENDADO;
                  const StatusIcon = status.icon;
                  const isActive = ordemAtiva?.numero === ordem.numero;

                  return (
                    <div
                      key={index}
                      className={`bg-card border rounded-xl p-4 transition-colors ${
                        isActive ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 ${status.bg} rounded-lg`}>
                            <StatusIcon size={18} className={status.color} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 ${status.bg} rounded-full text-xs font-medium ${status.color}`}>
                                {status.label}
                              </span>
                              <span className="text-muted text-xs">#{ordem.numero}</span>
                              {isActive && (
                                <span className="px-2 py-0.5 bg-primary/20 rounded-full text-xs font-medium text-primary">
                                  Atual
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {ordem.servicos.map((servico, i) => (
                                <span
                                  key={i}
                                  className="text-sm text-foreground bg-background-secondary px-2 py-0.5 rounded"
                                >
                                  {servico}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted whitespace-nowrap">
                          {ordem.dataConclusao ? (
                            <div>
                              <p className="text-primary">Concluído</p>
                              <p>{formatDate(ordem.dataConclusao)}</p>
                            </div>
                          ) : ordem.dataAgendada ? (
                            <div>
                              <p>Agendado</p>
                              <p>{formatDate(ordem.dataAgendada)}</p>
                            </div>
                          ) : (
                            <p>{formatDate(ordem.createdAt)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dica inicial */}
      {!result && !error && !loading && (
        <div className="text-center text-muted mt-12">
          <Car size={48} className="mx-auto mb-4 opacity-30" />
          <p>Digite a placa do seu veículo acima para consultar</p>
        </div>
      )}
    </div>
  );
}
