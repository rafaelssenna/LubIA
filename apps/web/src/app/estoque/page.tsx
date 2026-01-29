'use client';

import Header from '@/components/Header';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Filter,
  DollarSign,
  Droplets,
  FileText,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import OCRScanner from '@/components/OCRScanner';

interface Produto {
  id: number;
  codigo: string;
  nome: string;
  marca: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  estoqueMinimo: number;
  precoCompra: number;
  precoCompraAtual: number;
  precoVenda: number;
  precoGranel: number | null;
  localizacao: string | null;
  estoqueBaixo: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

const categorias = [
  { value: '', label: 'Todas Categorias' },
  { value: 'OLEO_LUBRIFICANTE', label: 'Óleo Lubrificante' },
  { value: 'ADITIVO', label: 'Aditivo' },
  { value: 'GRAXA', label: 'Graxa' },
  { value: 'FILTRO_OLEO', label: 'Filtro de Óleo' },
  { value: 'FILTRO_AR', label: 'Filtro de Ar' },
  { value: 'FILTRO_AR_CONDICIONADO', label: 'Filtro de Ar Condicionado' },
  { value: 'FILTRO_COMBUSTIVEL', label: 'Filtro de Combustível' },
  { value: 'ACESSORIO', label: 'Acessório' },
  { value: 'OUTRO', label: 'Outro' },
];

const getCategoriaLabel = (value: string) => {
  const cat = categorias.find(c => c.value.toLowerCase() === value.toLowerCase());
  return cat?.label || value;
};

const getCategoriaColor = (categoria: string) => {
  const colors: Record<string, string> = {
    'oleo_lubrificante': 'bg-amber-500/20 text-amber-400',
    'aditivo': 'bg-blue-500/20 text-blue-400',
    'graxa': 'bg-purple-500/20 text-purple-400',
    'filtro_oleo': 'bg-[#22c55e]/20 text-[#22c55e]',
    'filtro_ar': 'bg-cyan-500/20 text-cyan-400',
    'filtro_ar_condicionado': 'bg-indigo-500/20 text-indigo-400',
    'filtro_combustivel': 'bg-orange-500/20 text-orange-400',
    'acessorio': 'bg-pink-500/20 text-pink-400',
    'outro': 'bg-gray-500/20 text-gray-400',
  };
  return colors[categoria.toLowerCase()] || 'bg-gray-500/20 text-gray-400';
};

export default function EstoquePage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showMovModal, setShowMovModal] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [movTipo, setMovTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [movQuantidade, setMovQuantidade] = useState('');
  const [movMotivo, setMovMotivo] = useState('');
  const [showOCR, setShowOCR] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);

  // Form state
  const [form, setForm] = useState({
    codigo: '',
    nome: '',
    marca: '',
    categoria: 'OLEO_LUBRIFICANTE',
    unidade: 'LITRO',
    quantidade: '',
    estoqueMinimo: '',
    precoCompra: '',
    precoVenda: '',
    precoGranel: '',
  });

  const fetchProdutos = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('busca', searchTerm);
      if (categoriaFilter) params.append('categoria', categoriaFilter);

      const res = await fetch(`${API_URL}/api/produtos?${params}`);
      const data = await res.json();
      setProdutos(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, [searchTerm, categoriaFilter]);

  const handleSubmit = async () => {
    try {
      const res = await fetch(`${API_URL}/api/produtos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          quantidade: parseFloat(form.quantidade) || 0,
          estoqueMinimo: parseFloat(form.estoqueMinimo) || 0,
          precoCompra: parseFloat(form.precoCompra) || 0,
          precoCompraAtual: parseFloat(form.precoCompra) || 0,
          precoVenda: parseFloat(form.precoVenda) || 0,
          precoGranel: form.precoGranel ? parseFloat(form.precoGranel) : null,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setForm({
          codigo: '',
          nome: '',
          marca: '',
          categoria: 'OLEO_LUBRIFICANTE',
          unidade: 'LITRO',
          quantidade: '',
          estoqueMinimo: '',
          precoCompra: '',
          precoVenda: '',
          precoGranel: '',
        });
        fetchProdutos();
      }
    } catch (error) {
      console.error('Erro ao cadastrar produto:', error);
    }
  };

  const handleMovimentacao = async () => {
    if (!selectedProduto) return;

    try {
      const res = await fetch(`${API_URL}/api/produtos/${selectedProduto.id}/movimentacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: movTipo,
          quantidade: parseFloat(movQuantidade),
          motivo: movMotivo,
        }),
      });

      if (res.ok) {
        setShowMovModal(false);
        setSelectedProduto(null);
        setMovQuantidade('');
        setMovMotivo('');
        fetchProdutos();
      }
    } catch (error) {
      console.error('Erro ao registrar movimentação:', error);
    }
  };

  const estoqueBaixoCount = produtos.filter(p => p.estoqueBaixo).length;
  const totalItens = produtos.reduce((acc, p) => acc + p.quantidade, 0);
  const valorTotal = produtos.reduce((acc, p) => acc + (p.quantidade * p.precoCompraAtual), 0);

  return (
    <div className="min-h-screen bg-[#000000]">
      <Header title="Controle de Estoque" subtitle="Gerencie produtos e movimentações" />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#22c55e]/20 rounded-lg">
                <Package size={20} className="text-[#22c55e]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{produtos.length}</p>
                <p className="text-xs text-[#6B7280]">Produtos</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Droplets size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalItens.toFixed(0)}</p>
                <p className="text-xs text-[#6B7280]">Itens em Estoque</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <DollarSign size={20} className="text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-xs text-[#6B7280]">Valor Total</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${estoqueBaixoCount > 0 ? 'bg-red-500/20' : 'bg-[#22c55e]/20'}`}>
                <AlertTriangle size={20} className={estoqueBaixoCount > 0 ? 'text-red-400' : 'text-[#22c55e]'} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{estoqueBaixoCount}</p>
                <p className="text-xs text-[#6B7280]">Estoque Baixo</p>
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
                placeholder="Buscar produto..."
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
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowOCR(true)}
              className="flex items-center gap-2 px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
              title="Escanear nota fiscal"
            >
              <FileText size={20} />
              Escanear NF
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
            >
              <Plus size={20} />
              Novo Produto
            </button>
          </div>
        </div>

        {/* Tabela de Produtos */}
        <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#333333]">
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#6B7280]">Código</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#6B7280]">Produto</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#6B7280]">Categoria</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-[#6B7280]">Qtd</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-[#6B7280]">Preço Compra</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-[#6B7280]">Preço Venda</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-[#6B7280]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[#6B7280]">Carregando...</td>
                  </tr>
                ) : produtos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[#6B7280]">Nenhum produto encontrado</td>
                  </tr>
                ) : (
                  produtos.map((produto) => (
                    <tr key={produto.id} className="border-b border-[#333333]/50 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-[#94a3b8]">{produto.codigo}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white font-medium">{produto.nome}</p>
                          <p className="text-xs text-[#6B7280]">{produto.marca}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs ${getCategoriaColor(produto.categoria)}`}>
                          {getCategoriaLabel(produto.categoria)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`font-bold ${produto.estoqueBaixo ? 'text-red-400' : 'text-white'}`}>
                            {produto.quantidade}
                          </span>
                          <span className="text-xs text-[#6B7280]">{produto.unidade}</span>
                          {produto.estoqueBaixo && (
                            <AlertTriangle size={14} className="text-red-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-[#94a3b8]">
                        {produto.precoCompraAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-4 text-right text-[#22c55e] font-bold">
                        {produto.precoVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedProduto(produto);
                              setMovTipo('ENTRADA');
                              setShowMovModal(true);
                            }}
                            className="p-2 hover:bg-[#22c55e]/20 rounded-lg transition-colors text-[#94a3b8] hover:text-[#22c55e]"
                            title="Entrada"
                          >
                            <ArrowDownCircle size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProduto(produto);
                              setMovTipo('SAIDA');
                              setShowMovModal(true);
                            }}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-[#94a3b8] hover:text-red-400"
                            title="Saída"
                          >
                            <ArrowUpCircle size={18} />
                          </button>
                          <button className="p-2 hover:bg-[#333333] rounded-lg transition-colors text-[#94a3b8] hover:text-white">
                            <Edit size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Novo Produto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-semibold text-white">Novo Produto</h2>
              <p className="text-sm text-[#6B7280] mt-1">Cadastre um novo produto no estoque</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Código</label>
                  <input
                    type="text"
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                    placeholder="Ex: OL-5W30-1L"
                    className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Marca</label>
                  <input
                    type="text"
                    value={form.marca}
                    onChange={(e) => setForm({ ...form, marca: e.target.value })}
                    placeholder="Ex: Mobil"
                    className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Nome do Produto</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Óleo Mobil Super 5W30 1L"
                  className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Categoria</label>
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]"
                  >
                    {categorias.filter(c => c.value).map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Unidade</label>
                  <select
                    value={form.unidade}
                    onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                    className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]"
                  >
                    <option value="LITRO">Litro</option>
                    <option value="UNIDADE">Unidade</option>
                    <option value="KG">Kg</option>
                    <option value="METRO">Metro</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Quantidade Inicial</label>
                  <input
                    type="number"
                    value={form.quantidade}
                    onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                    placeholder="0"
                    className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Estoque Mínimo</label>
                  <input
                    type="number"
                    value={form.estoqueMinimo}
                    onChange={(e) => setForm({ ...form, estoqueMinimo: e.target.value })}
                    placeholder="5"
                    className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Preço Compra</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.precoCompra}
                    onChange={(e) => setForm({ ...form, precoCompra: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Preço Venda</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.precoVenda}
                    onChange={(e) => setForm({ ...form, precoVenda: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Preço Granel</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.precoGranel}
                    onChange={(e) => setForm({ ...form, precoGranel: e.target.value })}
                    placeholder="Por litro"
                    className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
              >
                Cadastrar Produto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Movimentação */}
      {showMovModal && selectedProduto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl w-full max-w-md animate-fade-in">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-semibold text-white">
                {movTipo === 'ENTRADA' ? 'Entrada de Estoque' : 'Saída de Estoque'}
              </h2>
              <p className="text-sm text-[#6B7280] mt-1">{selectedProduto.nome}</p>
              <p className="text-xs text-[#6B7280]">Estoque atual: {selectedProduto.quantidade} {selectedProduto.unidade}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Quantidade</label>
                <input
                  type="number"
                  value={movQuantidade}
                  onChange={(e) => setMovQuantidade(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Motivo (opcional)</label>
                <input
                  type="text"
                  value={movMotivo}
                  onChange={(e) => setMovMotivo(e.target.value)}
                  placeholder="Ex: Compra NF 12345"
                  className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowMovModal(false);
                  setSelectedProduto(null);
                  setMovQuantidade('');
                  setMovMotivo('');
                }}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleMovimentacao}
                className={`px-6 py-3 rounded-xl text-white font-medium hover:opacity-90 transition-opacity ${
                  movTipo === 'ENTRADA'
                    ? 'bg-gradient-to-r from-[#22c55e] to-[#166534]'
                    : 'bg-gradient-to-r from-red-500 to-red-700'
                }`}
              >
                {movTipo === 'ENTRADA' ? 'Registrar Entrada' : 'Registrar Saída'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OCR Scanner para Nota Fiscal */}
      {showOCR && (
        <OCRScanner
          type="nota-fiscal"
          onResult={(data) => {
            setOcrResult(data);
            setShowOCR(false);
            // Mostra os dados extraídos em um alert por enquanto
            if (data.itens?.length > 0) {
              alert(`NF ${data.numeroNF || 'sem número'}\n${data.itens.length} itens encontrados\nTotal: R$ ${data.valorTotal?.toFixed(2) || '0.00'}`);
            }
          }}
          onClose={() => setShowOCR(false)}
        />
      )}
    </div>
  );
}
