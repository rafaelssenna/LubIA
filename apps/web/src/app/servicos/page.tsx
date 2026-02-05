'use client';

import Header from '@/components/Header';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  Wrench,
  Package,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';

interface Servico {
  id: number;
  nome: string;
  descricao: string | null;
  categoria: string;
  precoBase: number;
  duracaoMin: number | null;
  ativo: boolean;
}

interface Stats {
  total: number;
  ativos: number;
  categorias: number;
  precoMedio: number;
  duracaoMedia: number;
}

const categorias = [
  { value: '', label: 'Todas' },
  { value: 'TROCA_OLEO', label: 'Trocas de Óleo' },
  { value: 'FILTROS', label: 'Filtros' },
  { value: 'PNEUS', label: 'Pneus' },
  { value: 'REVISOES', label: 'Revisões' },
  { value: 'FREIOS', label: 'Freios' },
  { value: 'SUSPENSAO', label: 'Suspensão' },
  { value: 'ELETRICA', label: 'Elétrica' },
  { value: 'AR_CONDICIONADO', label: 'Ar Condicionado' },
  { value: 'OUTROS', label: 'Outros' },
];

const getCategoriaLabel = (value: string) => {
  const cat = categorias.find(c => c.value === value);
  return cat?.label || value;
};

const getCategoriaColor = (categoria: string) => {
  const colors: Record<string, string> = {
    'TROCA_OLEO': 'bg-amber-50 text-amber-600',
    'FILTROS': 'bg-blue-50 text-blue-600',
    'PNEUS': 'bg-purple-50 text-purple-600',
    'REVISOES': 'bg-green-50 text-[#22c55e]',
    'FREIOS': 'bg-red-50 text-red-600',
    'SUSPENSAO': 'bg-orange-50 text-orange-600',
    'ELETRICA': 'bg-yellow-50 text-yellow-600',
    'AR_CONDICIONADO': 'bg-cyan-50 text-cyan-600',
    'OUTROS': 'bg-gray-50 text-gray-500',
  };
  return colors[categoria] || 'bg-gray-50 text-gray-500';
};

const formatDuracao = (minutos: number | null) => {
  if (!minutos) return '-';
  if (minutos < 60) return `${minutos}min`;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return mins > 0 ? `${horas}h${mins}min` : `${horas}h`;
};

