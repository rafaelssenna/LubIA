'use client';

import { useState } from 'react';
import { Search, Car, Calendar, Clock, CheckCircle, Play, Pause, XCircle, Truck, Loader2, AlertCircle } from 'lucide-react';

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

interface ConsultaResult {
  veiculo: Veiculo;
  ordens: Ordem[];
}

const statusConfig: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  AGENDADO: { label: 'Agendado', color: 'text-blue-400', icon: Calendar, bg: 'bg-blue-500/10' },
  AGUARDANDO_PECAS: { label: 'Aguardando Pecas', color: 'text-amber-400', icon: Pause, bg: 'bg-amber-500/10' },
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'text-purple-400', icon: Play, bg: 'bg-purple-500/10' },
  CONCLUIDO: { label: 'Concluido', color: 'text-[#43A047]', icon: CheckCircle, bg: 'bg-green-500/10' },
  CANCELADO: { label: 'Cancelado', color: 'text-red-500', icon: XCircle, bg: 'bg-red-500/10' },
  ENTREGUE: { label: 'Entregue', color: 'text-cyan-400', icon: Truck, bg: 'bg-cyan-500/10' },
};

export default function ConsultaPage() {
  const [placa, setPlaca] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsultaResult | null>(null);
  const [error, setError] = useState('');

  const formatPlaca = (value: string) => {
    // Remove caracteres especiais e converte para uppercase
    const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    // Formata como ABC-1234 ou ABC1D23 (Mercosul)
    if (clean.length <= 3) return clean;
    if (clean.length <= 7) return clean.slice(0, 3) + '-' + clean.slice(3);
    return clean.slice(0, 3) + '-' + clean.slice(3, 7);
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
      setError('Erro de conexao. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleString('pt-BR');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Titulo */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[#E8E8E8] mb-2">
          Consulte o status do seu veiculo
        </h1>
        <p className="text-[#9E9E9E]">
          Digite a placa para ver o historico de servicos
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={20} />
            <input
              type="text"
              value={placa}
              onChange={(e) => setPlaca(formatPlaca(e.target.value))}
              placeholder="Digite a placa (ex: ABC-1234)"
              maxLength={8}
              className="w-full bg-[#1E1E1E] border border-[#333333] rounded-xl pl-12 pr-4 py-4 text-lg text-[#E8E8E8] placeholder-gray-500 focus:outline-none focus:border-[#43A047] focus:ring-2 focus:ring-[#43A047]/20 transition-all uppercase tracking-wider font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading || placa.length < 7}
            className="px-6 py-4 bg-gradient-to-r from-[#43A047] to-[#1B5E20] rounded-xl text-white font-semibold shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
          <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-[#43A047]/20 to-[#43A047]/5 rounded-xl">
                <Car size={32} className="text-[#43A047]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#E8E8E8]">
                  {result.veiculo.marca} {result.veiculo.modelo}
                  {result.veiculo.ano && <span className="text-[#9E9E9E] font-normal"> ({result.veiculo.ano})</span>}
                </h2>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-[#43A047] font-mono text-lg">{result.veiculo.placa}</span>
                  {result.veiculo.kmAtual && (
                    <span className="text-[#9E9E9E]">
                      {result.veiculo.kmAtual.toLocaleString('pt-BR')} km
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Historico de Servicos */}
          <div>
            <h3 className="text-lg font-semibold text-[#E8E8E8] mb-4 flex items-center gap-2">
              <Clock size={20} className="text-[#43A047]" />
              Historico de Servicos
            </h3>

            {result.ordens.length === 0 ? (
              <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-8 text-center">
                <p className="text-[#9E9E9E]">Nenhum servico encontrado para este veiculo</p>
              </div>
            ) : (
              <div className="space-y-3">
                {result.ordens.map((ordem, index) => {
                  const status = statusConfig[ordem.status] || statusConfig.AGENDADO;
                  const StatusIcon = status.icon;

                  return (
                    <div
                      key={index}
                      className="bg-[#1E1E1E] border border-[#333333] rounded-xl p-4 hover:border-[#43A047]/30 transition-colors"
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
                              <span className="text-[#9E9E9E] text-xs">#{ordem.numero}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {ordem.servicos.map((servico, i) => (
                                <span
                                  key={i}
                                  className="text-sm text-[#E8E8E8] bg-[#2A2A2A] px-2 py-0.5 rounded"
                                >
                                  {servico}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-xs text-[#9E9E9E] whitespace-nowrap">
                          {ordem.dataConclusao ? (
                            <div>
                              <p className="text-[#43A047]">Concluido</p>
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
        <div className="text-center text-[#9E9E9E] mt-12">
          <Car size={48} className="mx-auto mb-4 opacity-30" />
          <p>Digite a placa do seu veiculo acima para consultar</p>
        </div>
      )}
    </div>
  );
}
