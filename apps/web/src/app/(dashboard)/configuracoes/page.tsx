'use client';

import Header from '@/components/Header';
import { useToast } from '@/components/Toast';
import {
  Settings,
  Building2,
  MessageCircle,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  QrCode,
  Loader2,
  Unplug,
  Smartphone,
  Bot,
  Power,
  Wrench,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Store,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface Config {
  nomeOficina: string | null;
  cnpj: string | null;
  telefone: string | null;
  endereco: string | null;
  whatsappConfigured: boolean;
  whatsappConnected: boolean;
  whatsappNumber: string | null;
  whatsappName: string | null;
  // Chatbot
  chatbotEnabled: boolean;
  chatbotNome: string | null;
  chatbotHorario: string | null;
  chatbotBoasVindas: string | null;
}

interface WhatsAppStatus {
  connected: boolean;
  configured: boolean;
  status?: string;
  profileName?: string;
  profilePicUrl?: string;
  number?: string;
  isBusiness?: boolean;
}

interface Servico {
  id: number;
  nome: string;
  categoria: string;
  precoBase: string;
  ativo: boolean;
}

interface Filial {
  id: number;
  nome: string;
  cnpj: string;
  ativo: boolean;
}

interface DiaHorario {
  ativo: boolean;
  abertura: string;
  fechamento: string;
}

interface HorarioSemana {
  seg: DiaHorario;
  ter: DiaHorario;
  qua: DiaHorario;
  qui: DiaHorario;
  sex: DiaHorario;
  sab: DiaHorario;
  dom: DiaHorario;
}

const DIAS_SEMANA = [
  { key: 'seg', label: 'Segunda' },
  { key: 'ter', label: 'Terça' },
  { key: 'qua', label: 'Quarta' },
  { key: 'qui', label: 'Quinta' },
  { key: 'sex', label: 'Sexta' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
] as const;

const HORARIOS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
];

const horarioPadrao: HorarioSemana = {
  seg: { ativo: true, abertura: '08:00', fechamento: '18:00' },
  ter: { ativo: true, abertura: '08:00', fechamento: '18:00' },
  qua: { ativo: true, abertura: '08:00', fechamento: '18:00' },
  qui: { ativo: true, abertura: '08:00', fechamento: '18:00' },
  sex: { ativo: true, abertura: '08:00', fechamento: '18:00' },
  sab: { ativo: true, abertura: '08:00', fechamento: '12:00' },
  dom: { ativo: false, abertura: '08:00', fechamento: '12:00' },
};

// Converter horário estruturado para string legível
function horarioParaString(horario: HorarioSemana): string {
  const grupos: { dias: string[]; abertura: string; fechamento: string }[] = [];

  for (const dia of DIAS_SEMANA) {
    const h = horario[dia.key];
    if (!h.ativo) continue;

    const ultimoGrupo = grupos[grupos.length - 1];
    if (ultimoGrupo && ultimoGrupo.abertura === h.abertura && ultimoGrupo.fechamento === h.fechamento) {
      ultimoGrupo.dias.push(dia.label);
    } else {
      grupos.push({ dias: [dia.label], abertura: h.abertura, fechamento: h.fechamento });
    }
  }

  return grupos.map(g => {
    const diasStr = g.dias.length > 2
      ? `${g.dias[0]} a ${g.dias[g.dias.length - 1]}`
      : g.dias.join(' e ');
    return `${diasStr} ${g.abertura.replace(':', 'h')}-${g.fechamento.replace(':', 'h')}`;
  }).join(', ');
}

// Tentar converter string para horário estruturado (fallback para padrão)
function stringParaHorario(str: string): HorarioSemana {
  // Por simplicidade, sempre retorna o padrão - a string é só para exibição
  return { ...horarioPadrao };
}

// Formatar CNPJ enquanto digita: 00.000.000/0000-00
function formatCnpj(value: string): string {
  const cleaned = value.replace(/\D/g, '').slice(0, 14);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
  if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
  if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
}

// Formatar telefone enquanto digita: (00) 00000-0000
function formatTelefone(value: string): string {
  const cleaned = value.replace(/\D/g, '').slice(0, 11);
  if (cleaned.length <= 2) return cleaned.length ? `(${cleaned}` : '';
  if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
}

export default function ConfiguracoesPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);

  // WhatsApp states
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Form states
  const [nomeOficina, setNomeOficina] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);

  // Buscar dados da empresa pelo CNPJ na Receita Federal
  const buscarDadosCnpj = async (cnpjValue: string) => {
    const cnpjLimpo = cnpjValue.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) return;

    setBuscandoCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (res.ok) {
        const data = await res.json();
        // Preencher campos automaticamente
        if (data.razao_social && !nomeOficina) {
          setNomeOficina(data.nome_fantasia || data.razao_social);
        }
        if (data.ddd_telefone_1 && !telefone) {
          const tel = data.ddd_telefone_1.replace(/\D/g, '');
          setTelefone(formatTelefone(tel));
        }
        if (data.logradouro && !endereco) {
          const end = `${data.logradouro}, ${data.numero || 'S/N'}${data.complemento ? ` - ${data.complemento}` : ''}, ${data.bairro} - ${data.municipio}/${data.uf}`;
          setEndereco(end);
        }
        toast.success('Dados da empresa carregados!');
      }
    } catch {
      // Silencioso - não mostrar erro se API falhar
    } finally {
      setBuscandoCnpj(false);
    }
  };

  // Handler do CNPJ com busca automática
  const handleCnpjChange = (value: string) => {
    const formatted = formatCnpj(value);
    setCnpj(formatted);
    // Buscar quando CNPJ estiver completo (14 dígitos)
    if (formatted.replace(/\D/g, '').length === 14) {
      buscarDadosCnpj(formatted);
    }
  };

  // Chatbot states
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [chatbotNome, setChatbotNome] = useState('LoopIA');
  const [chatbotHorario, setChatbotHorario] = useState<HorarioSemana>(horarioPadrao);
  const [chatbotBoasVindas, setChatbotBoasVindas] = useState('Olá! Sou a LoopIA, assistente virtual da oficina. Como posso ajudar?');

  // Serviços do banco
  const [servicos, setServicos] = useState<Servico[]>([]);

  // Filiais
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [showFilialModal, setShowFilialModal] = useState(false);
  const [editingFilial, setEditingFilial] = useState<Filial | null>(null);
  const [filialForm, setFilialForm] = useState({ nome: '', cnpj: '' });
  const [savingFilial, setSavingFilial] = useState(false);

  // Atualizar dia específico do horário
  const updateHorarioDia = (dia: keyof HorarioSemana, campo: keyof DiaHorario, valor: boolean | string) => {
    setChatbotHorario(prev => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor },
    }));
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/whatsapp/config');
      const data = await res.json();
      if (data.data) {
        setConfig(data.data);
        setNomeOficina(data.data.nomeOficina || '');
        setCnpj(data.data.cnpj || '');
        setTelefone(data.data.telefone || '');
        setEndereco(data.data.endereco || '');
        // Chatbot
        setChatbotEnabled(data.data.chatbotEnabled ?? true);
        setChatbotNome(data.data.chatbotNome || 'LoopIA');
        // Tentar carregar horário salvo como JSON, senão usar padrão
        try {
          const horarioSalvo = data.data.chatbotHorario;
          if (horarioSalvo && horarioSalvo.startsWith('{')) {
            setChatbotHorario(JSON.parse(horarioSalvo));
          } else {
            setChatbotHorario(horarioPadrao);
          }
        } catch {
          setChatbotHorario(horarioPadrao);
        }
        setChatbotBoasVindas(data.data.chatbotBoasVindas || 'Olá! Sou a LoopIA, assistente virtual da oficina.');
      }
    } catch (error) {
      console.error('Erro ao buscar config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServicos = async () => {
    try {
      const res = await fetch('/api/servicos');
      const data = await res.json();
      if (data.data) {
        setServicos(data.data.filter((s: Servico) => s.ativo));
      }
    } catch (error) {
      console.error('Erro ao buscar servicos:', error);
    }
  };

  const fetchFiliais = async () => {
    try {
      const res = await fetch('/api/filiais?ativo=todos');
      const data = await res.json();
      if (data.data) {
        setFiliais(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar filiais:', error);
    }
  };

  const handleSaveFilial = async () => {
    if (!filialForm.nome || !filialForm.cnpj) {
      toast.error('Preencha nome e CNPJ');
      return;
    }

    setSavingFilial(true);
    try {
      const url = editingFilial ? `/api/filiais/${editingFilial.id}` : '/api/filiais';
      const method = editingFilial ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filialForm),
      });

      if (res.ok) {
        toast.success(editingFilial ? 'Filial atualizada!' : 'Filial cadastrada!');
        setShowFilialModal(false);
        setEditingFilial(null);
        setFilialForm({ nome: '', cnpj: '' });
        fetchFiliais();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao salvar filial');
      }
    } catch (error) {
      toast.error('Erro ao salvar filial');
    } finally {
      setSavingFilial(false);
    }
  };

  const handleDeleteFilial = async (filial: Filial) => {
    if (!confirm(`Deseja realmente excluir a filial "${filial.nome}"?`)) return;

    try {
      const res = await fetch(`/api/filiais/${filial.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Filial excluída!');
        fetchFiliais();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao excluir filial');
      }
    } catch (error) {
      toast.error('Erro ao excluir filial');
    }
  };

  const openEditFilial = (filial: Filial) => {
    setEditingFilial(filial);
    setFilialForm({ nome: filial.nome, cnpj: filial.cnpj });
    setShowFilialModal(true);
  };

  const checkWhatsAppStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      console.log('[STATUS CHECK]', data);
      setWhatsappStatus(data);

      if (data.connected) {
        // Conectou! Limpar QR code e parar polling
        setQrCode(null);
        setPairCode(null);
        toast.success('WhatsApp conectado com sucesso!');
      } else if (data.qrcode && qrCode) {
        // QR code atualizado durante polling
        setQrCode(data.qrcode);
        if (data.paircode) setPairCode(data.paircode);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchServicos();
    fetchFiliais();
    checkWhatsAppStatus();
  }, []);

  // Polling para atualizar status quando conectando
  useEffect(() => {
    if (qrCode && !whatsappStatus?.connected) {
      const interval = setInterval(() => {
        checkWhatsAppStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [qrCode, whatsappStatus?.connected]);

  const handleSaveConfig = async () => {
    // Validar campos obrigatórios
    if (!cnpj.trim()) {
      toast.error('CNPJ é obrigatório');
      return;
    }
    if (!telefone.trim()) {
      toast.error('Telefone é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeOficina,
          cnpj,
          telefone,
          endereco,
          chatbotEnabled,
          chatbotNome,
          chatbotHorario: JSON.stringify(chatbotHorario),
          chatbotBoasVindas,
        }),
      });

      if (res.ok) {
        toast.success('Configuracoes salvas com sucesso!');
        fetchConfig();
      } else {
        toast.error('Erro ao salvar configuracoes');
      }
    } catch (error) {
      toast.error('Erro ao salvar configuracoes');
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch('/api/whatsapp/connect');
      const data = await res.json();
      console.log('[CONNECT]', data);

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.qrcode) {
        setQrCode(data.qrcode);
        setPairCode(data.paircode);
      } else if (data.status === 'connected') {
        toast.success('WhatsApp ja esta conectado!');
        checkWhatsAppStatus();
      } else if (data.status === 'connecting' || data.status === 'disconnected') {
        // Instância existe mas precisa reconectar - buscar status para obter QR
        toast.info('Obtendo QR Code...');
        // Fazer polling até obter QR code
        const pollForQR = async () => {
          const statusRes = await fetch('/api/whatsapp/status');
          const statusData = await statusRes.json();
          if (statusData.qrcode) {
            setQrCode(statusData.qrcode);
            if (statusData.paircode) setPairCode(statusData.paircode);
          } else if (statusData.connected) {
            toast.success('WhatsApp conectado!');
            setWhatsappStatus(statusData);
          } else {
            // Tentar novamente após 2 segundos
            setTimeout(pollForQR, 2000);
          }
        };
        pollForQR();
      }
    } catch (error) {
      toast.error('Erro ao conectar WhatsApp');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        toast.success('WhatsApp desconectado');
        setWhatsappStatus({ connected: false, configured: false });
        setQrCode(null);
        setPairCode(null);
      }
    } catch (error) {
      toast.error('Erro ao desconectar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#43A047]/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-[#43A047] rounded-full animate-spin"></div>
          </div>
          <p className="text-zinc-400 animate-pulse">Carregando configuracoes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Header title="Configuracoes" subtitle="Configure o sistema" />

      <div className="px-4 lg:px-8 space-y-8 max-w-4xl mx-auto">
        {/* Dados da Oficina */}
        <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800/50 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Building2 size={22} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Dados da Oficina</h2>
              <p className="text-sm text-zinc-400">Informacoes que aparecem nas O.S. e documentos</p>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Nome da Oficina</label>
              <input
                type="text"
                value={nomeOficina}
                onChange={(e) => setNomeOficina(e.target.value)}
                placeholder="Ex: Auto Center Silva"
                className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                CNPJ <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                {buscandoCnpj && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 size={18} className="animate-spin text-[#43A047]" />
                  </div>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Digite o CNPJ para preencher automaticamente</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Telefone <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                placeholder="(00) 00000-0000"
                className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Endereco</label>
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, numero, bairro"
                className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Botao Salvar */}
            <div className="md:col-span-2 flex justify-end pt-2">
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#43A047] to-[#2E7D32] hover:from-[#2E7D32] hover:to-[#43A047] rounded-xl text-white font-semibold transition-all duration-300 shadow-lg shadow-[#43A047]/25 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>

        {/* Filiais/Fornecedores */}
        <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <Store size={22} className="text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Filiais / Fornecedores</h2>
                <p className="text-sm text-zinc-400">Cadastre as filiais para associar aos produtos</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingFilial(null);
                setFilialForm({ nome: '', cnpj: '' });
                setShowFilialModal(true);
              }}
              className="flex items-center gap-2 px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400 font-medium hover:bg-purple-500/20 hover:border-purple-500/50 transition-all"
            >
              <Plus size={18} />
              Nova Filial
            </button>
          </div>

          <div className="p-6">
            {filiais.length > 0 ? (
              <div className="space-y-3">
                {filiais.map((filial) => (
                  <div
                    key={filial.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      filial.ativo
                        ? 'bg-zinc-900/50 border-zinc-800/50 hover:border-purple-500/30'
                        : 'bg-zinc-900/30 border-zinc-800/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                        <Store size={18} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{filial.nome}</p>
                        <p className="text-sm text-zinc-400 font-mono">{filial.cnpj}</p>
                      </div>
                      {!filial.ativo && (
                        <span className="px-2.5 py-1 bg-red-500/10 text-red-400 text-xs rounded-lg border border-red-500/20">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditFilial(filial)}
                        className="p-2 hover:bg-blue-500/10 rounded-lg text-zinc-400 hover:text-blue-400 transition-all"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteFilial(filial)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-400 transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-4 bg-purple-500/10 rounded-2xl w-fit mx-auto mb-4 border border-purple-500/20">
                  <Store size={28} className="text-purple-400" />
                </div>
                <p className="text-white font-medium">Nenhuma filial cadastrada</p>
                <p className="text-sm text-zinc-400 mt-1">
                  Cadastre filiais para associar aos produtos no estoque
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Filial */}
        {showFilialModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl w-full max-w-md shadow-2xl shadow-black/50">
              <div className="p-6 border-b border-zinc-800/50">
                <h2 className="text-xl font-bold text-white">
                  {editingFilial ? 'Editar Filial' : 'Nova Filial'}
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Nome da Filial</label>
                  <input
                    type="text"
                    value={filialForm.nome}
                    onChange={(e) => setFilialForm({ ...filialForm, nome: e.target.value })}
                    placeholder="Ex: Filial Centro"
                    className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">CNPJ</label>
                  <input
                    type="text"
                    value={filialForm.cnpj}
                    onChange={(e) => setFilialForm({ ...filialForm, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                    className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-zinc-800/50 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowFilialModal(false);
                    setEditingFilial(null);
                    setFilialForm({ nome: '', cnpj: '' });
                  }}
                  className="px-6 py-3 border border-zinc-700 rounded-xl text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveFilial}
                  disabled={savingFilial}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-500 rounded-xl text-white font-semibold transition-all duration-300 shadow-lg shadow-purple-500/25 disabled:opacity-50"
                >
                  {savingFilial ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : editingFilial ? (
                    'Salvar'
                  ) : (
                    'Cadastrar'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Integracao WhatsApp */}
        <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#25D366]/10 rounded-xl border border-[#25D366]/20">
                <MessageCircle size={22} className="text-[#25D366]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Integracao WhatsApp</h2>
                <p className="text-sm text-zinc-400">Envie lembretes e mensagens automaticas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {whatsappStatus?.connected ? (
                <span className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 text-sm font-medium rounded-xl border border-emerald-500/20">
                  <CheckCircle size={16} />
                  Conectado
                </span>
              ) : (
                <span className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 text-sm font-medium rounded-xl border border-red-500/20">
                  <XCircle size={16} />
                  Desconectado
                </span>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Status e Conexao */}
            {whatsappStatus?.connected ? (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#25D366]/20 rounded-2xl flex items-center justify-center border border-[#25D366]/30">
                      <Smartphone size={26} className="text-[#25D366]" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{whatsappStatus.profileName || 'WhatsApp Conectado'}</p>
                      <p className="text-sm text-zinc-400">{whatsappStatus.number}</p>
                      {whatsappStatus.isBusiness && (
                        <span className="text-xs text-[#25D366]">WhatsApp Business</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-medium hover:bg-red-500/20 transition-all"
                  >
                    <Unplug size={18} />
                    Desconectar
                  </button>
                </div>
              </div>
            ) : qrCode ? (
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 text-center">
                <p className="text-white font-semibold mb-4">Escaneie o QR Code com o WhatsApp</p>
                <div className="inline-block p-4 bg-white rounded-xl mb-4">
                  <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                </div>
                {pairCode && (
                  <div className="mb-4">
                    <p className="text-sm text-zinc-400 mb-2">Ou use o codigo de pareamento:</p>
                    <p className="text-2xl font-mono text-[#43A047] tracking-widest">{pairCode}</p>
                  </div>
                )}
                <p className="text-sm text-zinc-500">
                  Aguardando conexao... <Loader2 className="inline animate-spin ml-2" size={16} />
                </p>
                <button
                  onClick={() => { setQrCode(null); setPairCode(null); }}
                  className="mt-4 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-4 bg-[#25D366]/10 rounded-2xl w-fit mx-auto mb-4 border border-[#25D366]/20">
                  <MessageCircle size={32} className="text-[#25D366]" />
                </div>
                <p className="text-white font-semibold mb-2">Conecte seu WhatsApp</p>
                <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
                  Ao conectar, voce podera enviar mensagens automaticas de lembretes e acompanhamento para seus clientes.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#128C7E] hover:to-[#25D366] rounded-xl text-white font-semibold transition-all duration-300 shadow-lg shadow-[#25D366]/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {connecting ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <QrCode size={20} />
                    )}
                    {connecting ? 'Gerando QR Code...' : 'Conectar WhatsApp'}
                  </button>
                  <button
                    onClick={checkWhatsAppStatus}
                    disabled={checkingStatus}
                    className="p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-zinc-400 hover:text-white hover:border-[#25D366]/50 transition-all"
                    title="Verificar status"
                  >
                    <RefreshCw size={20} className={checkingStatus ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chatbot LoopIA */}
        <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <Bot size={22} className="text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Chatbot LoopIA</h2>
                <p className="text-sm text-zinc-400">Assistente virtual com inteligencia artificial</p>
              </div>
            </div>
            <button
              onClick={() => setChatbotEnabled(!chatbotEnabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${
                chatbotEnabled ? 'bg-gradient-to-r from-[#43A047] to-[#2E7D32]' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-lg ${
                  chatbotEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {chatbotEnabled && (
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Nome do Assistente</label>
                <input
                  type="text"
                  value={chatbotNome}
                  onChange={(e) => setChatbotNome(e.target.value)}
                  placeholder="LoopIA"
                  className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              {/* Horario de Funcionamento */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Horario de Funcionamento</label>
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 space-y-2">
                  {DIAS_SEMANA.map((dia) => (
                    <div
                      key={dia.key}
                      className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                        chatbotHorario[dia.key].ativo ? 'bg-zinc-800/50' : 'bg-transparent opacity-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => updateHorarioDia(dia.key, 'ativo', !chatbotHorario[dia.key].ativo)}
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                          chatbotHorario[dia.key].ativo
                            ? 'bg-[#43A047] border-[#43A047]'
                            : 'bg-transparent border-zinc-600'
                        }`}
                      >
                        {chatbotHorario[dia.key].ativo && (
                          <CheckCircle size={14} className="text-white" />
                        )}
                      </button>
                      <span className="w-20 text-sm text-white">{dia.label}</span>
                      {chatbotHorario[dia.key].ativo && (
                        <>
                          <select
                            value={chatbotHorario[dia.key].abertura}
                            onChange={(e) => updateHorarioDia(dia.key, 'abertura', e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-purple-500"
                          >
                            {HORARIOS.map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                          <span className="text-zinc-500">as</span>
                          <select
                            value={chatbotHorario[dia.key].fechamento}
                            onChange={(e) => updateHorarioDia(dia.key, 'fechamento', e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-purple-500"
                          >
                            {HORARIOS.map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </>
                      )}
                      {!chatbotHorario[dia.key].ativo && (
                        <span className="text-sm text-zinc-500">Fechado</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  Resumo: {horarioParaString(chatbotHorario) || 'Nenhum dia selecionado'}
                </p>
              </div>

              {/* Servicos do Sistema */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Servicos que a LoopIA conhece
                </label>
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
                  {servicos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {servicos.map((servico) => (
                        <div
                          key={servico.id}
                          className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                        >
                          <div className="flex items-center gap-2">
                            <Wrench size={14} className="text-purple-400" />
                            <span className="text-sm text-white">{servico.nome}</span>
                          </div>
                          <span className="text-sm text-[#43A047] font-semibold">
                            R$ {Number(servico.precoBase).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Wrench size={24} className="text-zinc-500 mx-auto mb-2" />
                      <p className="text-sm text-zinc-400">Nenhum servico cadastrado</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Cadastre servicos em Servicos para a LoopIA poder informar precos
                      </p>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
                  <DollarSign size={12} />
                  A LoopIA usa automaticamente os servicos e precos cadastrados no sistema
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Mensagem de Boas-Vindas</label>
                <textarea
                  value={chatbotBoasVindas}
                  onChange={(e) => setChatbotBoasVindas(e.target.value)}
                  placeholder="Ola! Sou a LoopIA, assistente virtual da oficina..."
                  rows={2}
                  className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                />
              </div>

              <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Bot size={20} className="text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-white font-medium">Como funciona</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      A LoopIA responde automaticamente as mensagens recebidas no WhatsApp usando inteligencia artificial (Gemini).
                      Ela conhece os servicos da oficina, precos, e dados dos clientes cadastrados.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!chatbotEnabled && (
            <div className="p-6 text-center">
              <div className="p-4 bg-zinc-800/50 rounded-2xl w-fit mx-auto mb-4">
                <Power size={28} className="text-zinc-500" />
              </div>
              <p className="text-white font-medium">Chatbot desativado</p>
              <p className="text-sm text-zinc-400 mt-1">Ative para responder mensagens automaticamente</p>
            </div>
          )}
        </div>

        {/* Botao Salvar */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#43A047] to-[#2E7D32] hover:from-[#2E7D32] hover:to-[#43A047] rounded-xl text-white font-semibold transition-all duration-300 shadow-lg shadow-[#43A047]/25 hover:shadow-[#43A047]/40 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Save size={20} />
            )}
            {saving ? 'Salvando...' : 'Salvar Configuracoes'}
          </button>
        </div>

        {/* Versao */}
        <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                <Settings size={24} className="text-zinc-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Sobre o LubIA</h3>
                <p className="text-sm text-zinc-400">Versao 1.0.0 - Sistema de Gestao Inteligente para Oficinas</p>
              </div>
            </div>
            <span className="px-4 py-2 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-xl border border-emerald-500/20">
              Atualizado
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
