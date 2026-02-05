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
    color: 'bg-blue-500/10 text-blue-400',
  },
  {
    id: 'usuario',
    title: 'Minha Conta',
    description: 'Perfil, senha e preferências',
    icon: User,
    color: 'bg-green-500/10 text-green-400',
  },
  {
    id: 'notificacoes',
    title: 'Notificações',
    description: 'Alertas, lembretes e avisos',
    icon: Bell,
    color: 'bg-amber-500/10 text-amber-400',
  },
  {
    id: 'aparencia',
    title: 'Aparência',
    description: 'Tema, cores e personalização',
    icon: Palette,
    color: 'bg-purple-500/10 text-purple-400',
  },
  {
    id: 'dados',
    title: 'Dados e Backup',
    description: 'Exportar, importar e backup',
    icon: Database,
    color: 'bg-cyan-500/10 text-cyan-400',
  },
  {
    id: 'seguranca',
    title: 'Segurança',
    description: 'Autenticação e permissões',
    icon: Shield,
    color: 'bg-red-500/10 text-red-400',
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="min-h-screen bg-[#121212]">
      <Header title="Configurações" subtitle="Personalize o sistema" />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Info Card */}
        <div className="bg-gradient-to-r from-[#43A047]/10 to-[#1B5E20]/5 border border-[#43A047]/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-500/10 rounded-xl ring-1 ring-[#43A047]/20">
              <Settings size={24} className="text-[#43A047]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#E8E8E8] mb-1">
                Central de Configurações
              </h2>
              <p className="text-[#9E9E9E] text-sm">
                Personalize o LoopIA de acordo com as necessidades da sua oficina.
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
                className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-6 text-left hover:border-[#43A047]/40 hover:shadow-lg hover:shadow-[#43A047]/5 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${section.color}`}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#E8E8E8] group-hover:text-[#43A047] transition-colors">
                        {section.title}
                      </h3>
                      <p className="text-sm text-[#6B7280]">{section.description}</p>
                    </div>
                  </div>
                  <ChevronRight
                    size={20}
                    className="text-[#6B7280] group-hover:text-[#43A047] group-hover:translate-x-1 transition-all duration-200"
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Version Info */}
        <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#2A2A2A] rounded-xl">
                <HelpCircle size={24} className="text-[#6B7280]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#E8E8E8]">Sobre o LoopIA</h3>
                <p className="text-sm text-[#6B7280]">Versão 1.0.0 • Sistema de Gestão Inteligente para Oficinas</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-500/10 text-[#43A047] text-xs font-medium rounded-full ring-1 ring-[#43A047]/20">
              Atualizado
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-6">
          <h3 className="font-semibold text-[#E8E8E8] mb-4">Ações Rápidas</h3>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-[#121212] border border-[#333333] hover:border-[#43A047]/30 rounded-xl text-sm text-[#9E9E9E] hover:text-[#E8E8E8] transition-all duration-200">
              Exportar Dados
            </button>
            <button className="px-4 py-2 bg-[#121212] border border-[#333333] hover:border-[#43A047]/30 rounded-xl text-sm text-[#9E9E9E] hover:text-[#E8E8E8] transition-all duration-200">
              Limpar Cache
            </button>
            <button className="px-4 py-2 bg-[#121212] border border-[#333333] hover:border-[#43A047]/30 rounded-xl text-sm text-[#9E9E9E] hover:text-[#E8E8E8] transition-all duration-200">
              Verificar Atualizações
            </button>
            <button className="px-4 py-2 bg-[#121212] border border-[#333333] hover:border-[#43A047]/30 rounded-xl text-sm text-[#9E9E9E] hover:text-[#E8E8E8] transition-all duration-200">
              Suporte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
