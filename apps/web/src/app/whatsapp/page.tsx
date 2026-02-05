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
} from 'lucide-react';
import { useState } from 'react';

const conversas = [
  {
    id: 1,
    cliente: 'João Silva',
    telefone: '(11) 99999-1234',
    ultimaMensagem: 'Ok, confirmo o horário de amanhã às 8h!',
    horario: '10:30',
    naoLidas: 0,
    online: true,
  },
  {
    id: 2,
    cliente: 'Maria Santos',
    telefone: '(11) 98888-5678',
    ultimaMensagem: 'Quanto fica a revisão completa?',
    horario: '09:45',
    naoLidas: 2,
    online: true,
  },
  {
    id: 3,
    cliente: 'Pedro Oliveira',
    telefone: '(11) 97777-9012',
    ultimaMensagem: 'Veículo entregue, obrigado pelo serviço!',
    horario: 'Ontem',
    naoLidas: 0,
    online: false,
  },
  {
    id: 4,
    cliente: 'Ana Costa',
    telefone: '(11) 96666-3456',
    ultimaMensagem: 'Posso passar às 14h?',
    horario: 'Ontem',
    naoLidas: 1,
    online: false,
  },
  {
    id: 5,
    cliente: 'Carlos Ferreira',
    telefone: '(11) 95555-7890',
    ultimaMensagem: 'Foto da peça antiga enviada',
    horario: '25/01',
    naoLidas: 0,
    online: false,
  },
];

const mensagens = [
  {
    id: 1,
    tipo: 'recebida',
    texto: 'Olá, bom dia! Gostaria de agendar uma troca de óleo para meu Civic.',
    horario: '09:00',
  },
  {
    id: 2,
    tipo: 'enviada',
    texto: 'Bom dia, João! Claro, podemos fazer amanhã às 8h, 10h ou 14h. Qual horário fica melhor para você?',
    horario: '09:05',
    status: 'lida',
  },
  {
    id: 3,
    tipo: 'recebida',
    texto: 'Amanhã às 8h está ótimo!',
    horario: '09:15',
  },
  {
    id: 4,
    tipo: 'enviada',
    texto: 'Perfeito! Agendamento confirmado para amanhã (28/01) às 8h - Troca de Óleo 5W30 + Filtro. O valor fica R$ 320,00. Endereço: Rua das Oficinas, 123.',
    horario: '09:20',
    status: 'lida',
  },
  {
    id: 5,
    tipo: 'recebida',
    texto: 'Ok, confirmo o horário de amanhã às 8h!',
    horario: '10:30',
  },
];

const templates = [
  { id: 1, nome: 'Confirmação de Agendamento', icon: Calendar },
  { id: 2, nome: 'Veículo Pronto', icon: CheckCheck },
  { id: 3, nome: 'Lembrete de Revisão', icon: Bell },
  { id: 4, nome: 'Orçamento', icon: FileText },
];

