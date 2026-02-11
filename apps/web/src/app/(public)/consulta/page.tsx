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

const statusConfig: Record<string, { label: string; color: string; icon: any; bg: string; step: number }> = {
  AGENDADO: { label: 'Agendado', color: 'text-blue-400', icon: Calendar, bg: 'bg-blue-500/10', step: 1 },
  AGUARDANDO_PECAS: { label: 'Aguardando Pecas', color: 'text-amber-400', icon: Pause, bg: 'bg-amber-500/10', step: 2 },
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'text-purple-400', icon: Play, bg: 'bg-purple-500/10', step: 2 },
  CONCLUIDO: { label: 'Concluido', color: 'text-[#43A047]', icon: CheckCircle, bg: 'bg-green-500/10', step: 3 },
  CANCELADO: { label: 'Cancelado', color: 'text-red-500', icon: XCircle, bg: 'bg-red-500/10', step: 0 },
  ENTREGUE: { label: 'Entregue', color: 'text-cyan-400', icon: Truck, bg: 'bg-cyan-500/10', step: 4 },
};

// Etapas do progresso
const progressSteps = [
  { step: 1, label: 'Agendado', icon: Calendar, color: 'blue' },
  { step: 2, label: 'Em Andamento', icon: Wrench, color: 'purple' },
  { step: 3, label: 'Concluido', icon: CheckCircle, color: 'green' },
  { step: 4, label: 'Entregue', icon: Truck, color: 'cyan' },
];

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

  // Encontrar ordem ativa (não entregue/cancelada)
  const ordemAtiva = result?.ordens.find(o =>
    !['ENTREGUE', 'CANCELADO'].includes(o.status)
  );

  const currentStep = ordemAtiva ? (statusConfig[ordemAtiva.status]?.step || 1) : 0;

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

          {/* Manutenções */}
          {result.manutencao && (
            <div className="space-y-4">
              {/* Header com título */}
              <h3 className="text-lg font-semibold text-[#E8E8E8] flex items-center gap-2">
                <Wrench size={20} className="text-[#43A047]" />
                Manutenções Preventivas
              </h3>

              {/* Grid de cards de manutenção */}
              <div className="grid gap-4">
                {/* Troca de Óleo */}
                <div className={`bg-[#1E1E1E] border rounded-2xl p-5 ${!result.manutencao.ultimaTrocaOleo ? 'border-red-500/50' : 'border-[#333333]'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${!result.manutencao.ultimaTrocaOleo ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                        <Droplets size={20} className={!result.manutencao.ultimaTrocaOleo ? 'text-red-400' : 'text-amber-400'} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#E8E8E8]">Troca de Óleo</h4>
                        <p className="text-xs text-[#9E9E9E]">A cada 5.000 km</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {!result.manutencao.ultimaTrocaOleo ? (
                        <>
                          <p className="text-red-400 font-medium">Sem registro</p>
                          <p className="text-xs text-red-400">Verificar urgente</p>
                        </>
                      ) : (
                        <>
                          <p className="text-[#43A047] font-medium">
                            {result.manutencao.proximaTrocaOleo.km.toLocaleString('pt-BR')} km
                          </p>
                          <p className={`text-xs ${result.manutencao.proximaTrocaOleo.kmFaltando <= 500 ? 'text-red-400' : result.manutencao.proximaTrocaOleo.kmFaltando <= 1000 ? 'text-amber-400' : 'text-[#9E9E9E]'}`}>
                            Faltam {result.manutencao.proximaTrocaOleo.kmFaltando.toLocaleString('pt-BR')} km
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Barra de progresso */}
                  <div className="h-2 bg-[#333333] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        !result.manutencao.ultimaTrocaOleo ? 'bg-red-500' : result.manutencao.proximaTrocaOleo.kmFaltando <= 500 ? 'bg-red-500' : result.manutencao.proximaTrocaOleo.kmFaltando <= 1000 ? 'bg-amber-500' : 'bg-gradient-to-r from-[#43A047] to-[#1B5E20]'
                      }`}
                      style={{ width: !result.manutencao.ultimaTrocaOleo ? '100%' : `${Math.min(100, Math.max(0, ((5000 - result.manutencao.proximaTrocaOleo.kmFaltando) / 5000) * 100))}%` }}
                    />
                  </div>
                  {result.manutencao.ultimaTrocaOleo ? (
                    <p className="text-xs text-[#9E9E9E] mt-2">
                      Última: {result.manutencao.ultimaTrocaOleo.km?.toLocaleString('pt-BR')} km ({formatDate(result.manutencao.ultimaTrocaOleo.data)})
                    </p>
                  ) : (
                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Nenhuma troca registrada no sistema
                    </p>
                  )}
                </div>

                {/* Alinhamento e Balanceamento */}
                <div className={`bg-[#1E1E1E] border rounded-2xl p-5 ${!result.manutencao.ultimoAlinhamento ? 'border-red-500/50' : 'border-[#333333]'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${!result.manutencao.ultimoAlinhamento ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
                        <CircleDot size={20} className={!result.manutencao.ultimoAlinhamento ? 'text-red-400' : 'text-blue-400'} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#E8E8E8]">Alinhamento e Balanceamento</h4>
                        <p className="text-xs text-[#9E9E9E]">A cada 10.000 km</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {!result.manutencao.ultimoAlinhamento ? (
                        <>
                          <p className="text-red-400 font-medium">Sem registro</p>
                          <p className="text-xs text-red-400">Verificar urgente</p>
                        </>
                      ) : (
                        <>
                          <p className="text-[#43A047] font-medium">
                            {result.manutencao.proximoAlinhamento.km.toLocaleString('pt-BR')} km
                          </p>
                          <p className={`text-xs ${result.manutencao.proximoAlinhamento.kmFaltando <= 1000 ? 'text-red-400' : result.manutencao.proximoAlinhamento.kmFaltando <= 2000 ? 'text-amber-400' : 'text-[#9E9E9E]'}`}>
                            Faltam {result.manutencao.proximoAlinhamento.kmFaltando.toLocaleString('pt-BR')} km
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Barra de progresso */}
                  <div className="h-2 bg-[#333333] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        !result.manutencao.ultimoAlinhamento ? 'bg-red-500' : result.manutencao.proximoAlinhamento.kmFaltando <= 1000 ? 'bg-red-500' : result.manutencao.proximoAlinhamento.kmFaltando <= 2000 ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                      }`}
                      style={{ width: !result.manutencao.ultimoAlinhamento ? '100%' : `${Math.min(100, Math.max(0, ((10000 - result.manutencao.proximoAlinhamento.kmFaltando) / 10000) * 100))}%` }}
                    />
                  </div>
                  {result.manutencao.ultimoAlinhamento ? (
                    <p className="text-xs text-[#9E9E9E] mt-2">
                      Último: {result.manutencao.ultimoAlinhamento.km?.toLocaleString('pt-BR')} km ({formatDate(result.manutencao.ultimoAlinhamento.data)})
                    </p>
                  ) : (
                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Nenhum serviço registrado no sistema
                    </p>
                  )}
                </div>

                {/* Troca de Filtros */}
                <div className={`bg-[#1E1E1E] border rounded-2xl p-5 ${!result.manutencao.ultimaTrocaFiltros ? 'border-red-500/50' : 'border-[#333333]'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${!result.manutencao.ultimaTrocaFiltros ? 'bg-red-500/10' : 'bg-purple-500/10'}`}>
                        <Filter size={20} className={!result.manutencao.ultimaTrocaFiltros ? 'text-red-400' : 'text-purple-400'} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#E8E8E8]">Troca de Filtros</h4>
                        <p className="text-xs text-[#9E9E9E]">A cada 10.000 km</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {!result.manutencao.ultimaTrocaFiltros ? (
                        <>
                          <p className="text-red-400 font-medium">Sem registro</p>
                          <p className="text-xs text-red-400">Verificar urgente</p>
                        </>
                      ) : (
                        <>
                          <p className="text-[#43A047] font-medium">
                            {result.manutencao.proximaTrocaFiltros.km.toLocaleString('pt-BR')} km
                          </p>
                          <p className={`text-xs ${result.manutencao.proximaTrocaFiltros.kmFaltando <= 1000 ? 'text-red-400' : result.manutencao.proximaTrocaFiltros.kmFaltando <= 2000 ? 'text-amber-400' : 'text-[#9E9E9E]'}`}>
                            Faltam {result.manutencao.proximaTrocaFiltros.kmFaltando.toLocaleString('pt-BR')} km
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Barra de progresso */}
                  <div className="h-2 bg-[#333333] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        !result.manutencao.ultimaTrocaFiltros ? 'bg-red-500' : result.manutencao.proximaTrocaFiltros.kmFaltando <= 1000 ? 'bg-red-500' : result.manutencao.proximaTrocaFiltros.kmFaltando <= 2000 ? 'bg-amber-500' : 'bg-gradient-to-r from-purple-500 to-purple-600'
                      }`}
                      style={{ width: !result.manutencao.ultimaTrocaFiltros ? '100%' : `${Math.min(100, Math.max(0, ((10000 - result.manutencao.proximaTrocaFiltros.kmFaltando) / 10000) * 100))}%` }}
                    />
                  </div>
                  {result.manutencao.ultimaTrocaFiltros ? (
                    <p className="text-xs text-[#9E9E9E] mt-2">
                      Última: {result.manutencao.ultimaTrocaFiltros.km?.toLocaleString('pt-BR')} km ({formatDate(result.manutencao.ultimaTrocaFiltros.data)})
                    </p>
                  ) : (
                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Nenhuma troca registrada no sistema
                    </p>
                  )}
                </div>
              </div>

              {/* Atualizar KM */}
              <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-5">
                <p className="text-sm text-[#9E9E9E] mb-3 flex items-center gap-2">
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
                      className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] placeholder-gray-500 focus:outline-none focus:border-[#43A047] focus:ring-2 focus:ring-[#43A047]/20 transition-all font-mono"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9E9E9E] text-sm">
                      km
                    </span>
                  </div>
                  <button
                    onClick={handleUpdateKm}
                    disabled={kmLoading || !kmInput || parseInt(kmInput, 10) <= (result.veiculo.kmAtual || 0)}
                    className="px-5 py-3 bg-gradient-to-r from-[#43A047] to-[#1B5E20] rounded-xl text-white font-medium shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
                  <p className="text-[#43A047] text-sm mt-2 flex items-center gap-1">
                    <CheckCircle size={14} />
                    {kmSuccess}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Status Tracker - apenas se tem ordem ativa */}
          {ordemAtiva && (
            <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-[#E8E8E8] mb-2">Status Atual</h3>
              <p className="text-sm text-[#9E9E9E] mb-6">
                {ordemAtiva.servicos.join(', ')} - #{ordemAtiva.numero}
              </p>

              {/* Progress Steps */}
              <div className="relative">
                {/* Linha de conexao */}
                <div className="absolute top-6 left-0 right-0 h-1 bg-[#333333] mx-8" />
                <div
                  className="absolute top-6 left-0 h-1 bg-gradient-to-r from-[#43A047] to-[#43A047] mx-8 transition-all duration-500"
                  style={{ width: `calc(${((currentStep - 1) / 3) * 100}% - 64px)` }}
                />

                {/* Steps */}
                <div className="relative flex justify-between">
                  {progressSteps.map((stepInfo) => {
                    const StepIcon = stepInfo.icon;
                    const isCompleted = currentStep >= stepInfo.step;
                    const isCurrent = currentStep === stepInfo.step;

                    const colorMap: Record<string, { bg: string; ring: string; text: string }> = {
                      blue: { bg: 'bg-blue-500', ring: 'ring-blue-500/30', text: 'text-blue-400' },
                      purple: { bg: 'bg-purple-500', ring: 'ring-purple-500/30', text: 'text-purple-400' },
                      green: { bg: 'bg-[#43A047]', ring: 'ring-green-500/30', text: 'text-[#43A047]' },
                      cyan: { bg: 'bg-cyan-500', ring: 'ring-cyan-500/30', text: 'text-cyan-400' },
                    };
                    const colorClasses = colorMap[stepInfo.color];

                    return (
                      <div key={stepInfo.step} className="flex flex-col items-center">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                            isCompleted
                              ? `${colorClasses.bg} text-white shadow-lg ${isCurrent ? `ring-4 ${colorClasses.ring} scale-110` : ''}`
                              : 'bg-[#333333] text-[#666666]'
                          }`}
                        >
                          <StepIcon size={20} />
                        </div>
                        <span className={`mt-3 text-xs font-medium text-center ${
                          isCompleted ? colorClasses.text : 'text-[#666666]'
                        }`}>
                          {stepInfo.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Info adicional */}
              <div className="mt-6 pt-4 border-t border-[#333333] text-sm text-[#9E9E9E]">
                {ordemAtiva.status === 'AGENDADO' && ordemAtiva.dataAgendada && (
                  <p>Agendado para: <span className="text-blue-400">{formatDate(ordemAtiva.dataAgendada)}</span></p>
                )}
                {ordemAtiva.status === 'AGUARDANDO_PECAS' && (
                  <p className="text-amber-400">Aguardando chegada de pecas</p>
                )}
                {ordemAtiva.status === 'EM_ANDAMENTO' && (
                  <p className="text-purple-400">Seu veiculo esta sendo atendido</p>
                )}
                {ordemAtiva.status === 'CONCLUIDO' && (
                  <p className="text-[#43A047]">Servico concluido! Aguardando retirada</p>
                )}
              </div>
            </div>
          )}

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
                  const isActive = ordemAtiva?.numero === ordem.numero;

                  return (
                    <div
                      key={index}
                      className={`bg-[#1E1E1E] border rounded-xl p-4 transition-colors ${
                        isActive ? 'border-[#43A047]/50 ring-1 ring-[#43A047]/20' : 'border-[#333333] hover:border-[#43A047]/30'
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
                              <span className="text-[#9E9E9E] text-xs">#{ordem.numero}</span>
                              {isActive && (
                                <span className="px-2 py-0.5 bg-[#43A047]/20 rounded-full text-xs font-medium text-[#43A047]">
                                  Atual
                                </span>
                              )}
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
