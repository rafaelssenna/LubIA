'use client';

import { Search, User, ChevronDown, Sparkles, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const [showProfile, setShowProfile] = useState(false);
  const { user, logout } = useAuth();

  return (
    <header className="bg-card border-b border-border px-4 md:px-8 py-5">
      <div className="flex items-center justify-between gap-4 flex-wrap md:flex-nowrap">
        {/* Title */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-muted text-sm mt-1 flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              {subtitle}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative group hidden lg:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-light group-focus-within:text-primary transition-colors" size={18} />
            <input
              type="text"
              placeholder="Buscar cliente, placa, O.S..."
              className="bg-background border border-border rounded-2xl pl-11 pr-4 py-3 w-64 xl:w-80 text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary/50 focus:bg-card transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
            />
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-3 p-2 pr-4 rounded-2xl bg-background border border-border hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary via-primary-light to-primary-dark rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <User size={20} className="text-white" />
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-semibold text-foreground">{user?.nome || 'Usuário'}</p>
                <p className="text-xs text-muted">{user?.empresaNome || 'Empresa'}</p>
              </div>
              <ChevronDown size={16} className="text-primary-light group-hover:text-primary transition-colors ml-1" />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-3 w-56 glass-card rounded-2xl shadow-2xl z-50 animate-fade-in overflow-hidden">
                <div className="p-2">
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-3 text-sm text-danger hover:bg-danger/10 rounded-xl transition-all duration-300 flex items-center gap-3"
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
