'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Car,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MessageCircle,
  Package,
  ClipboardList,
  FileText,
  AlertCircle,
  UserCog,
  ShoppingCart,
  History,
  Clock,
  FolderOpen,
  Briefcase,
  Wallet,
  RotateCcw,
  CreditCard,
  Lightbulb,
  Shield,
  Menu,
  X,
  Target,
} from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import FinancialToggle from './FinancialToggle';

type RoleUsuario = 'ADMIN' | 'GERENTE' | 'ATENDENTE' | 'VENDEDOR';

// Permissoes por role
const ROLE_PERMISSIONS: Record<RoleUsuario, string[]> = {
  ADMIN: ['*'],
  GERENTE: ['dashboard', 'cadastros', 'clientes', 'veiculos', 'operacoes', 'ordens', 'orcamentos', 'vendas-rapidas', 'devolucoes', 'financeiro', 'a-receber', 'historico', 'estoque', 'lembretes', 'whatsapp', 'ideario'],
  ATENDENTE: ['dashboard', 'cadastros', 'clientes', 'veiculos', 'operacoes', 'ordens', 'orcamentos', 'vendas-rapidas', 'devolucoes', 'financeiro', 'a-receber', 'historico', 'whatsapp', 'ideario'],
  VENDEDOR: ['cadastros', 'clientes', 'veiculos', 'operacoes', 'orcamentos', 'vendas-rapidas', 'devolucoes', 'financeiro', 'a-receber', 'historico', 'whatsapp', 'ideario'],
};

interface SubMenuItem {
  icon: any;
  label: string;
  href: string;
  permission: string;
}

