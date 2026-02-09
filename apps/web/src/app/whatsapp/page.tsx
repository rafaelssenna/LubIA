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

  return (
    <div className="min-h-screen bg-[#121212]">
      <Header title="WhatsApp Business" subtitle="Central de comunicacao com clientes" />

      <div className="p-6">
        {/* Stats Rapidos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-fade-in">
          <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-5 hover:border-[#25D366]/30 hover:shadow-lg hover:shadow-[#25D366]/5 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-[#25D366] to-[#128C7E] rounded-xl shadow-lg shadow-[#25D366]/20 ring-1 ring-[#25D366]/20">
                <MessageCircle size={22} className="text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-[#E8E8E8]">{stats.total}</p>
                <p className="text-xs text-[#6B7280]">Conversas</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-5 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/20">
                <Users size={22} className="text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-[#E8E8E8]">{stats.hoje}</p>
                <p className="text-xs text-[#6B7280]">Ativas hoje</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-5 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg shadow-amber-500/20 ring-1 ring-amber-500/20">
                <Bell size={22} className="text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-[#E8E8E8]">{stats.naoLidas}</p>
                <p className="text-xs text-[#6B7280]">Nao lidas</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-5 hover:border-[#43A047]/30 hover:shadow-lg hover:shadow-[#43A047]/5 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-[#43A047] to-[#1B5E20] rounded-xl shadow-lg shadow-green-500/10 ring-1 ring-[#43A047]/20">
                <Zap size={22} className="text-white" />
              </div>
              <div>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`text-xs px-2 py-1 rounded ${autoRefresh ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}
                >
                  {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                </button>
                <p className="text-xs text-[#6B7280] mt-1">Atualizacao</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-[#1E1E1E] border border-[#333333] rounded-3xl overflow-hidden h-[calc(100vh-320px)] flex animate-fade-in-up shadow-2xl" style={{ animationDelay: '0.1s' }}>
          {/* Lista de Conversas */}
          <div className="w-96 border-r border-[#333333] flex flex-col">
            <div className="p-5 border-b border-[#333333] flex gap-2">
              <div className="relative group flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280] group-focus-within:text-[#25D366] transition-colors" size={18} />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar conversa..."
                  className="w-full bg-[#121212] border border-[#333333] rounded-2xl pl-11 pr-4 py-3 text-sm text-[#E8E8E8] placeholder-[#6B7280] focus:outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/20 transition-all duration-300"
                />
              </div>
              <button
                onClick={() => fetchConversas()}
                className="p-3 hover:bg-[#121212] rounded-xl transition-all text-[#6B7280] hover:text-[#25D366]"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="animate-spin text-[#25D366]" size={24} />
                </div>
              ) : conversas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-[#6B7280]">
                  <MessageCircle size={32} className="mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma conversa</p>
                </div>
              ) : (
                conversas.map((conversa, index) => (
                  <div
                    key={conversa.id}
                    onClick={() => fetchMensagens(conversa.id)}
                    className={`p-4 border-b border-[#333333] cursor-pointer transition-all duration-300 ${
                      selectedConversation?.id === conversa.id
                        ? 'bg-gradient-to-r from-[#25D366]/20 to-transparent border-l-4 border-l-[#25D366]'
                        : 'hover:bg-[#121212]'
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-[#25D366] to-[#128C7E] rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-[#25D366]/20">
                          {conversa.nome.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-[#E8E8E8] truncate">{conversa.nome}</p>
                          <span className="text-xs text-[#6B7280]">{formatDate(conversa.ultimaData)}</span>
                        </div>
                        <p className="text-sm text-[#6B7280] truncate mt-1">{conversa.ultimaMensagem || 'Nova conversa'}</p>
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
                <div className="p-5 border-b border-[#333333] flex items-center justify-between bg-[#121212]">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#25D366] to-[#128C7E] rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-[#25D366]/20">
                        {selectedConversation.nome.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-[#E8E8E8] text-lg">{selectedConversation.nome}</p>
                      <p className="text-xs text-[#6B7280] flex items-center gap-2">
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
                    <button className="p-3 hover:bg-[#121212] rounded-xl transition-all duration-300 text-[#9E9E9E] hover:text-[#25D366]">
                      <Phone size={20} />
                    </button>
                    <button className="p-3 hover:bg-[#121212] rounded-xl transition-all duration-300 text-[#9E9E9E] hover:text-[#E8E8E8]">
                      <Archive size={20} />
                    </button>
                  </div>
                </div>

                {/* Mensagens */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar" style={{ background: 'radial-gradient(ellipse at bottom, rgba(37, 211, 102, 0.03), transparent)' }}>
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="animate-spin text-[#25D366]" size={32} />
                    </div>
                  ) : selectedConversation.mensagens.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[#6B7280]">
                      <MessageCircle size={48} className="mb-4 opacity-30" />
                      <p>Nenhuma mensagem ainda</p>
                      <p className="text-sm mt-1">Envie uma mensagem para iniciar a conversa</p>
                    </div>
                  ) : (
                    selectedConversation.mensagens.map((msg, index) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.enviada ? 'justify-end' : 'justify-start'} animate-fade-in`}
                        style={{ animationDelay: `${index * 0.02}s` }}
                      >
                        <div
                          className={`max-w-[70%] p-4 rounded-2xl shadow-lg ${
                            msg.enviada
                              ? 'bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white rounded-br-md shadow-[#25D366]/20'
                              : 'glass-card text-[#E8E8E8] rounded-bl-md'
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.conteudo}</p>
                          <div className={`flex items-center gap-1.5 mt-2 ${msg.enviada ? 'justify-end' : ''}`}>
                            <span className={`text-xs ${msg.enviada ? 'text-white/70' : 'text-[#6B7280]'}`}>
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
                  <div className="p-4 border-t border-[#333333] bg-[#121212] animate-fade-in">
                    <p className="text-sm text-[#6B7280] mb-3 flex items-center gap-2">
                      <Sparkles size={14} className="text-[#25D366]" />
                      Templates rapidos:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => applyTemplate(template.texto)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-[#121212] border border-[#333333] rounded-xl text-[#9E9E9E] hover:text-[#E8E8E8] hover:border-[#25D366]/50 hover:bg-[#25D366]/10 transition-all duration-300 text-sm font-medium"
                        >
                          <template.icon size={16} className="text-[#25D366]" />
                          {template.nome}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input de Mensagem */}
                <div className="p-5 border-t border-[#333333] bg-[#121212]">
                  <div className="flex items-center gap-3">
                    <button className="p-3 hover:bg-[#121212] rounded-xl transition-all duration-300 text-[#9E9E9E] hover:text-amber-400">
                      <Smile size={22} />
                    </button>
                    <button className="p-3 hover:bg-[#121212] rounded-xl transition-all duration-300 text-[#9E9E9E] hover:text-[#E8E8E8]">
                      <Paperclip size={22} />
                    </button>
                    <button className="p-3 hover:bg-[#121212] rounded-xl transition-all duration-300 text-[#9E9E9E] hover:text-blue-400">
                      <Image size={22} />
                    </button>
                    <button
                      onClick={() => setShowTemplates(!showTemplates)}
                      className={`p-3 rounded-xl transition-all duration-300 ${
                        showTemplates ? 'bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30' : 'hover:bg-[#121212] text-[#9E9E9E] hover:text-[#25D366]'
                      }`}
                    >
                      <FileText size={22} />
                    </button>
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      placeholder="Digite uma mensagem..."
                      disabled={sending}
                      className="flex-1 bg-[#121212] border border-[#333333] rounded-2xl px-5 py-3.5 text-[#E8E8E8] placeholder-[#6B7280] focus:outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/20 transition-all duration-300 disabled:opacity-50"
                    />
                    <button
                      onClick={handleSend}
                      disabled={sending || !message.trim()}
                      className="p-4 bg-gradient-to-r from-[#25D366] to-[#128C7E] rounded-2xl text-white hover:opacity-90 transition-all duration-300 shadow-lg shadow-[#25D366]/30 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {sending ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[#6B7280]">
                <div className="w-24 h-24 bg-gradient-to-br from-[#25D366]/20 to-[#128C7E]/20 rounded-3xl flex items-center justify-center mb-6">
                  <MessageCircle size={48} className="text-[#25D366]" />
                </div>
                <h3 className="text-xl font-semibold text-[#E8E8E8] mb-2">Central de Mensagens</h3>
                <p className="text-center max-w-md">
                  Selecione uma conversa ao lado para visualizar e responder mensagens
                </p>
                {conversas.length === 0 && !loading && (
                  <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3">
                    <AlertCircle size={20} className="text-amber-500" />
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
