'use client';

import Header from '@/components/Header';
import { useToast } from '@/components/Toast';
import {
  Bell,
  Search,
  Plus,
  MessageCircle,
  Phone,
  Clock,
  AlertCircle,
  CheckCircle,
  Calendar,
  Car,
  User,
  Send,
  X,
  Trash2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { capitalize, formatPlate, formatPhone } from '@/utils/format';

interface Lembrete {
  id: number;
  tipo: string;
  dataLembrete: string;
  kmLembrete: number | null;
  mensagem: string | null;
  enviado: boolean;
  dataEnvio: string | null;
  diasRestantes: number;
  urgencia: string;
  veiculo: {
    id: number;
    placa: string;
    marca: string;
    modelo: string;
    ano: number;
    kmAtual: number | null;
    cliente: {
      id: number;
      nome: string;
      telefone: string;
    };
  };
}

interface Veiculo {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  cliente: { nome: string };
}

interface Stats {
  pendentes: number;
  enviados: number;
  vencidos: number;
  urgentes: number;
}

const tipoLabels: Record<string, string> = {
  TROCA_OLEO: 'Troca de Oleo',
  REVISAO: 'Revisao',
  FILTROS: 'Filtros',
  PNEUS: 'Pneus',
  FREIOS: 'Freios',
  OUTRO: 'Outro',
};

const getUrgenciaConfig = (urgencia: string) => {
  switch (urgencia) {
    case 'alta':
    case 'vencido':
      return {
        color: 'bg-red-500/10 text-red-400 border-red-500/20',
        barColor: 'bg-red-500',
        label: urgencia === 'vencido' ? 'Vencido' : 'Urgente',
      };
    case 'media':
      return {
        color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        barColor: 'bg-amber-500',
        label: 'Atencao',
      };
    case 'baixa':
      return {
        color: 'bg-green-500/10 text-green-400 border-green-500/20',
        barColor: 'bg-green-500',
        label: 'Normal',
      };
    default:
      return {
        color: 'bg-gray-500/10 text-gray-400 border-[#333333]',
        barColor: 'bg-gray-500',
        label: urgencia,
      };
  }
};

export default function LembretesPage() {
  const toast = useToast();
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [stats, setStats] = useState<Stats>({ pendentes: 0, enviados: 0, vencidos: 0, urgentes: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<number | null>(null);
  const [tipo, setTipo] = useState('TROCA_OLEO');
  const [dataLembrete, setDataLembrete] = useState('');
  const [kmLembrete, setKmLembrete] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingLembrete, setDeletingLembrete] = useState<Lembrete | null>(null);

  // Auto actions
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchLembretes = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('busca', searchTerm);
      if (filterStatus) params.append('status', filterStatus);

      const res = await fetch(`/api/lembretes?${params}`);
      const data = await res.json();
      setLembretes(data.data || []);
      setStats(data.stats || { pendentes: 0, enviados: 0, vencidos: 0, urgentes: 0 });
    } catch (error) {
      console.error('Erro ao buscar lembretes:', error);
      toast.error('Erro ao carregar lembretes');
    } finally {
      setLoading(false);
    }
  };

  const fetchVeiculos = async () => {
    try {
      const res = await fetch('/api/veiculos');
      const data = await res.json();
      setVeiculos(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar veiculos:', error);
    }
  };

  useEffect(() => {
    fetchLembretes();
  }, [searchTerm, filterStatus]);

  const openNewModal = () => {
    fetchVeiculos();
    setSelectedVeiculoId(null);
    setTipo('TROCA_OLEO');
    setDataLembrete('');
    setKmLembrete('');
    setMensagem('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!selectedVeiculoId || !dataLembrete) {
      toast.warning('Selecione um veiculo e uma data');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/lembretes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          veiculoId: selectedVeiculoId,
          tipo,
          dataLembrete,
          kmLembrete: kmLembrete ? parseInt(kmLembrete) : null,
          mensagem: mensagem || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Lembrete criado com sucesso!');
        setShowModal(false);
        fetchLembretes();
      } else {
        toast.error(data.error || 'Erro ao criar lembrete');
      }
    } catch (error) {
      toast.error('Erro ao criar lembrete');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsSent = async (lembrete: Lembrete) => {
    try {
      const res = await fetch(`/api/lembretes/${lembrete.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enviado: true }),
      });

      if (res.ok) {
        toast.success('Lembrete marcado como enviado');
        fetchLembretes();
      } else {
        toast.error('Erro ao atualizar lembrete');
      }
    } catch (error) {
      toast.error('Erro ao atualizar lembrete');
    }
  };

  const handleDelete = async () => {
    if (!deletingLembrete) return;

    try {
      const res = await fetch(`/api/lembretes/${deletingLembrete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Lembrete excluido');
        setShowDeleteConfirm(false);
        setDeletingLembrete(null);
        fetchLembretes();
      } else {
        toast.error('Erro ao excluir lembrete');
      }
    } catch (error) {
      toast.error('Erro ao excluir lembrete');
    }
  };

  const sendWhatsApp = async (lembrete: Lembrete) => {
    const telefone = lembrete.veiculo.cliente.telefone.replace(/\D/g, '');
    const mensagem =
      `Ola ${lembrete.veiculo.cliente.nome}! ` +
      `Estamos entrando em contato para lembrar da ${tipoLabels[lembrete.tipo] || lembrete.tipo} ` +
      `do seu ${lembrete.veiculo.marca} ${lembrete.veiculo.modelo} (${lembrete.veiculo.placa}). ` +
      `Podemos agendar para voce?`;

    try {
      // Tentar enviar via API
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: telefone,
          text: mensagem,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Mensagem enviada via WhatsApp!');
        handleMarkAsSent(lembrete);
      } else if (data.error?.includes('nao configurado') || data.error?.includes('nao esta conectado')) {
        // Fallback para wa.me se API nao configurada
        openWhatsAppLink(telefone, mensagem);
        handleMarkAsSent(lembrete);
      } else {
        toast.error(data.error || 'Erro ao enviar mensagem');
      }
    } catch (error) {
      // Fallback para wa.me em caso de erro
      openWhatsAppLink(telefone, mensagem);
      handleMarkAsSent(lembrete);
    }
  };

  const openWhatsAppLink = (telefone: string, mensagem: string) => {
    const msg = encodeURIComponent(mensagem);
    window.open(`https://wa.me/55${telefone}?text=${msg}`, '_blank');
  };

  // Gerar lembretes automaticos baseado no km
  const handleGerarLembretes = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/lembretes/gerar', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        if (data.total > 0) {
          toast.success(`${data.total} lembrete(s) gerado(s) automaticamente!`);
          fetchLembretes();
        } else {
          toast.info('Nenhum veiculo precisando de lembrete no momento');
        }
      } else {
        toast.error(data.error || 'Erro ao gerar lembretes');
      }
    } catch (error) {
      toast.error('Erro ao gerar lembretes');
    } finally {
      setGenerating(false);
    }
  };

  // Enviar todos os lembretes pendentes via WhatsApp
  const handleEnviarTodos = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/lembretes/processar', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        if (data.enviados > 0) {
          toast.success(`${data.enviados} mensagem(ns) enviada(s) via WhatsApp!`);
          if (data.falhas > 0) {
            toast.warning(`${data.falhas} falha(s) no envio`);
          }
          fetchLembretes();
        } else if (data.total === 0) {
          toast.info('Nenhum lembrete pendente para enviar');
        } else {
          toast.error('Nenhuma mensagem foi enviada');
        }
      } else {
        toast.error(data.error || 'Erro ao enviar lembretes');
      }
    } catch (error) {
      toast.error('Erro ao enviar lembretes');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getDiasLabel = (dias: number) => {
    if (dias < 0) return `${Math.abs(dias)} dias atrasado`;
    if (dias === 0) return 'Hoje';
    if (dias === 1) return 'Amanha';
    return `em ${dias} dias`;
  };

  if (loading && lembretes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-cyan-500/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-zinc-400 animate-pulse">Carregando lembretes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Header title="Lembretes" subtitle="Gerencie lembretes de manutencao" />

      <div className="px-4 lg:px-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-8">
          {/* Vencidos */}
          <div
            onClick={() => setFilterStatus(filterStatus === 'vencido' ? '' : 'vencido')}
            className={`group relative overflow-hidden bg-gradient-to-br from-red-500/20 to-red-500/5 rounded-2xl p-6 border cursor-pointer transition-all duration-300 ${
              filterStatus === 'vencido' ? 'border-red-500 ring-2 ring-red-500/30' : 'border-red-500/20 hover:border-red-500/40'
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-500/20 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                </div>
                <span className="text-xs font-medium text-red-400 bg-red-500/10 px-2 py-1 rounded-full">Vencidos</span>
              </div>
              <p className="text-4xl font-bold text-white mb-1">{stats.vencidos}</p>
              <p className="text-sm text-zinc-400">atrasados</p>
            </div>
          </div>

          {/* Pendentes */}
          <div
            onClick={() => setFilterStatus(filterStatus === 'pendente' ? '' : 'pendente')}
            className={`group relative overflow-hidden bg-gradient-to-br from-amber-500/20 to-amber-500/5 rounded-2xl p-6 border cursor-pointer transition-all duration-300 ${
              filterStatus === 'pendente' ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-amber-500/20 hover:border-amber-500/40'
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-500/20 rounded-xl">
                  <Clock className="h-6 w-6 text-amber-400" />
                </div>
                <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">Pendentes</span>
              </div>
              <p className="text-4xl font-bold text-white mb-1">{stats.pendentes}</p>
              <p className="text-sm text-zinc-400">aguardando</p>
            </div>
          </div>

          {/* Urgentes */}
          <div
            onClick={() => setFilterStatus('')}
            className={`group relative overflow-hidden bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 rounded-2xl p-6 border cursor-pointer transition-all duration-300 ${
              !filterStatus ? 'border-cyan-500 ring-2 ring-cyan-500/30' : 'border-cyan-500/20 hover:border-cyan-500/40'
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-cyan-500/20 rounded-xl">
                  <Bell className="h-6 w-6 text-cyan-400" />
                </div>
                <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-full">Urgentes</span>
              </div>
              <p className="text-4xl font-bold text-white mb-1">{stats.urgentes}</p>
              <p className="text-sm text-zinc-400">proximos 3 dias</p>
            </div>
          </div>

          {/* Enviados */}
          <div
            onClick={() => setFilterStatus(filterStatus === 'enviado' ? '' : 'enviado')}
            className={`group relative overflow-hidden bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-2xl p-6 border cursor-pointer transition-all duration-300 ${
              filterStatus === 'enviado' ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-emerald-500/20 hover:border-emerald-500/40'
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">Enviados</span>
              </div>
              <p className="text-4xl font-bold text-white mb-1">{stats.enviados}</p>
              <p className="text-sm text-zinc-400">notificados</p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Buscar por cliente ou placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-zinc-800/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
              />
            </div>
            <button
              onClick={() => { setLoading(true); fetchLembretes(); }}
              className="p-3 bg-[#1a1a1a] border border-zinc-800/50 rounded-xl text-zinc-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-all duration-200"
              title="Atualizar"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGerarLembretes}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400 font-medium hover:bg-purple-500/20 hover:border-purple-500/50 disabled:opacity-50 transition-all duration-200"
              title="Gerar lembretes automaticos baseado no km dos veiculos"
            >
              {generating ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              <span className="hidden md:inline">Gerar Auto</span>
            </button>
            <button
              onClick={handleEnviarTodos}
              disabled={sending || stats.vencidos + stats.pendentes === 0}
              className="flex items-center gap-2 px-4 py-3 bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl text-[#25D366] font-medium hover:bg-[#25D366]/20 hover:border-[#25D366]/50 disabled:opacity-50 transition-all duration-200"
              title="Enviar todos os lembretes pendentes via WhatsApp"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              <span className="hidden md:inline">Enviar Todos</span>
            </button>
            <button
              onClick={openNewModal}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#43A047] to-[#2E7D32] hover:from-[#2E7D32] hover:to-[#43A047] text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-[#43A047]/25 hover:shadow-[#43A047]/40 hover:scale-[1.02]"
            >
              <Plus size={20} />
              <span className="hidden md:inline">Novo Lembrete</span>
            </button>
          </div>
        </div>

        {/* Lista de Lembretes */}
        <div className="bg-[#1a1a1a] rounded-2xl border border-zinc-800/50 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="relative w-12 h-12 mx-auto mb-4">
                <div className="w-12 h-12 border-4 border-cyan-500/20 rounded-full"></div>
                <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin"></div>
              </div>
              <p className="text-zinc-400">Carregando lembretes...</p>
            </div>
          ) : lembretes.length === 0 ? (
            <div className="p-12 text-center">
              <div className="p-4 bg-cyan-500/10 rounded-2xl w-fit mx-auto mb-4 border border-cyan-500/20">
                <Bell className="h-8 w-8 text-cyan-400" />
              </div>
              <p className="text-white font-medium">Nenhum lembrete encontrado</p>
              <p className="text-zinc-400 text-sm mt-1">Crie um novo lembrete de manutencao</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {lembretes.map((lembrete) => {
                const urgenciaConfig = getUrgenciaConfig(lembrete.urgencia);

                return (
                  <div
                    key={lembrete.id}
                    className="p-4 hover:bg-zinc-800/30 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-1.5 h-16 rounded-full ${urgenciaConfig.barColor}`}></div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <User size={16} className="text-zinc-500 flex-shrink-0" />
                          <span className="font-semibold text-white truncate">{capitalize(lembrete.veiculo.cliente.nome)}</span>
                          <span className="text-zinc-600 hidden sm:inline">-</span>
                          <span className="text-zinc-400 text-sm hidden sm:inline">{formatPhone(lembrete.veiculo.cliente.telefone)}</span>
                        </div>
                        <div className="flex items-center gap-3 mb-1.5">
                          <Car size={16} className="text-zinc-500 flex-shrink-0" />
                          <span className="text-zinc-400 text-sm truncate">
                            {capitalize(lembrete.veiculo.marca)} {capitalize(lembrete.veiculo.modelo)} {lembrete.veiculo.ano}
                          </span>
                          <span className="px-2 py-0.5 bg-[#43A047]/10 rounded-lg text-xs text-[#43A047] border border-[#43A047]/20 flex-shrink-0">
                            {formatPlate(lembrete.veiculo.placa)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Calendar size={16} className="text-zinc-500 flex-shrink-0" />
                          <span className="text-zinc-500 text-sm truncate">
                            {tipoLabels[lembrete.tipo] || lembrete.tipo} - {formatDate(lembrete.dataLembrete)}
                            {lembrete.kmLembrete && ` ou ${lembrete.kmLembrete.toLocaleString()} km`}
                          </span>
                        </div>
                      </div>

                      <div className="text-right space-y-2 hidden sm:block">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${urgenciaConfig.color}`}>
                          <AlertCircle size={14} />
                          <span className="text-xs font-medium whitespace-nowrap">
                            {getDiasLabel(lembrete.diasRestantes)}
                          </span>
                        </div>
                        {lembrete.enviado ? (
                          <div className="flex items-center justify-end gap-2 text-emerald-400">
                            <CheckCircle size={14} />
                            <span className="text-xs">Enviado</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2 text-amber-400">
                            <Clock size={14} />
                            <span className="text-xs">Pendente</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1.5 bg-zinc-900/50 rounded-xl p-1.5 border border-zinc-800/50">
                        <button
                          onClick={() => sendWhatsApp(lembrete)}
                          className="p-2.5 bg-[#25D366]/10 rounded-lg text-[#25D366] hover:bg-[#25D366]/20 transition-all duration-200"
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle size={18} />
                        </button>
                        <button
                          onClick={() => {
                            const tel = lembrete.veiculo.cliente.telefone.replace(/\D/g, '');
                            window.open(`tel:${tel}`, '_blank');
                          }}
                          className="p-2.5 bg-blue-500/10 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-all duration-200"
                          title="Ligar"
                        >
                          <Phone size={18} />
                        </button>
                        {!lembrete.enviado && (
                          <button
                            onClick={() => handleMarkAsSent(lembrete)}
                            className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-all duration-200"
                            title="Marcar como enviado"
                          >
                            <Send size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setDeletingLembrete(lembrete);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-2.5 bg-red-500/10 rounded-lg text-red-400 hover:bg-red-500/20 transition-all duration-200"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Novo Lembrete */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl w-full max-w-lg shadow-2xl shadow-black/50">
            <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Novo Lembrete</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Veiculo */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Veiculo *</label>
                <select
                  value={selectedVeiculoId || ''}
                  onChange={(e) => setSelectedVeiculoId(parseInt(e.target.value))}
                  className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                >
                  <option value="">Selecione um veiculo</option>
                  {veiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {formatPlate(v.placa)} - {capitalize(v.marca)} {capitalize(v.modelo)} ({capitalize(v.cliente.nome)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Tipo de Lembrete *</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                >
                  {Object.entries(tipoLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Data */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Data do Lembrete *</label>
                <input
                  type="date"
                  value={dataLembrete}
                  onChange={(e) => setDataLembrete(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all [color-scheme:dark]"
                />
              </div>

              {/* KM */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">KM do Lembrete (opcional)</label>
                <input
                  type="number"
                  value={kmLembrete}
                  onChange={(e) => setKmLembrete(e.target.value)}
                  placeholder="Ex: 60000"
                  max={9999999}
                  className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
              </div>

              {/* Mensagem */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Observacao (opcional)</label>
                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  rows={2}
                  placeholder="Anotacoes sobre este lembrete..."
                  className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800/50 flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 border border-zinc-700 rounded-xl text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-[#43A047] to-[#2E7D32] hover:from-[#2E7D32] hover:to-[#43A047] rounded-xl text-white font-semibold transition-all duration-300 shadow-lg shadow-[#43A047]/25 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Criar Lembrete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusao */}
      {showDeleteConfirm && deletingLembrete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl w-full max-w-md shadow-2xl shadow-black/50">
            <div className="p-6">
              <div className="w-14 h-14 mx-auto mb-4 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                <Trash2 className="text-red-400" size={28} />
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2">Excluir Lembrete?</h3>
              <p className="text-zinc-400 text-center text-sm">
                O lembrete de {tipoLabels[deletingLembrete.tipo] || deletingLembrete.tipo} para{' '}
                <strong className="text-white">{formatPlate(deletingLembrete.veiculo.placa)}</strong> sera excluido permanentemente.
              </p>
            </div>
            <div className="p-6 border-t border-zinc-800/50 flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeletingLembrete(null); }}
                className="flex-1 px-6 py-3 border border-zinc-700 rounded-xl text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-600 rounded-xl text-white font-semibold transition-all duration-300 shadow-lg shadow-red-500/25"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