export default function ServicosPage() {
  const toast = useToast();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, ativos: 0, categorias: 0, precoMedio: 0, duracaoMedia: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [deletingServico, setDeletingServico] = useState<Servico | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    categoria: 'OUTROS',
    precoBase: '',
    duracaoMin: '',
  });

  const fetchServicos = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('busca', searchTerm);
      if (categoriaFilter) params.append('categoria', categoriaFilter);

      const res = await fetch(`/api/servicos?${params}`);
      const data = await res.json();
      setServicos(data.data || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      toast.error('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServicos();
  }, [searchTerm, categoriaFilter]);

  const resetForm = () => {
    setForm({
      nome: '',
      descricao: '',
      categoria: 'OUTROS',
      precoBase: '',
      duracaoMin: '',
    });
  };

  const handleSubmit = async () => {
    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!form.precoBase || parseFloat(form.precoBase) <= 0) {
      toast.error('Preço é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/servicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || null,
          categoria: form.categoria,
          precoBase: parseFloat(form.precoBase),
          duracaoMin: form.duracaoMin ? parseInt(form.duracaoMin) : null,
        }),
      });

      if (res.ok) {
        toast.success('Serviço cadastrado com sucesso!');
        setShowModal(false);
        resetForm();
        fetchServicos();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao cadastrar serviço');
      }
    } catch (error) {
      console.error('Erro ao cadastrar serviço:', error);
      toast.error('Erro ao cadastrar serviço');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (servico: Servico) => {
    setEditingServico(servico);
    setForm({
      nome: servico.nome,
      descricao: servico.descricao || '',
      categoria: servico.categoria,
      precoBase: servico.precoBase.toString(),
      duracaoMin: servico.duracaoMin?.toString() || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!editingServico) return;

    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!form.precoBase || parseFloat(form.precoBase) <= 0) {
      toast.error('Preço é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/servicos/${editingServico.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || null,
          categoria: form.categoria,
          precoBase: parseFloat(form.precoBase),
          duracaoMin: form.duracaoMin ? parseInt(form.duracaoMin) : null,
        }),
      });

      if (res.ok) {
        toast.success('Serviço atualizado com sucesso!');
        setShowEditModal(false);
        setEditingServico(null);
        resetForm();
        fetchServicos();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao atualizar serviço');
      }
    } catch (error) {
      console.error('Erro ao atualizar serviço:', error);
      toast.error('Erro ao atualizar serviço');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingServico) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/servicos/${deletingServico.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Serviço excluído com sucesso!');
        setShowDeleteConfirm(false);
        setDeletingServico(null);
        fetchServicos();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao excluir serviço');
      }
    } catch (error) {
      console.error('Erro ao excluir serviço:', error);
      toast.error('Erro ao excluir serviço');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Header title="Catálogo de Serviços" subtitle="Gerencie os serviços oferecidos" />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-green-300 hover:shadow-lg hover:shadow-green-100 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#22c55e]/20 rounded-xl ring-1 ring-[#22c55e]/20">
                <Wrench size={20} className="text-[#22c55e]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.ativos}</p>
                <p className="text-xs text-[#6B7280]">Serviços Ativos</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 rounded-xl ring-1 ring-amber-500/20">
                <Package size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.categorias}</p>
                <p className="text-xs text-[#6B7280]">Categorias</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl ring-1 ring-blue-500/20">
                <DollarSign size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.precoMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-xs text-[#6B7280]">Ticket Médio</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 rounded-xl ring-1 ring-purple-500/20">
                <Clock size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatDuracao(stats.duracaoMedia)}</p>
                <p className="text-xs text-[#6B7280]">Duração Média</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] group-focus-within:text-[#22c55e] transition-colors" size={18} />
              <input
                type="text"
                placeholder="Buscar serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200"
              />
            </div>
            <select
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200"
            >
              {categorias.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:shadow-lg hover:shadow-green-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <Plus size={20} />
            Novo Serviço
          </button>
        </div>

        {/* Grid de Serviços */}
        {loading ? (
          <div className="text-center py-12 text-[#6B7280]">Carregando...</div>
        ) : servicos.length === 0 ? (
          <div className="text-center py-12 text-[#6B7280]">
            {searchTerm || categoriaFilter ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {servicos.map((servico) => (
              <div
                key={servico.id}
                className={`bg-white border rounded-2xl p-6 transition-all duration-300 ${
                  servico.ativo
                    ? 'border-gray-200 hover:border-[#22c55e]/40 hover:shadow-lg hover:shadow-green-100'
                    : 'border-gray-200/50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{servico.nome}</h3>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs ${getCategoriaColor(servico.categoria)}`}>
                      {getCategoriaLabel(servico.categoria)}
                    </span>
                  </div>
                  <div className="flex gap-1 bg-gray-50 rounded-lg p-1">
                    <button
                      onClick={() => openEditModal(servico)}
                      className="p-2 hover:bg-gray-100 rounded-md transition-all duration-200 text-gray-400 hover:text-gray-900"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingServico(servico);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-2 hover:bg-red-50 rounded-md transition-all duration-200 text-gray-400 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {servico.descricao && (
                  <p className="text-sm text-[#6B7280] mb-4">{servico.descricao}</p>
                )}

                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#6B7280]">
                      <DollarSign size={16} />
                      <span className="text-sm">Preço</span>
                    </div>
                    <span className="text-[#22c55e] font-bold">
                      {servico.precoBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#6B7280]">
                      <Clock size={16} />
                      <span className="text-sm">Duração</span>
                    </div>
                    <span className="text-gray-900">{formatDuracao(servico.duracaoMin)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Novo Serviço */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg animate-fade-in shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Novo Serviço</h2>
                <p className="text-sm text-[#6B7280] mt-1">Cadastre um novo serviço no catálogo</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 text-gray-400 hover:text-gray-900"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Nome do Serviço *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Troca de Óleo 5W30"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Categoria</label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200"
                >
                  {categorias.filter(c => c.value).map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Descrição do serviço..."
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Preço (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.precoBase}
                    onChange={(e) => setForm({ ...form, precoBase: e.target.value })}
                    placeholder="Ex: 180.00"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Duração (min)</label>
                  <input
                    type="number"
                    value={form.duracaoMin}
                    onChange={(e) => setForm({ ...form, duracaoMin: e.target.value })}
                    placeholder="Ex: 60"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:shadow-lg hover:shadow-green-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
              >
                {saving ? 'Salvando...' : 'Cadastrar Serviço'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Serviço */}
      {showEditModal && editingServico && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg animate-fade-in shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Editar Serviço</h2>
                <p className="text-sm text-[#6B7280] mt-1">Atualize as informações do serviço</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingServico(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 text-gray-400 hover:text-gray-900"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Nome do Serviço *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Categoria</label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200"
                >
                  {categorias.filter(c => c.value).map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Preço (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.precoBase}
                    onChange={(e) => setForm({ ...form, precoBase: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Duração (min)</label>
                  <input
                    type="number"
                    value={form.duracaoMin}
                    onChange={(e) => setForm({ ...form, duracaoMin: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all duration-200"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingServico(null);
                }}
                className="px-6 py-3 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:shadow-lg hover:shadow-green-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {showDeleteConfirm && deletingServico && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md animate-fade-in shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Confirmar Exclusão</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-50 rounded-xl ring-1 ring-red-500/20">
                  <Trash2 size={24} className="text-red-400" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium">{deletingServico.nome}</p>
                  <p className="text-sm text-[#6B7280]">{getCategoriaLabel(deletingServico.categoria)}</p>
                </div>
              </div>
              <p className="text-gray-500 text-sm">
                Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingServico(null);
                }}
                className="px-6 py-3 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-700 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
              >
                {saving ? 'Excluindo...' : 'Excluir Serviço'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
