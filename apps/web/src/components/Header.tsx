'use client';

import { Search, User, ChevronDown, Sparkles, LogOut, Users, Car, FileText, Loader2, Package } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

interface SearchResult {
  tipo: 'cliente' | 'veiculo' | 'ordem' | 'produto';
  id: number;
  titulo: string;
  subtitulo: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const [showProfile, setShowProfile] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/busca-global?q=${encodeURIComponent(searchTerm)}`);
        const data = await res.json();
        setSearchResults(data.results || []);
        setShowResults(true);
      } catch (error) {
        console.error('Erro na busca:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setSearchTerm('');
    switch (result.tipo) {
      case 'cliente':
        router.push(`/clientes?id=${result.id}`);
        break;
      case 'veiculo':
        router.push(`/veiculos?id=${result.id}`);
        break;
      case 'ordem':
        router.push(`/ordens?id=${result.id}`);
        break;
      case 'produto':
        router.push(`/estoque?id=${result.id}`);
        break;
    }
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'cliente': return <Users size={16} className="text-blue-400" />;
      case 'veiculo': return <Car size={16} className="text-green-400" />;
      case 'ordem': return <FileText size={16} className="text-amber-400" />;
      case 'produto': return <Package size={16} className="text-purple-400" />;
      default: return <Search size={16} />;
    }
  };

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
          <div className="relative group hidden lg:block" ref={searchRef}>
            {searching ? (
              <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 text-primary animate-spin" size={18} />
            ) : (
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-light group-focus-within:text-primary transition-colors" size={18} />
            )}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              placeholder="Buscar cliente, placa, O.S..."
              className="bg-background border border-border rounded-2xl pl-11 pr-4 py-3 w-64 xl:w-80 text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary/50 focus:bg-card transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
            />

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                {searchResults.map((result, index) => (
                  <button
                    key={`${result.tipo}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-background transition-colors text-left border-b border-border/50 last:border-0"
                  >
                    {getIcon(result.tipo)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{result.titulo}</p>
                      <p className="text-xs text-muted truncate">{result.subtitulo}</p>
                    </div>
                    <span className="text-xs text-muted bg-background px-2 py-1 rounded-lg capitalize">{result.tipo}</span>
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {showResults && searchResults.length === 0 && searchTerm.length >= 2 && !searching && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl z-50 p-4 text-center">
                <p className="text-sm text-muted">Nenhum resultado encontrado</p>
              </div>
            )}
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
