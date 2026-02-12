'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Car,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Package,
  ClipboardList,
} from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Users, label: 'Clientes', href: '/clientes' },
  { icon: Car, label: 'Veículos', href: '/veiculos' },
  { icon: ClipboardList, label: 'Ordens', href: '/ordens' },
  { icon: Package, label: 'Estoque', href: '/estoque' },
  { icon: Bell, label: 'Lembretes', href: '/lembretes' },
  { icon: MessageCircle, label: 'WhatsApp', href: '/whatsapp' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useSidebar();
  const { logout } = useAuth();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-[#1E1E1E] flex flex-col transition-all duration-300 z-50 shadow-xl shadow-[#1E1E1E]/20 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-white/15">
        <div className="flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="LoopIA Logo"
            width={collapsed ? 40 : 160}
            height={collapsed ? 40 : 48}
            className="object-contain transition-all duration-300 brightness-0 invert"
            priority
          />
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={toggleCollapsed}
        className="absolute -right-3 top-24 w-6 h-6 bg-[#43A047] rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg shadow-[#43A047]/40 border-2 border-[#121212]"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item, index) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                isActive
                  ? 'bg-white/20 text-white shadow-lg shadow-black/10 ring-1 ring-white/20'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              } ${collapsed ? 'justify-center px-3' : ''}`}
              title={collapsed ? item.label : undefined}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
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
                <div className="ml-auto w-2 h-2 bg-[#66BB6A] rounded-full animate-pulse"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/15 space-y-1.5">
        <Link
          href="/configuracoes"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all duration-300 group ${
            collapsed ? 'justify-center px-3' : ''
          }`}
          title={collapsed ? 'Configurações' : undefined}
        >
          <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
          {!collapsed && <span className="font-medium">Configurações</span>}
        </Link>
        <button
          onClick={logout}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-all duration-300 w-full group ${
            collapsed ? 'justify-center px-3' : ''
          }`}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          {!collapsed && <span className="font-medium">Sair</span>}
        </button>
      </div>
    </aside>
  );
}
