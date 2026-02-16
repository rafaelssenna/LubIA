'use client';

import Header from '@/components/Header';
import {
  MessageCircle,
  Search,
  Send,
  CheckCheck,
  Phone,
  Image,
  Paperclip,
  Smile,
  Settings,
  Users,
  FileText,
  Bell,
  Zap,
  Calendar,
  Sparkles,
  RefreshCw,
  Archive,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/components/Toast';

interface Conversa {
  id: number;
  telefone: string;
  nome: string;
  clienteId: number | null;
  ultimaMensagem: string | null;
  ultimaData: string;
  naoLidas: number;
  arquivada: boolean;
}

interface Mensagem {
  id: number;
  tipo: string;
  conteudo: string;
  enviada: boolean;
  lida: boolean;
  dataEnvio: string;
}

interface ConversaDetalhes extends Conversa {
  cliente: {
    id: number;
    nome: string;
    telefone: string;
    email: string | null;
  } | null;
  mensagens: Mensagem[];
}

interface Stats {
  total: number;
  naoLidas: number;
  hoje: number;
}

const templates = [
  { id: 1, nome: 'Confirmacao Agendamento', icon: Calendar, texto: 'Ola! Seu agendamento foi confirmado para {data}. Aguardamos voce!' },
  { id: 2, nome: 'Veiculo Pronto', icon: CheckCheck, texto: 'Ola! Seu veiculo ja esta pronto para retirada. Pode passar quando quiser!' },
  { id: 3, nome: 'Lembrete Revisao', icon: Bell, texto: 'Ola! Passando para lembrar que seu veiculo esta chegando na hora da revisao. Quer agendar?' },
  { id: 4, nome: 'Orcamento', icon: FileText, texto: 'Segue o orcamento solicitado:\n\n{itens}\n\nTotal: R$ {total}\n\nConfirma o servico?' },
];

export default function WhatsAppPage() {
  const toast = useToast();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversaDetalhes | null>(null);
  const [message, setMessage] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState<Stats>({ total: 0, naoLidas: 0, hoje: 0 });
  const [busca, setBusca] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Buscar conversas
  const fetchConversas = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (busca) params.set('busca', busca);

      const res = await fetch(`/api/whatsapp/conversas?${params}`);
      const json = await res.json();

      if (json.data) {
        setConversas(json.data);
        setStats(json.stats);
      }
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
    } finally {
      setLoading(false);
    }
  }, [busca]);

  // Buscar mensagens de uma conversa
  const fetchMensagens = async (conversaId: number) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/whatsapp/conversas/${conversaId}`);
      const json = await res.json();

      if (json.data) {
        setSelectedConversation(json.data);
        // Atualizar contador na lista
        setConversas(prev => prev.map(c =>
          c.id === conversaId ? { ...c, naoLidas: 0 } : c
        ));
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Enviar mensagem
  const handleSend = async () => {
    if (!message.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: selectedConversation.telefone,
          text: message,
        }),
      });

      const json = await res.json();

      if (json.success) {
        setMessage('');
        // Recarregar mensagens
        await fetchMensagens(selectedConversation.id);
        await fetchConversas();
        toast.success('Mensagem enviada!');
      } else {
        toast.error(json.error || 'Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('Erro ao enviar:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  // Aplicar template
  const applyTemplate = (texto: string) => {
    setMessage(texto);
    setShowTemplates(false);
  };

  // Scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.mensagens]);

  // Carregar conversas inicialmente
  useEffect(() => {
    fetchConversas();
  }, [fetchConversas]);

  // Auto-refresh a cada 10 segundos
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchConversas();
      if (selectedConversation) {
        fetchMensagens(selectedConversation.id);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, selectedConversation, fetchConversas]);

  // Formatar data
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading && conversas.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#25D366]/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-[#25D366] rounded-full animate-spin"></div>
          </div>
          <p className="text-zinc-400 animate-pulse">Carregando conversas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Header title="WhatsApp Business" subtitle="Central de comunicacao com clientes" />

      <div className="px-4 lg:px-8 space-y-8">
        {/* Stats Rapidos */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-8">
          {/* Conversas */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-[#25D366]/20 to-[#25D366]/5 rounded-2xl p-6 border border-[#25D366]/20 hover:border-[#25D366]/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#25D366]/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-[#25D366]/20 rounded-xl">
                  <MessageCircle className="h-6 w-6 text-[#25D366]" />
                </div>
                <span className="text-xs font-medium text-[#25D366] bg-[#25D366]/10 px-2 py-1 rounded-full">Total</span>
              </div>
              <p className="text-4xl font-bold text-white mb-1">{stats.total}</p>
              <p className="text-sm text-zinc-400">conversas</p>
            </div>
          </div>

          {/* Ativas Hoje */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-2xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
                <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">Hoje</span>
              </div>
              <p className="text-4xl font-bold text-white mb-1">{stats.hoje}</p>
              <p className="text-sm text-zinc-400">ativas hoje</p>
            </div>
          </div>

          {/* Nao Lidas */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-amber-500/20 to-amber-500/5 rounded-2xl p-6 border border-amber-500/20 hover:border-amber-500/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-500/20 rounded-xl">
                  <Bell className="h-6 w-6 text-amber-400" />
                </div>
                <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">Pendentes</span>
              </div>
              <p className="text-4xl font-bold text-white mb-1">{stats.naoLidas}</p>
              <p className="text-sm text-zinc-400">nao lidas</p>
            </div>
          </div>

          {/* Auto-refresh */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-2xl p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl">
                  <Zap className="h-6 w-6 text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">Status</span>
              </div>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`text-lg font-bold px-3 py-1.5 rounded-lg transition-all ${autoRefresh ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}
              >
                {autoRefresh ? 'Auto ON' : 'Auto OFF'}
              </button>
              <p className="text-sm text-zinc-400 mt-2">atualizacao</p>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl overflow-hidden h-[calc(100vh-380px)] flex shadow-2xl shadow-black/50">
          {/* Lista de Conversas */}
          <div className="w-96 border-r border-zinc-800/50 flex flex-col">
            <div className="p-4 border-b border-zinc-800/50 flex gap-2">
              <div className="relative group flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#25D366] transition-colors" size={18} />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar conversa..."
                  className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#25D366]/50 focus:ring-2 focus:ring-[#25D366]/20 transition-all"
                />
              </div>
              <button
                onClick={() => fetchConversas()}
                className="p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-zinc-400 hover:border-[#25D366]/40 hover:text-[#25D366] transition-all"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="relative w-8 h-8">
                    <div className="w-8 h-8 border-3 border-[#25D366]/20 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-8 h-8 border-3 border-transparent border-t-[#25D366] rounded-full animate-spin"></div>
                  </div>
                </div>
              ) : conversas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-zinc-500">
                  <MessageCircle size={32} className="mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma conversa</p>
                </div>
              ) : (
                conversas.map((conversa) => (
                  <div
                    key={conversa.id}
                    onClick={() => fetchMensagens(conversa.id)}
                    className={`p-4 border-b border-zinc-800/50 cursor-pointer transition-all duration-200 ${
                      selectedConversation?.id === conversa.id
                        ? 'bg-gradient-to-r from-[#25D366]/20 to-transparent border-l-4 border-l-[#25D366]'
                        : 'hover:bg-zinc-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#25D366] to-[#128C7E] rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-[#25D366]/20">
                          {conversa.nome.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-white truncate">{conversa.nome}</p>
                          <span className="text-xs text-zinc-500">{formatDate(conversa.ultimaData)}</span>
                        </div>
                        <p className="text-sm text-zinc-400 truncate mt-1">{conversa.ultimaMensagem || 'Nova conversa'}</p>
                      </div>
                      {conversa.naoLidas > 0 && (
                        <div className="w-6 h-6 bg-gradient-to-r from-[#25D366] to-[#128C7E] rounded-full flex items-center justify-center shadow-lg shadow-[#25D366]/30">
                          <span className="text-xs text-white font-bold">{conversa.naoLidas}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Area de Chat */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Header do Chat */}
                <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/50">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-11 h-11 bg-gradient-to-br from-[#25D366] to-[#128C7E] rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-[#25D366]/20">
                        {selectedConversation.nome.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-white">{selectedConversation.nome}</p>
                      <p className="text-xs text-zinc-400 flex items-center gap-2">
                        <span>{selectedConversation.telefone}</span>
                        {selectedConversation.cliente && (
                          <>
                            <span className="opacity-50">•</span>
                            <span className="text-[#25D366]">Cliente cadastrado</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2.5 hover:bg-zinc-800 rounded-lg transition-all text-zinc-400 hover:text-[#25D366]">
                      <Phone size={18} />
                    </button>
                    <button className="p-2.5 hover:bg-zinc-800 rounded-lg transition-all text-zinc-400 hover:text-white">
                      <Archive size={18} />
                    </button>
                  </div>
                </div>

                {/* Mensagens */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ background: 'radial-gradient(ellipse at bottom, rgba(37, 211, 102, 0.03), transparent)' }}>
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="relative w-10 h-10">
                        <div className="w-10 h-10 border-4 border-[#25D366]/20 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-[#25D366] rounded-full animate-spin"></div>
                      </div>
                    </div>
                  ) : selectedConversation.mensagens.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                      <div className="p-4 bg-[#25D366]/10 rounded-2xl border border-[#25D366]/20 mb-4">
                        <MessageCircle size={40} className="text-[#25D366]" />
                      </div>
                      <p className="text-white font-medium">Nenhuma mensagem ainda</p>
                      <p className="text-sm text-zinc-400 mt-1">Envie uma mensagem para iniciar a conversa</p>
                    </div>
                  ) : (
                    selectedConversation.mensagens.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.enviada ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] p-4 rounded-2xl shadow-lg ${
                            msg.enviada
                              ? 'bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white rounded-br-md shadow-[#25D366]/20'
                              : 'bg-zinc-800/80 text-white rounded-bl-md border border-zinc-700/50'
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.conteudo}</p>
                          <div className={`flex items-center gap-1.5 mt-2 ${msg.enviada ? 'justify-end' : ''}`}>
                            <span className={`text-xs ${msg.enviada ? 'text-white/70' : 'text-zinc-500'}`}>
                              {formatTime(msg.dataEnvio)}
                            </span>
                            {msg.enviada && msg.lida && (
                              <CheckCheck size={14} className="text-white/70" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Templates */}
                {showTemplates && (
                  <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/50">
                    <p className="text-sm text-zinc-400 mb-3 flex items-center gap-2">
                      <Sparkles size={14} className="text-[#25D366]" />
                      Templates rapidos:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => applyTemplate(template.texto)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-300 hover:text-white hover:border-[#25D366]/50 hover:bg-[#25D366]/10 transition-all text-sm font-medium"
                        >
                          <template.icon size={16} className="text-[#25D366]" />
                          {template.nome}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input de Mensagem */}
                <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/50">
                  <div className="flex items-center gap-2">
                    <button className="p-2.5 hover:bg-zinc-800 rounded-lg transition-all text-zinc-400 hover:text-amber-400">
                      <Smile size={20} />
                    </button>
                    <button className="p-2.5 hover:bg-zinc-800 rounded-lg transition-all text-zinc-400 hover:text-white">
                      <Paperclip size={20} />
                    </button>
                    <button className="p-2.5 hover:bg-zinc-800 rounded-lg transition-all text-zinc-400 hover:text-blue-400">
                      <Image size={20} />
                    </button>
                    <button
                      onClick={() => setShowTemplates(!showTemplates)}
                      className={`p-2.5 rounded-lg transition-all ${
                        showTemplates ? 'bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30' : 'hover:bg-zinc-800 text-zinc-400 hover:text-[#25D366]'
                      }`}
                    >
                      <FileText size={20} />
                    </button>
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      placeholder="Digite uma mensagem..."
                      disabled={sending}
                      className="flex-1 bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#25D366]/50 focus:ring-2 focus:ring-[#25D366]/20 transition-all disabled:opacity-50"
                    />
                    <button
                      onClick={handleSend}
                      disabled={sending || !message.trim()}
                      className="p-3.5 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#128C7E] hover:to-[#25D366] rounded-xl text-white transition-all shadow-lg shadow-[#25D366]/30 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
                <div className="p-6 bg-gradient-to-br from-[#25D366]/20 to-[#128C7E]/10 rounded-3xl border border-[#25D366]/20 mb-6">
                  <MessageCircle size={48} className="text-[#25D366]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Central de Mensagens</h3>
                <p className="text-center max-w-md text-zinc-400">
                  Selecione uma conversa ao lado para visualizar e responder mensagens
                </p>
                {conversas.length === 0 && !loading && (
                  <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
                    <AlertCircle size={20} className="text-amber-400" />
                    <p className="text-sm text-amber-200">
                      Nenhuma conversa ainda. As conversas aparecerao quando clientes entrarem em contato.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
