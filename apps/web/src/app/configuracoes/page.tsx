'use client';

import Header from '@/components/Header';
import {
  Settings,
  Building2,
  User,
  Bell,
  Palette,
  Database,
  Shield,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';

const configSections = [
  {
    id: 'oficina',
    title: 'Dados da Oficina',
    description: 'Nome, endereço, telefone e CNPJ',
    icon: Building2,
    color: 'bg-blue-500/20 text-blue-400',
  },
  {
    id: 'usuario',
    title: 'Minha Conta',
    description: 'Perfil, senha e preferências',
    icon: User,
    color: 'bg-green-500/20 text-green-400',
  },
  {
    id: 'notificacoes',
    title: 'Notificações',
    description: 'Alertas, lembretes e avisos',
    icon: Bell,
    color: 'bg-amber-500/20 text-amber-400',
  },
  {
    id: 'aparencia',
    title: 'Aparência',
    description: 'Tema, cores e personalização',
    icon: Palette,
    color: 'bg-purple-500/20 text-purple-400',
  },
  {
    id: 'dados',
    title: 'Dados e Backup',
    description: 'Exportar, importar e backup',
    icon: Database,
    color: 'bg-cyan-500/20 text-cyan-400',
  },
  {
    id: 'seguranca',
    title: 'Segurança',
    description: 'Autenticação e permissões',
    icon: Shield,
    color: 'bg-red-500/20 text-red-400',
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]">
      <Header title="Configurações" subtitle="Personalize o sistema" />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Info Card */}
        <div className="bg-gradient-to-r from-[#22c55e]/10 to-[#166534]/5 border border-[#22c55e]/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#22c55e]/20 rounded-xl ring-1 ring-[#22c55e]/20">
              <Settings size={24} className="text-[#22c55e]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">
                Central de Configurações
              </h2>
              <p className="text-[#94a3b8] text-sm">
                Personalize o LubIA de acordo com as necessidades da sua oficina.
                Todas as alterações são salvas automaticamente.
              </p>
            </div>
          </div>
        </div>

        {/* Config Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-2xl p-6 text-left hover:border-[#22c55e]/40 hover:shadow-lg hover:shadow-[#22c55e]/5 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${section.color}`}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-[#22c55e] transition-colors">
                        {section.title}
                      </h3>
                      <p className="text-sm text-[#6B7280]">{section.description}</p>
                    </div>
                  </div>
                  <ChevronRight
                    size={20}
                    className="text-[#6B7280] group-hover:text-[#22c55e] group-hover:translate-x-1 transition-all duration-200"
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Version Info */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#2a2a2a] rounded-xl">
                <HelpCircle size={24} className="text-[#6B7280]" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Sobre o LubIA</h3>
                <p className="text-sm text-[#6B7280]">Versão 1.0.0 • Sistema de Gestão Inteligente para Oficinas</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-[#22c55e]/20 text-[#22c55e] text-xs font-medium rounded-full ring-1 ring-[#22c55e]/20">
              Atualizado
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4">Ações Rápidas</h3>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-[#0f0f0f] border border-[#2a2a2a] hover:border-[#22c55e]/30 rounded-xl text-sm text-[#94a3b8] hover:text-white transition-all duration-200">
              Exportar Dados
            </button>
            <button className="px-4 py-2 bg-[#0f0f0f] border border-[#2a2a2a] hover:border-[#22c55e]/30 rounded-xl text-sm text-[#94a3b8] hover:text-white transition-all duration-200">
              Limpar Cache
            </button>
            <button className="px-4 py-2 bg-[#0f0f0f] border border-[#2a2a2a] hover:border-[#22c55e]/30 rounded-xl text-sm text-[#94a3b8] hover:text-white transition-all duration-200">
              Verificar Atualizações
            </button>
            <button className="px-4 py-2 bg-[#0f0f0f] border border-[#2a2a2a] hover:border-[#22c55e]/30 rounded-xl text-sm text-[#94a3b8] hover:text-white transition-all duration-200">
              Suporte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
