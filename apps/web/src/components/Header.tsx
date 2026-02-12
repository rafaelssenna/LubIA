'use client';

import { Bell, Search, User, ChevronDown, Sparkles, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { user, logout } = useAuth();

  const notifications = [
    { id: 1, text: 'Veículo ABC-1234 pronto para entrega', time: '5 min', type: 'success' },
    { id: 2, text: 'Lembrete: Troca de óleo - João Silva', time: '1h', type: 'warning' },
    { id: 3, text: 'Nova O.S. criada #1234', time: '2h', type: 'info' },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500/10 border-l-[#43A047]';
      case 'warning': return 'bg-amber-500/10 border-l-amber-500';
      case 'info': return 'bg-blue-500/10 border-l-blue-500';
      default: return 'bg-gray-50 border-l-gray-300';
    }
  };

  return (
    <header className="glass border-b border-[#333333] px-4 md:px-8 py-5">
      <div className="flex items-center justify-between gap-4 flex-wrap md:flex-nowrap">
        {/* Title */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold text-[#E8E8E8] tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-[#9E9E9E] text-sm mt-1 flex items-center gap-2">
              <Sparkles size={14} className="text-[#43A047]" />
              {subtitle}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative group hidden lg:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#66BB6A] group-focus-within:text-[#43A047] transition-colors" size={18} />
            <input
              type="text"
              placeholder="Buscar cliente, placa, O.S..."
              className="bg-[#121212] border border-[#333333] rounded-2xl pl-11 pr-4 py-3 w-64 xl:w-80 text-sm text-[#E8E8E8] placeholder-gray-400 focus:outline-none focus:border-[#43A047]/50 focus:bg-white transition-all duration-300 focus:shadow-lg focus:shadow-[#43A047]/10"
            />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-3 rounded-2xl bg-[#121212] border border-[#333333] hover:border-[#43A047]/50 hover:bg-green-500/10 transition-all duration-300 group"
            >
              <Bell size={20} className="text-[#9E9E9E] group-hover:text-[#43A047] transition-colors" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-[#ef4444] to-[#dc2626] rounded-full text-xs text-white flex items-center justify-center font-bold shadow-lg shadow-red-500/30 animate-pulse">
                3
              </span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-3 w-96 glass-card rounded-2xl shadow-2xl z-50 animate-fade-in overflow-hidden">
                <div className="p-5 border-b border-[#333333] flex items-center justify-between">
                  <h3 className="font-bold text-[#E8E8E8] text-lg">Notificações</h3>
                  <span className="text-xs text-[#43A047] font-medium">3 novas</span>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  {notifications.map((notif, index) => (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-[#2A2A2A] hover:bg-[#121212] cursor-pointer transition-all duration-300 border-l-2 ${getTypeColor(notif.type)}`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <p className="text-sm text-[#E8E8E8] font-medium">{notif.text}</p>
                      <p className="text-xs text-[#9E9E9E] mt-2">{notif.time} atrás</p>
                    </div>
                  ))}
                </div>
                <div className="p-4 text-center bg-[#121212]">
                  <button className="text-sm text-[#43A047] hover:text-[#E8E8E8] font-medium transition-colors">
                    Ver todas as notificações
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-3 p-2 pr-4 rounded-2xl bg-[#121212] border border-[#333333] hover:border-[#43A047]/50 hover:bg-green-500/10 transition-all duration-300 group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-[#43A047] via-[#66BB6A] to-[#1B5E20] rounded-xl flex items-center justify-center shadow-lg shadow-[#43A047]/20">
                <User size={20} className="text-white" />
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-semibold text-[#E8E8E8]">{user?.nome || 'Usuário'}</p>
                <p className="text-xs text-[#9E9E9E]">{user?.empresaNome || 'Empresa'}</p>
              </div>
              <ChevronDown size={16} className="text-[#66BB6A] group-hover:text-[#43A047] transition-colors ml-1" />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-3 w-56 glass-card rounded-2xl shadow-2xl z-50 animate-fade-in overflow-hidden">
                <div className="p-2">
                  <button className="w-full text-left px-4 py-3 text-sm text-[#9E9E9E] hover:bg-[#121212] hover:text-[#E8E8E8] rounded-xl transition-all duration-300 flex items-center gap-3">
                    <User size={16} />
                    Meu Perfil
                  </button>
                  <button className="w-full text-left px-4 py-3 text-sm text-[#9E9E9E] hover:bg-[#121212] hover:text-[#E8E8E8] rounded-xl transition-all duration-300 flex items-center gap-3">
                    <Sparkles size={16} />
                    Configurações
                  </button>
                  <hr className="my-2 border-[#333333]" />
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 flex items-center gap-3"
                  >
                    <LogOut size={16} />
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
