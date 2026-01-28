'use client';

import Header from '@/components/Header';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  Calendar,
  Wrench,
  Filter,
  Package,
} from 'lucide-react';
import { useState } from 'react';

const servicos = [
  {
    id: 1,
    nome: 'Troca de Óleo 5W30',
    descricao: 'Troca de óleo do motor com óleo semi-sintético 5W30',
    preco: 'R$ 180,00',
    duracao: '1h',
    intervalo: '6 meses ou 10.000 km',
    categoria: 'Trocas de Óleo',
    ativo: true,
  },
  {
    id: 2,
    nome: 'Troca de Óleo Sintético',
    descricao: 'Troca de óleo do motor com óleo 100% sintético',
    preco: 'R$ 280,00',
    duracao: '1h',
    intervalo: '12 meses ou 15.000 km',
    categoria: 'Trocas de Óleo',
    ativo: true,
  },
  {
    id: 3,
    nome: 'Filtro de Óleo',
    descricao: 'Substituição do filtro de óleo do motor',
    preco: 'R$ 45,00',
    duracao: '30min',
    intervalo: 'A cada troca de óleo',
    categoria: 'Filtros',
    ativo: true,
  },
  {
    id: 4,
    nome: 'Filtro de Ar',
    descricao: 'Substituição do filtro de ar do motor',
    preco: 'R$ 65,00',
    duracao: '30min',
    intervalo: '12 meses ou 15.000 km',
    categoria: 'Filtros',
    ativo: true,
  },
  {
    id: 5,
    nome: 'Alinhamento',
    descricao: 'Alinhamento das rodas dianteiras e traseiras',
    preco: 'R$ 80,00',
    duracao: '1h',
    intervalo: '6 meses ou 10.000 km',
    categoria: 'Pneus',
    ativo: true,
  },
  {
    id: 6,
    nome: 'Balanceamento',
    descricao: 'Balanceamento das 4 rodas',
    preco: 'R$ 60,00',
    duracao: '45min',
    intervalo: '6 meses ou 10.000 km',
    categoria: 'Pneus',
    ativo: true,
  },
  {
    id: 7,
    nome: 'Revisão 10.000 km',
    descricao: 'Revisão completa com verificação de 30 itens',
    preco: 'R$ 350,00',
    duracao: '3h',
    intervalo: '10.000 km',
    categoria: 'Revisões',
    ativo: true,
  },
  {
    id: 8,
    nome: 'Revisão 30.000 km',
    descricao: 'Revisão completa com troca de fluidos e verificação geral',
    preco: 'R$ 650,00',
    duracao: '4h',
    intervalo: '30.000 km',
    categoria: 'Revisões',
    ativo: true,
  },
  {
    id: 9,
    nome: 'Troca de Pastilhas de Freio',
    descricao: 'Substituição das pastilhas de freio dianteiras',
    preco: 'R$ 180,00',
    duracao: '2h',
    intervalo: '20.000 km',
    categoria: 'Freios',
    ativo: true,
  },
  {
    id: 10,
    nome: 'Higienização do Ar-Condicionado',
    descricao: 'Limpeza e higienização do sistema de ar-condicionado',
    preco: 'R$ 120,00',
    duracao: '1h',
    intervalo: '6 meses',
    categoria: 'Outros',
    ativo: true,
  },
];

const categorias = ['Todos', 'Trocas de Óleo', 'Filtros', 'Pneus', 'Revisões', 'Freios', 'Outros'];

const getCategoriaColor = (categoria: string) => {
  const colors: Record<string, string> = {
    'Trocas de Óleo': 'bg-amber-500/20 text-amber-400',
    'Filtros': 'bg-blue-500/20 text-blue-400',
    'Pneus': 'bg-purple-500/20 text-purple-400',
    'Revisões': 'bg-[#22c55e]/20 text-[#22c55e]',
    'Freios': 'bg-red-500/20 text-red-400',
    'Outros': 'bg-gray-500/20 text-gray-400',
  };
  return colors[categoria] || 'bg-gray-500/20 text-gray-400';
};

export default function ServicosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);

  const filteredServicos = servicos.filter((s) => {
    const matchSearch = s.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = categoriaFilter === 'Todos' || s.categoria === categoriaFilter;
    return matchSearch && matchCategoria;
  });

  return (
    <div className="min-h-screen bg-[#000000]">
      <Header title="Catálogo de Serviços" subtitle="Gerencie os serviços oferecidos" />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#22c55e]/20 rounded-lg">
                <Wrench size={20} className="text-[#22c55e]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{servicos.length}</p>
                <p className="text-xs text-[#6B7280]">Serviços Ativos</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Package size={20} className="text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">6</p>
                <p className="text-xs text-[#6B7280]">Categorias</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <DollarSign size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">R$ 201</p>
                <p className="text-xs text-[#6B7280]">Ticket Médio</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Clock size={20} className="text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">1.5h</p>
                <p className="text-xs text-[#6B7280]">Duração Média</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
              <input
                type="text"
                placeholder="Buscar serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1F1F1F] border border-[#333333] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e] transition-colors"
              />
            </div>
            <select
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
              className="bg-[#1F1F1F] border border-[#333333] rounded-xl px-4 py-3 text-[#94a3b8] focus:outline-none focus:border-[#22c55e]"
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={20} />
            Novo Serviço
          </button>
        </div>

        {/* Grid de Serviços */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServicos.map((servico) => (
            <div
              key={servico.id}
              className="bg-[#1F1F1F] border border-[#333333] rounded-2xl p-6 hover:border-[#22c55e]/50 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white text-lg">{servico.nome}</h3>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs ${getCategoriaColor(servico.categoria)}`}>
                    {servico.categoria}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 hover:bg-[#333333] rounded-lg transition-colors text-[#94a3b8] hover:text-white">
                    <Edit size={16} />
                  </button>
                  <button className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-[#94a3b8] hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p className="text-sm text-[#6B7280] mb-4">{servico.descricao}</p>

              <div className="space-y-3 pt-4 border-t border-[#333333]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#6B7280]">
                    <DollarSign size={16} />
                    <span className="text-sm">Preço</span>
                  </div>
                  <span className="text-[#22c55e] font-bold">{servico.preco}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#6B7280]">
                    <Clock size={16} />
                    <span className="text-sm">Duração</span>
                  </div>
                  <span className="text-white">{servico.duracao}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#6B7280]">
                    <Calendar size={16} />
                    <span className="text-sm">Intervalo</span>
                  </div>
                  <span className="text-[#94a3b8] text-sm">{servico.intervalo}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Novo Serviço */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl w-full max-w-lg animate-fade-in">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-semibold text-white">Novo Serviço</h2>
              <p className="text-sm text-[#6B7280] mt-1">Cadastre um novo serviço no catálogo</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Nome do Serviço</label>
                <input
                  type="text"
                  placeholder="Ex: Troca de Óleo 5W30"
                  className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Categoria</label>
                <select className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]">
                  <option value="">Selecione a categoria</option>
                  {categorias.filter(c => c !== 'Todos').map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Descrição</label>
                <textarea
                  placeholder="Descrição do serviço..."
                  rows={2}
                  className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Preço (R$)</label>
                  <input
                    type="text"
                    placeholder="Ex: 180,00"
                    className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Duração</label>
                  <input
                    type="text"
                    placeholder="Ex: 1h"
                    className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Intervalo de Manutenção</label>
                <input
                  type="text"
                  placeholder="Ex: 6 meses ou 10.000 km"
                  className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
              >
                Cancelar
              </button>
              <button className="px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:opacity-90 transition-opacity">
                Cadastrar Serviço
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