interface MenuItem {
  icon: any;
  label: string;
  href: string;
  permission: string;
  subItems?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/', permission: 'dashboard' },
  {
    icon: FolderOpen,
    label: 'Cadastros',
    href: '/clientes',
    permission: 'cadastros',
    subItems: [
      { icon: Users, label: 'Clientes', href: '/clientes', permission: 'clientes' },
      { icon: Car, label: 'Veículos', href: '/veiculos', permission: 'veiculos' },
    ],
  },
  {
    icon: Briefcase,
    label: 'Operações',
    href: '/ordens',
    permission: 'operacoes',
    subItems: [
      { icon: ClipboardList, label: 'Ordens', href: '/ordens', permission: 'ordens' },
      { icon: FileText, label: 'Orçamentos', href: '/orcamentos', permission: 'orcamentos' },
      { icon: ShoppingCart, label: 'Vendas Rápidas', href: '/vendas-rapidas', permission: 'vendas-rapidas' },
      { icon: RotateCcw, label: 'Devoluções', href: '/devolucoes', permission: 'devolucoes' },
      { icon: FileText, label: 'Notas Fiscais', href: '/notas-fiscais', permission: 'ordens' },
    ],
  },
  {
    icon: Wallet,
    label: 'Financeiro',
    href: '/a-receber',
    permission: 'financeiro',
    subItems: [
      { icon: Clock, label: 'Crédito Pessoal', href: '/a-receber', permission: 'a-receber' },
      { icon: History, label: 'Histórico', href: '/historico', permission: 'historico' },
    ],
  },
  { icon: Package, label: 'Estoque', href: '/estoque', permission: 'estoque' },
  { icon: Bell, label: 'Lembretes', href: '/lembretes', permission: 'lembretes' },
  { icon: MessageCircle, label: 'WhatsApp', href: '/whatsapp', permission: 'whatsapp' },
  { icon: Lightbulb, label: 'Ideário', href: '/ideario', permission: 'ideario' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const { logout, isAdmin, isSuperAdmin, user } = useAuth();
  const { theme } = useTheme();
  const [configIncomplete, setConfigIncomplete] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  // Fechar sidebar mobile ao navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  // Filtrar menu baseado nas permissoes do role
  const userRole = (user?.role || 'ATENDENTE') as RoleUsuario;
  const permissions = ROLE_PERMISSIONS[userRole];

  // Filtra itens e subitens baseado nas permissoes
  const filteredMenuItems = menuItems
    .filter(item => permissions.includes('*') || permissions.includes(item.permission))
    .map(item => {
      if (item.subItems) {
        return {
          ...item,
          subItems: item.subItems.filter(sub =>
            permissions.includes('*') || permissions.includes(sub.permission)
          ),
        };
      }
      return item;
    })
    .filter(item => !item.subItems || item.subItems.length > 0);

  // Verifica se um submenu contem a rota atual
  const isSubMenuActive = (item: MenuItem) => {
    if (!item.subItems) return false;
    return item.subItems.some(sub => pathname === sub.href);
  };

  // Verificar se a configuracao esta completa
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const res = await fetch('/api/whatsapp/config');
        // Se não for OK (401, 403, etc), não tentar parsear
        if (!res.ok) {
          setConfigIncomplete(false);
          return;
        }
        const data = await res.json();
        if (data.data) {
          const { nomeOficina, cnpj, telefone, endereco } = data.data;
          const anyEmpty = !nomeOficina || !cnpj || !telefone || !endereco;
          setConfigIncomplete(anyEmpty);
        } else {
          setConfigIncomplete(true);
        }
      } catch {
        setConfigIncomplete(false);
      }
    };

    checkConfig();
  }, [pathname]);

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-sidebar-bg border-b border-border flex items-center px-4 z-40 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 text-sidebar-text hover:text-sidebar-text-active rounded-lg hover:bg-sidebar-hover transition-all"
        >
          <Menu size={24} />
        </button>
        <div className="flex-1 flex justify-center">
          <Image
            src={theme === 'light' ? '/logo.tema.claro.png' : '/logo.png'}
            alt="LoopIA"
            width={theme === 'light' ? 120 : 90}
            height={theme === 'light' ? 36 : 28}
            className="object-contain"
            priority
          />
        </div>
        <div className="w-10" /> {/* Spacer para centralizar logo */}
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-sidebar-bg flex flex-col transition-all duration-300 z-50 shadow-xl border-r border-border
          ${collapsed ? 'w-20' : 'w-72'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        `}
      >
      {/* Logo + Close button mobile */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex-1 flex items-center justify-center">
            <Image
              src={theme === 'light' ? '/logo.tema.claro.png' : '/logo.png'}
              alt="LoopIA Logo"
              width={theme === 'light' ? (collapsed ? 90 : 337) : (collapsed ? 36 : 135)}
              height={theme === 'light' ? (collapsed ? 90 : 100) : (collapsed ? 36 : 40)}
              className="object-contain transition-all duration-300"
              priority
            />
          </div>
          {/* Close button - mobile only */}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 text-sidebar-text hover:text-sidebar-text-active rounded-lg hover:bg-sidebar-hover transition-all md:hidden"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Toggle button - desktop only */}
      <button
        onClick={toggleCollapsed}
        className="absolute -right-3 top-24 w-6 h-6 bg-primary rounded-full items-center justify-center text-primary-foreground hover:scale-110 transition-transform shadow-lg shadow-primary/40 border-2 border-background hidden md:flex"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {filteredMenuItems.map((item, index) => {
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isActive = hasSubItems ? isSubMenuActive(item) : pathname === item.href;
          const isExpanded = expandedMenu === item.label || (hasSubItems && isSubMenuActive(item));

          if (hasSubItems) {
            return (
              <div key={item.href}>
                <button
                  onClick={() => {
                    if (collapsed) {
                      window.location.href = item.href;
                    } else {
                      setExpandedMenu(isExpanded ? null : item.label);
                    }
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden w-full ${
                    isActive
                      ? 'bg-sidebar-active text-sidebar-text-active shadow-lg shadow-black/10 ring-1 ring-primary/30'
                      : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active'
                  } ${collapsed ? 'justify-center px-3' : ''}`}
                  title={collapsed ? item.label : undefined}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent"></div>
                  )}
                  <item.icon
                    size={20}
                    className={`relative z-10 transition-all duration-300 ${
                      isActive ? 'drop-shadow-lg' : 'group-hover:scale-110'
                    }`}
                  />
                  {!collapsed && (
                    <>
                      <span className="font-medium relative z-10">{item.label}</span>
                      <ChevronDown
                        size={16}
                        className={`ml-auto relative z-10 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </>
                  )}
                </button>
                {/* Subitems */}
                {!collapsed && isExpanded && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-3">
                    {item.subItems!.map((subItem) => {
                      const isSubActive = pathname === subItem.href;
                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                            isSubActive
                              ? 'bg-sidebar-active text-sidebar-text-active'
                              : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active'
                          }`}
                        >
                          <subItem.icon size={16} />
                          <span>{subItem.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                isActive
                  ? 'bg-sidebar-active text-sidebar-text-active shadow-lg shadow-black/10 ring-1 ring-primary/30'
                  : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active'
              } ${collapsed ? 'justify-center px-3' : ''}`}
              title={collapsed ? item.label : undefined}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent"></div>
              )}
              <item.icon
                size={20}
                className={`relative z-10 transition-all duration-300 ${
                  isActive ? 'drop-shadow-lg' : 'group-hover:scale-110'
                }`}
              />
              {!collapsed && (
                <span className="font-medium relative z-10">{item.label}</span>
              )}
              {!collapsed && isActive && (
                <div className="ml-auto w-2 h-2 bg-primary-light rounded-full animate-pulse"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-1">
        {/* Usuários e Configurações - apenas para ADMIN */}
        {isAdmin && (
          <>
            <Link
              href="/usuarios"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                pathname === '/usuarios'
                  ? 'bg-sidebar-active text-sidebar-text-active shadow-lg shadow-black/10 ring-1 ring-primary/30'
                  : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active'
              } ${collapsed ? 'justify-center px-3' : ''}`}
              title={collapsed ? 'Usuários' : undefined}
            >
              <UserCog size={20} className="group-hover:scale-110 transition-transform" />
              {!collapsed && <span className="font-medium">Usuários</span>}
            </Link>
            <Link
              href="/configuracoes"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative ${
                configIncomplete
                  ? 'bg-warning/10 text-warning ring-1 ring-warning/30'
                  : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active'
              } ${collapsed ? 'justify-center px-3' : ''}`}
              title={collapsed ? (configIncomplete ? 'Configurações - Preencha os dados!' : 'Configurações') : undefined}
            >
              {configIncomplete ? (
                <div className="relative">
                  <Settings size={20} className="animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-warning rounded-full animate-ping"></span>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-warning rounded-full"></span>
                </div>
              ) : (
                <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
              )}
              {!collapsed && (
                <span className="font-medium flex items-center gap-2">
                  Configurações
                  {configIncomplete && (
                    <span className="text-xs bg-warning/20 px-2 py-0.5 rounded-full animate-pulse">
                      Pendente
                    </span>
                  )}
                </span>
              )}
            </Link>
          </>
        )}

        {/* Assinatura - para ADMIN */}
        {isAdmin && (
          <Link
            href="/assinatura"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
              pathname === '/assinatura'
                ? 'bg-sidebar-active text-sidebar-text-active shadow-lg shadow-black/10 ring-1 ring-primary/30'
                : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active'
            } ${collapsed ? 'justify-center px-3' : ''}`}
            title={collapsed ? 'Assinatura' : undefined}
          >
            <CreditCard size={20} className="group-hover:scale-110 transition-transform" />
            {!collapsed && <span className="font-medium">Assinatura</span>}
          </Link>
        )}

        {/* Painel Admin + CRM - apenas para Super Admin (Helsen IA) */}
        {isSuperAdmin && (
          <>
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                pathname === '/admin'
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                  : 'text-amber-400 hover:bg-amber-500/10'
              } ${collapsed ? 'justify-center px-3' : ''}`}
              title={collapsed ? 'Painel Admin' : undefined}
            >
              <Shield size={20} className="group-hover:scale-110 transition-transform" />
              {!collapsed && <span className="font-medium">Painel Admin</span>}
            </Link>
            <Link
              href="/crm"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                pathname === '/crm'
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                  : 'text-amber-400 hover:bg-amber-500/10'
              } ${collapsed ? 'justify-center px-3' : ''}`}
              title={collapsed ? 'CRM' : undefined}
            >
              <Target size={20} className="group-hover:scale-110 transition-transform" />
              {!collapsed && <span className="font-medium">CRM</span>}
            </Link>
          </>
        )}

        {/* Financial Toggle */}
        <FinancialToggle collapsed={collapsed} />

        {/* Theme Toggle */}
        <ThemeToggle collapsed={collapsed} />

        {/* Logout */}
        <button
          onClick={logout}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sidebar-text hover:bg-danger/20 hover:text-danger transition-all duration-300 w-full group ${
            collapsed ? 'justify-center px-3' : ''
          }`}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          {!collapsed && <span className="font-medium">Sair</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
