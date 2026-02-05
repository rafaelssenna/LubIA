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
    color: 'bg-blue-50 text-blue-600',
  },
  {
    id: 'usuario',
    title: 'Minha Conta',
    description: 'Perfil, senha e preferências',
    icon: User,
    color: 'bg-green-50 text-green-600',
  },
  {
    id: 'notificacoes',
    title: 'Notificações',
    description: 'Alertas, lembretes e avisos',
    icon: Bell,
    color: 'bg-amber-50 text-amber-600',
  },
  {
    id: 'aparencia',
    title: 'Aparência',
    description: 'Tema, cores e personalização',
    icon: Palette,
    color: 'bg-purple-50 text-purple-600',
  },
  {
    id: 'dados',
    title: 'Dados e Backup',
    description: 'Exportar, importar e backup',
    icon: Database,
    color: 'bg-cyan-50 text-cyan-600',
  },
  {
    id: 'seguranca',
    title: 'Segurança',
    description: 'Autenticação e permissões',
    icon: Shield,
    color: 'bg-red-50 text-red-600',
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="min-h-screen bg-[#dfe2e9]">
      <Header title="Configurações" subtitle="Personalize o sistema" />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Info Card */}
        <div className="bg-gradient-to-r from-[#22c55e]/10 to-[#166534]/5 border border-[#22c55e]/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-50 rounded-xl ring-1 ring-[#22c55e]/20">
              <Settings size={24} className="text-[#22c55e]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Central de Configurações
              </h2>
              <p className="text-gray-500 text-sm">
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
                className="bg-[#ecedf2] border border-[#c5c8d1] rounded-2xl p-6 text-left hover:border-[#22c55e]/40 hover:shadow-lg hover:shadow-[#22c55e]/5 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${section.color}`}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-[#22c55e] transition-colors">
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
        <div className="bg-[#ecedf2] border border-[#c5c8d1] rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#d0d3db] rounded-xl">
                <HelpCircle size={24} className="text-[#6B7280]" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Sobre o LoopIA</h3>
                <p className="text-sm text-[#6B7280]">Versão 1.0.0 • Sistema de Gestão Inteligente para Oficinas</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-50 text-[#22c55e] text-xs font-medium rounded-full ring-1 ring-[#22c55e]/20">
              Atualizado
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#ecedf2] border border-[#c5c8d1] rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-[#dfe2e9] border border-[#c5c8d1] hover:border-[#22c55e]/30 rounded-xl text-sm text-gray-500 hover:text-gray-900 transition-all duration-200">
              Exportar Dados
            </button>
            <button className="px-4 py-2 bg-[#dfe2e9] border border-[#c5c8d1] hover:border-[#22c55e]/30 rounded-xl text-sm text-gray-500 hover:text-gray-900 transition-all duration-200">
              Limpar Cache
            </button>
            <button className="px-4 py-2 bg-[#dfe2e9] border border-[#c5c8d1] hover:border-[#22c55e]/30 rounded-xl text-sm text-gray-500 hover:text-gray-900 transition-all duration-200">
              Verificar Atualizações
            </button>
            <button className="px-4 py-2 bg-[#dfe2e9] border border-[#c5c8d1] hover:border-[#22c55e]/30 rounded-xl text-sm text-gray-500 hover:text-gray-900 transition-all duration-200">
              Suporte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
