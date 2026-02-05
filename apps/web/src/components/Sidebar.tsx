'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Car,
  Wrench,
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

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Users, label: 'Clientes', href: '/clientes' },
  { icon: Car, label: 'Veículos', href: '/veiculos' },
  { icon: ClipboardList, label: 'Ordens', href: '/ordens' },
  { icon: Wrench, label: 'Serviços', href: '/servicos' },
  { icon: Package, label: 'Estoque', href: '/estoque' },
  { icon: Bell, label: 'Lembretes', href: '/lembretes' },
  { icon: MessageCircle, label: 'WhatsApp', href: '/whatsapp' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col transition-all duration-300 z-50 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Logo */}
      <div className="p-5 border-b border-[#1a1a1a]">
        <div className={`flex items-center gap-4 ${collapsed ? 'justify-center' : ''}`}>
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-[#22c55e]/30 overflow-hidden ring-1 ring-[#22c55e]/20">
              <Image
                src="/logo.png"
                alt="LoopIA Logo"
                width={48}
                height={48}
                className="object-contain"
                priority
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#22c55e] rounded-full border-2 border-[#0f0f0f] animate-pulse"></div>
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="text-white">Loop</span>
                <span className="gradient-text">IA</span>
              </h1>
              <p className="text-xs text-[#6B7280] font-medium">Gestão Inteligente</p>
            </div>
          )}
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={toggleCollapsed}
        className="absolute -right-3 top-24 w-6 h-6 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg shadow-[#22c55e]/30"
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
                  ? 'bg-gradient-to-r from-[#22c55e] to-[#166534] text-white shadow-lg shadow-[#22c55e]/25'
                  : 'text-[#94a3b8] hover:bg-[#1a1a1a] hover:text-white'
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
                  isActive ? 'drop-shadow-lg' : 'group-hover:text-[#22c55e] group-hover:scale-110'
                }`}
              />
              {!collapsed && (
                <span className="font-medium relative z-10">{item.label}</span>
              )}
              {!collapsed && isActive && (
                <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#1a1a1a] space-y-1.5">
        <Link
          href="/configuracoes"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[#94a3b8] hover:bg-[#1a1a1a] hover:text-white transition-all duration-300 group ${
            collapsed ? 'justify-center px-3' : ''
          }`}
          title={collapsed ? 'Configurações' : undefined}
        >
          <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
          {!collapsed && <span className="font-medium">Configurações</span>}
        </Link>
        <button
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[#94a3b8] hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 w-full group ${
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