export default function WhatsAppPage() {
  const [selectedConversation, setSelectedConversation] = useState(conversas[0]);
  const [message, setMessage] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  return (
    <div className="min-h-screen bg-[#eef0f5]">
      <Header title="WhatsApp Business" subtitle="Central de comunicação com clientes" />

      <div className="p-6">
        {/* Stats Rápidos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-fade-in">
          <div className="bg-[#f8f9fb] border border-[#dde0e7] rounded-2xl p-5 hover:border-[#25D366]/30 hover:shadow-lg hover:shadow-[#25D366]/5 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-[#25D366] to-[#128C7E] rounded-xl shadow-lg shadow-[#25D366]/20 ring-1 ring-[#25D366]/20">
                <MessageCircle size={22} className="text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">156</p>
                <p className="text-xs text-[#6B7280]">Mensagens (hoje)</p>
              </div>
            </div>
          </div>
          <div className="bg-[#f8f9fb] border border-[#dde0e7] rounded-2xl p-5 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/20">
                <Users size={22} className="text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">23</p>
                <p className="text-xs text-[#6B7280]">Conversas ativas</p>
              </div>
            </div>
          </div>
          <div className="bg-[#f8f9fb] border border-[#dde0e7] rounded-2xl p-5 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg shadow-amber-500/20 ring-1 ring-amber-500/20">
                <Bell size={22} className="text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">5</p>
                <p className="text-xs text-[#6B7280]">Não lidas</p>
              </div>
            </div>
          </div>
          <div className="bg-[#f8f9fb] border border-[#dde0e7] rounded-2xl p-5 hover:border-[#22c55e]/30 hover:shadow-lg hover:shadow-[#22c55e]/5 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-[#22c55e] to-[#166534] rounded-xl shadow-lg shadow-green-100 ring-1 ring-[#22c55e]/20">
                <Zap size={22} className="text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">89%</p>
                <p className="text-xs text-[#6B7280]">Taxa de resposta</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-[#f8f9fb] border border-[#dde0e7] rounded-3xl overflow-hidden h-[calc(100vh-320px)] flex animate-fade-in-up shadow-2xl" style={{ animationDelay: '0.1s' }}>
          {/* Lista de Conversas */}
          <div className="w-96 border-r border-[#dde0e7] flex flex-col">
            <div className="p-5 border-b border-[#dde0e7]">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280] group-focus-within:text-[#25D366] transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Buscar conversa..."
                  className="w-full bg-[#eef0f5] border border-[#dde0e7] rounded-2xl pl-11 pr-4 py-3 text-sm text-gray-900 placeholder-[#6B7280] focus:outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/20 transition-all duration-300"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {conversas.map((conversa, index) => (
                <div
                  key={conversa.id}
                  onClick={() => setSelectedConversation(conversa)}
                  className={`p-4 border-b border-[#dde0e7] cursor-pointer transition-all duration-300 ${
                    selectedConversation.id === conversa.id
                      ? 'bg-gradient-to-r from-[#25D366]/20 to-transparent border-l-4 border-l-[#25D366]'
                      : 'hover:bg-[#eef0f5]'
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-br from-[#25D366] to-[#128C7E] rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-[#25D366]/20">
                        {conversa.cliente.charAt(0)}
                      </div>
                      {conversa.online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#25D366] rounded-full border-2 border-white animate-pulse"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-900 truncate">{conversa.cliente}</p>
                        <span className="text-xs text-[#6B7280]">{conversa.horario}</span>
                      </div>
                      <p className="text-sm text-[#6B7280] truncate mt-1">{conversa.ultimaMensagem}</p>
                    </div>
                    {conversa.naoLidas > 0 && (
                      <div className="w-6 h-6 bg-gradient-to-r from-[#25D366] to-[#128C7E] rounded-full flex items-center justify-center shadow-lg shadow-[#25D366]/30">
                        <span className="text-xs text-white font-bold">{conversa.naoLidas}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Área de Chat */}
          <div className="flex-1 flex flex-col">
            {/* Header do Chat */}
            <div className="p-5 border-b border-[#dde0e7] flex items-center justify-between bg-[#eef0f5]">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#25D366] to-[#128C7E] rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-[#25D366]/20">
                    {selectedConversation.cliente.charAt(0)}
                  </div>
                  {selectedConversation.online && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#25D366] rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-lg">{selectedConversation.cliente}</p>
                  <p className="text-xs text-[#6B7280] flex items-center gap-2">
                    {selectedConversation.online ? (
                      <>
                        <span className="w-2 h-2 bg-[#25D366] rounded-full animate-pulse"></span>
                        <span className="text-[#25D366]">Online</span>
                      </>
                    ) : (
                      <span>Offline</span>
                    )}
                    <span className="opacity-50">•</span>
                    <span>{selectedConversation.telefone}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-3 hover:bg-[#eef0f5] rounded-xl transition-all duration-300 text-gray-500 hover:text-[#25D366]">
                  <Phone size={20} />
                </button>
                <button className="p-3 hover:bg-[#eef0f5] rounded-xl transition-all duration-300 text-gray-500 hover:text-gray-900">
                  <Settings size={20} />
                </button>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar" style={{ background: 'radial-gradient(ellipse at bottom, rgba(37, 211, 102, 0.03), transparent)' }}>
              {mensagens.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.tipo === 'enviada' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div
                    className={`max-w-[70%] p-4 rounded-2xl shadow-lg ${
                      msg.tipo === 'enviada'
                        ? 'bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white rounded-br-md shadow-[#25D366]/20'
                        : 'glass-card text-gray-900 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.texto}</p>
                    <div className={`flex items-center gap-1.5 mt-2 ${msg.tipo === 'enviada' ? 'justify-end' : ''}`}>
                      <span className={`text-xs ${msg.tipo === 'enviada' ? 'text-white/70' : 'text-[#6B7280]'}`}>
                        {msg.horario}
                      </span>
                      {msg.tipo === 'enviada' && msg.status === 'lida' && (
                        <CheckCheck size={14} className="text-white/70" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Templates */}
            {showTemplates && (
              <div className="p-4 border-t border-[#dde0e7] bg-[#eef0f5] animate-fade-in">
                <p className="text-sm text-[#6B7280] mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-[#25D366]" />
                  Templates rápidos:
                </p>
                <div className="flex flex-wrap gap-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#eef0f5] border border-[#dde0e7] rounded-xl text-gray-500 hover:text-gray-900 hover:border-[#25D366]/50 hover:bg-[#25D366]/10 transition-all duration-300 text-sm font-medium"
                    >
                      <template.icon size={16} className="text-[#25D366]" />
                      {template.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input de Mensagem */}
            <div className="p-5 border-t border-[#dde0e7] bg-[#eef0f5]">
              <div className="flex items-center gap-3">
                <button className="p-3 hover:bg-[#eef0f5] rounded-xl transition-all duration-300 text-gray-500 hover:text-amber-400">
                  <Smile size={22} />
                </button>
                <button className="p-3 hover:bg-[#eef0f5] rounded-xl transition-all duration-300 text-gray-500 hover:text-gray-900">
                  <Paperclip size={22} />
                </button>
                <button className="p-3 hover:bg-[#eef0f5] rounded-xl transition-all duration-300 text-gray-500 hover:text-blue-400">
                  <Image size={22} />
                </button>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className={`p-3 rounded-xl transition-all duration-300 ${
                    showTemplates ? 'bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30' : 'hover:bg-[#eef0f5] text-gray-500 hover:text-[#25D366]'
                  }`}
                >
                  <FileText size={22} />
                </button>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 bg-[#eef0f5] border border-[#dde0e7] rounded-2xl px-5 py-3.5 text-gray-900 placeholder-[#6B7280] focus:outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/20 transition-all duration-300"
                />
                <button className="p-4 bg-gradient-to-r from-[#25D366] to-[#128C7E] rounded-2xl text-white hover:opacity-90 transition-all duration-300 shadow-lg shadow-[#25D366]/30 hover:scale-105">
                  <Send size={22} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
