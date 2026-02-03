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
  DollarSign,
  Droplets,
  FileText,
  Download,
  FileSpreadsheet,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import OCRScanner from '@/components/OCRScanner';
import { useToast } from '@/components/Toast';

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

// Usa API routes do Next.js (mesmo domínio)

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

// Auto-detect category based on product description
const detectCategoria = (descricao: string): string => {
  const texto = descricao.toLowerCase();

  // Óleos lubrificantes
  if (texto.includes('óleo') || texto.includes('oleo') ||
      texto.match(/\d+w\d+/) || // 5W30, 10W40, etc
      texto.includes('lubrificante') || texto.includes('motor') ||
      texto.includes('castrol') || texto.includes('mobil') ||
      texto.includes('shell') || texto.includes('petronas') ||
      texto.includes('selenia') || texto.includes('motul')) {
    return 'OLEO_LUBRIFICANTE';
  }

  // Filtros
  if (texto.includes('filtro')) {
    if (texto.includes('ar condicionado') || texto.includes('cabine') || texto.includes('antipolen')) {
      return 'FILTRO_AR_CONDICIONADO';
    }
    if (texto.includes('combustível') || texto.includes('combustivel') || texto.includes('diesel') || texto.includes('gasolina')) {
      return 'FILTRO_COMBUSTIVEL';
    }
    if (texto.includes('ar') || texto.includes('air')) {
      return 'FILTRO_AR';
    }
    return 'FILTRO_OLEO'; // Default for filters
  }

  // Aditivos
  if (texto.includes('aditivo') || texto.includes('arla') ||
      texto.includes('anticorrosivo') || texto.includes('antiferrugem')) {
    return 'ADITIVO';
  }

  // Graxa
  if (texto.includes('graxa') || texto.includes('grease')) {
    return 'GRAXA';
  }

  return 'OUTRO';
};

// Auto-detect unit based on product description
const detectUnidade = (descricao: string, unidadeOCR?: string): string => {
  const texto = descricao.toLowerCase();

  // Check OCR unit first
  if (unidadeOCR) {
    const un = unidadeOCR.toUpperCase();
    if (un === 'LT' || un === 'L' || un.includes('LITRO')) return 'LITRO';
    if (un === 'UN' || un.includes('UNID')) return 'UNIDADE';
    if (un === 'KG' || un.includes('QUILO')) return 'KG';
    if (un === 'PC' || un.includes('PECA') || un.includes('PEÇA')) return 'UNIDADE';
  }

  // Detect from description
  if (texto.match(/\d+\s*l\b/) || texto.includes('litro') || texto.match(/\d+w\d+/)) {
    return 'LITRO';
  }
  if (texto.includes('kg') || texto.includes('quilo')) {
    return 'KG';
  }

  return 'UNIDADE';
};

export default function EstoquePage() {
  const toast = useToast();
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
  const [showOcrItems, setShowOcrItems] = useState(false);
  const [ocrItems, setOcrItems] = useState<any[]>([]);
  const [savingOcr, setSavingOcr] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingProduto, setDeletingProduto] = useState<Produto | null>(null);
  const [editingForm, setEditingForm] = useState({
    codigo: '',
    nome: '',
    marca: '',
    categoria: '',
    unidade: '',
    quantidade: '',
    estoqueMinimo: '',
    precoCompra: '',
    precoVenda: '',
    precoGranel: '',
  });

  // Sorting state
  const [sortBy, setSortBy] = useState<'nome' | 'quantidade' | 'precoCompra' | 'precoVenda'>('nome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Low stock filter
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);

  // History modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyProduto, setHistoryProduto] = useState<Produto | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  
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

      const res = await fetch(`/api/produtos?${params}`);
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoriaFilter, showOnlyLowStock, sortBy, sortOrder]);

  // Fetch movimentações for history
  const fetchMovimentacoes = async (produtoId: number) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/produtos/${produtoId}/movimentacao`);
      const data = await res.json();
      setMovimentacoes(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
      setMovimentacoes([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openHistoryModal = (produto: Produto) => {
    setHistoryProduto(produto);
    setShowHistoryModal(true);
    fetchMovimentacoes(produto.id);
  };

  // Sorting function
  const handleSort = (column: 'nome' | 'quantidade' | 'precoCompra' | 'precoVenda') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Sort and filter products
  const processedProducts = [...produtos]
    .filter(p => !showOnlyLowStock || p.estoqueBaixo)
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'nome':
          comparison = a.nome.localeCompare(b.nome);
          break;
        case 'quantidade':
          comparison = a.quantidade - b.quantidade;
          break;
        case 'precoCompra':
          comparison = a.precoCompraAtual - b.precoCompraAtual;
          break;
        case 'precoVenda':
          comparison = a.precoVenda - b.precoVenda;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Pagination
  const totalPages = Math.ceil(processedProducts.length / itemsPerPage);
  const paginatedProducts = processedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Sort icon component
  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch(`/api/produtos`, {
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
      const res = await fetch(`/api/produtos/${selectedProduto.id}/movimentacao`, {
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

  const openEditModal = (produto: Produto) => {
    setEditingProduto(produto);
    setEditingForm({
      codigo: produto.codigo,
      nome: produto.nome,
      marca: produto.marca,
      categoria: produto.categoria,
      unidade: produto.unidade,
      quantidade: produto.quantidade.toString(),
      estoqueMinimo: produto.estoqueMinimo.toString(),
      precoCompra: produto.precoCompraAtual.toString(),
      precoVenda: produto.precoVenda.toString(),
      precoGranel: produto.precoGranel?.toString() || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!editingProduto) return;

    try {
      const res = await fetch(`/api/produtos/${editingProduto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingForm,
          quantidade: parseFloat(editingForm.quantidade) || 0,
          estoqueMinimo: parseFloat(editingForm.estoqueMinimo) || 0,
          precoCompra: parseFloat(editingForm.precoCompra) || 0,
          precoCompraAtual: parseFloat(editingForm.precoCompra) || 0,
          precoVenda: parseFloat(editingForm.precoVenda) || 0,
          precoGranel: editingForm.precoGranel ? parseFloat(editingForm.precoGranel) : null,
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        setEditingProduto(null);
        fetchProdutos();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao atualizar produto');
      }
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast.error('Erro ao atualizar produto');
    }
  };

  const handleDelete = async () => {
    if (!deletingProduto) return;

    try {
      const res = await fetch(`/api/produtos/${deletingProduto.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setShowDeleteConfirm(false);
        setDeletingProduto(null);
        fetchProdutos();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao excluir produto');
      }
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast.error('Erro ao excluir produto');
    }
  };

  const exportToCSV = () => {
    const headers = ['Código', 'Nome', 'Marca', 'Categoria', 'Unidade', 'Quantidade', 'Estoque Mínimo', 'Preço Compra', 'Preço Venda', 'Valor em Estoque'];
    const rows = produtos.map(p => [
      p.codigo,
      p.nome,
      p.marca,
      getCategoriaLabel(p.categoria),
      p.unidade,
      p.quantidade,
      p.estoqueMinimo,
      p.precoCompraAtual.toFixed(2),
      p.precoVenda.toFixed(2),
      (p.quantidade * p.precoCompraAtual).toFixed(2),
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    // Add BOM for Excel to recognize UTF-8
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `estoque_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    // Create a printable HTML document
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.warning('Por favor, permita popups para exportar em PDF');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Estoque - LubIA</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { color: #22c55e; margin-bottom: 5px; }
          .subtitle { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #22c55e; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          .stats { display: flex; gap: 20px; margin-bottom: 20px; }
          .stat { padding: 15px; background: #f5f5f5; border-radius: 8px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #22c55e; }
          .stat-label { font-size: 12px; color: #666; }
          .text-right { text-align: right; }
          .low-stock { color: red; font-weight: bold; }
          .footer { margin-top: 20px; font-size: 10px; color: #666; text-align: center; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>Relatório de Estoque</h1>
        <p class="subtitle">LubIA - Sistema de Gestão para Oficinas • ${new Date().toLocaleDateString('pt-BR')}</p>

        <div class="stats">
          <div class="stat">
            <div class="stat-value">${produtos.length}</div>
            <div class="stat-label">Produtos</div>
          </div>
          <div class="stat">
            <div class="stat-value">${totalItens.toFixed(0)}</div>
            <div class="stat-label">Itens em Estoque</div>
          </div>
          <div class="stat">
            <div class="stat-value">${valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <div class="stat-label">Valor Total</div>
          </div>
          <div class="stat">
            <div class="stat-value ${estoqueBaixoCount > 0 ? 'low-stock' : ''}">${estoqueBaixoCount}</div>
            <div class="stat-label">Estoque Baixo</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Produto</th>
              <th>Marca</th>
              <th>Categoria</th>
              <th class="text-right">Qtd</th>
              <th class="text-right">Preço Compra</th>
              <th class="text-right">Preço Venda</th>
              <th class="text-right">Valor Estoque</th>
            </tr>
          </thead>
          <tbody>
            ${produtos.map(p => `
              <tr>
                <td>${p.codigo}</td>
                <td>${p.nome}</td>
                <td>${p.marca}</td>
                <td>${getCategoriaLabel(p.categoria)}</td>
                <td class="text-right ${p.estoqueBaixo ? 'low-stock' : ''}">${p.quantidade} ${p.unidade}</td>
                <td class="text-right">${p.precoCompraAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td class="text-right">${p.precoVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td class="text-right">${(p.quantidade * p.precoCompraAtual).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <p class="footer">Gerado por LubIA em ${new Date().toLocaleString('pt-BR')}</p>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
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

        {/* Low Stock Alert Banner */}
        {estoqueBaixoCount > 0 && !showOnlyLowStock && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-white font-medium">
                  {estoqueBaixoCount} {estoqueBaixoCount === 1 ? 'produto está' : 'produtos estão'} com estoque baixo
                </p>
                <p className="text-sm text-red-300/70">Verifique os itens que precisam de reposição</p>
              </div>
            </div>
            <button
              onClick={() => setShowOnlyLowStock(true)}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-colors"
            >
              Ver produtos
            </button>
          </div>
        )}

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
            <button
              onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-colors ${
                showOnlyLowStock
                  ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                  : 'border border-[#333333] text-[#94a3b8] hover:bg-[#333333]'
              }`}
              title="Filtrar estoque baixo"
            >
              <AlertTriangle size={18} />
              <span className="hidden md:inline">Estoque Baixo</span>
              {showOnlyLowStock && (
                <X size={14} className="ml-1" />
              )}
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
              title="Exportar para Excel"
            >
              <FileSpreadsheet size={20} />
              <span className="hidden md:inline">Excel</span>
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
              title="Exportar para PDF"
            >
              <Download size={20} />
              <span className="hidden md:inline">PDF</span>
            </button>
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
                  <th
                    className="text-left px-6 py-4 text-sm font-medium text-[#6B7280] cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort('nome')}
                  >
                    <div className="flex items-center gap-1">
                      Produto
                      <SortIcon column="nome" />
                    </div>
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#6B7280]">Categoria</th>
                  <th
                    className="text-right px-6 py-4 text-sm font-medium text-[#6B7280] cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort('quantidade')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Qtd
                      <SortIcon column="quantidade" />
                    </div>
                  </th>
                  <th
                    className="text-right px-6 py-4 text-sm font-medium text-[#6B7280] cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort('precoCompra')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Preço Compra
                      <SortIcon column="precoCompra" />
                    </div>
                  </th>
                  <th
                    className="text-right px-6 py-4 text-sm font-medium text-[#6B7280] cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort('precoVenda')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Preço Venda
                      <SortIcon column="precoVenda" />
                    </div>
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-[#6B7280]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[#6B7280]">Carregando...</td>
                  </tr>
                ) : paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[#6B7280]">
                      {showOnlyLowStock ? 'Nenhum produto com estoque baixo' : 'Nenhum produto encontrado'}
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((produto) => (
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
                          <button
                            onClick={() => openHistoryModal(produto)}
                            className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors text-[#94a3b8] hover:text-blue-400"
                            title="Histórico"
                          >
                            <History size={16} />
                          </button>
                          <button
                            onClick={() => openEditModal(produto)}
                            className="p-2 hover:bg-[#333333] rounded-lg transition-colors text-[#94a3b8] hover:text-white"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingProduto(produto);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-[#94a3b8] hover:text-red-400"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-[#333333] flex items-center justify-between">
              <p className="text-sm text-[#6B7280]">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, processedProducts.length)} de {processedProducts.length} produtos
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-[#333333] rounded-lg text-[#94a3b8] hover:bg-[#333333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-[#22c55e] text-white'
                            : 'text-[#94a3b8] hover:bg-[#333333]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-[#333333] rounded-lg text-[#94a3b8] hover:bg-[#333333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
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
          onResult={async (data) => {
            setOcrResult(data);
            setShowOCR(false);
            if (data.itens?.length > 0) {
              // Prepara os itens para revisão com detecção automática de categoria e unidade
              const items = await Promise.all(data.itens.map(async (item: any, index: number) => {
                const descricao = item.descricao || '';
                const categoriaDetectada = detectCategoria(descricao);
                const unidadeDetectada = detectUnidade(descricao, item.unidade);

                // Check if product already exists
                let existingProduct = null;
                try {
                  const searchRes = await fetch(`/api/produtos?busca=${encodeURIComponent(descricao)}`);
                  const searchData = await searchRes.json();
                  if (searchData.data?.length > 0) {
                    // Find a close match
                    existingProduct = searchData.data.find((p: Produto) =>
                      p.nome.toLowerCase().includes(descricao.toLowerCase().substring(0, 15)) ||
                      descricao.toLowerCase().includes(p.nome.toLowerCase().substring(0, 15))
                    );
                  }
                } catch (err) {
                  console.error('Erro ao buscar produto existente:', err);
                }

                return {
                  ...item,
                  selected: true,
                  codigo: item.codigo || `NF-${data.numeroNF || 'AUTO'}-${index + 1}`,
                  categoria: categoriaDetectada,
                  unidade: unidadeDetectada,
                  quantidade: item.quantidade || 1,
                  estoqueMinimo: 5,
                  precoCompra: Math.round((item.valorUnitario || 0) * 100) / 100,
                  precoVenda: 0, // Usuário preenche manualmente
                  existingProduct: existingProduct,
                  updateExisting: !!existingProduct, // Default to update if exists
                };
              }));
              setOcrItems(items);
              setShowOcrItems(true);
            } else if (data.erro) {
              toast.error(data.erro);
            } else {
              toast.warning('Nenhum item encontrado na nota fiscal');
            }
          }}
          onClose={() => setShowOCR(false)}
        />
      )}

      {/* Modal para revisar itens da NF */}
      {showOcrItems && ocrItems.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl w-full max-w-3xl animate-fade-in max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-semibold text-white">Itens da Nota Fiscal</h2>
              <p className="text-sm text-[#6B7280] mt-1">
                {ocrResult?.numeroNF && `NF: ${ocrResult.numeroNF} • `}
                {ocrResult?.fornecedor && `${ocrResult.fornecedor} • `}
                {ocrItems.filter(i => i.selected).length} itens selecionados
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {ocrItems.map((item, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border transition-colors ${
                    item.selected
                      ? item.existingProduct
                        ? 'bg-amber-500/10 border-amber-500/50'
                        : 'bg-[#22c55e]/10 border-[#22c55e]/50'
                      : 'bg-[#000000] border-[#333333]'
                  }`}
                >
                  {item.existingProduct && (
                    <div className="mb-3 p-3 bg-amber-500/20 rounded-lg border border-amber-500/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={16} className="text-amber-400" />
                          <span className="text-amber-400 text-sm font-medium">Produto já existe no estoque</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-xs text-[#94a3b8]">
                            {item.updateExisting ? 'Atualizar qtd' : 'Criar novo'}
                          </span>
                          <input
                            type="checkbox"
                            checked={item.updateExisting}
                            onChange={(e) => {
                              const newItems = [...ocrItems];
                              newItems[index].updateExisting = e.target.checked;
                              setOcrItems(newItems);
                            }}
                            className="w-4 h-4 accent-amber-400"
                          />
                        </label>
                      </div>
                      <p className="text-xs text-[#94a3b8] mt-1">
                        <span className="text-white">{item.existingProduct.nome}</span>
                        {' • '}Estoque atual: <span className="text-amber-400">{item.existingProduct.quantidade} {item.existingProduct.unidade}</span>
                        {item.updateExisting && (
                          <span> → <span className="text-[#22c55e]">{item.existingProduct.quantidade + (item.quantidade || 0)} {item.existingProduct.unidade}</span></span>
                        )}
                      </p>
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) => {
                        const newItems = [...ocrItems];
                        newItems[index].selected = e.target.checked;
                        setOcrItems(newItems);
                      }}
                      className="mt-1 w-5 h-5 accent-[#22c55e]"
                    />
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-xs text-[#6B7280] mb-1">Descrição</label>
                        <input
                          type="text"
                          value={item.descricao}
                          onChange={(e) => {
                            const newItems = [...ocrItems];
                            newItems[index].descricao = e.target.value;
                            setOcrItems(newItems);
                          }}
                          className="w-full bg-[#1F1F1F] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#22c55e]"
                        />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-[#6B7280] mb-1">Categoria</label>
                          <select
                            value={item.categoria}
                            onChange={(e) => {
                              const newItems = [...ocrItems];
                              newItems[index].categoria = e.target.value;
                              setOcrItems(newItems);
                            }}
                            className="w-full bg-[#1F1F1F] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#22c55e]"
                          >
                            {categorias.filter(c => c.value).map(cat => (
                              <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-[#6B7280] mb-1">Unidade</label>
                          <select
                            value={item.unidade}
                            onChange={(e) => {
                              const newItems = [...ocrItems];
                              newItems[index].unidade = e.target.value;
                              setOcrItems(newItems);
                            }}
                            className="w-full bg-[#1F1F1F] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#22c55e]"
                          >
                            <option value="LITRO">Litro</option>
                            <option value="UNIDADE">Unidade</option>
                            <option value="KG">Kg</option>
                            <option value="METRO">Metro</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-[#6B7280] mb-1">Código</label>
                          <input
                            type="text"
                            value={item.codigo}
                            onChange={(e) => {
                              const newItems = [...ocrItems];
                              newItems[index].codigo = e.target.value;
                              setOcrItems(newItems);
                            }}
                            className="w-full bg-[#1F1F1F] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#22c55e]"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs text-[#6B7280] mb-1">Quantidade</label>
                          <input
                            type="number"
                            value={item.quantidade}
                            onChange={(e) => {
                              const newItems = [...ocrItems];
                              newItems[index].quantidade = parseFloat(e.target.value) || 0;
                              setOcrItems(newItems);
                            }}
                            className="w-full bg-[#1F1F1F] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#22c55e]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#6B7280] mb-1">Preço Compra</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.precoCompra}
                            onChange={(e) => {
                              const newItems = [...ocrItems];
                              newItems[index].precoCompra = parseFloat(e.target.value) || 0;
                              setOcrItems(newItems);
                            }}
                            className="w-full bg-[#1F1F1F] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#22c55e]"
                          />
                        </div>
                        <div>
                          <label className={`block text-xs mb-1 ${
                            item.selected && !item.updateExisting && !item.precoVenda
                              ? 'text-red-400'
                              : 'text-[#6B7280]'
                          }`}>
                            Preço Venda {item.selected && !item.updateExisting && <span className="text-red-400">*</span>}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.precoVenda}
                            onChange={(e) => {
                              const newItems = [...ocrItems];
                              newItems[index].precoVenda = parseFloat(e.target.value) || 0;
                              setOcrItems(newItems);
                            }}
                            className={`w-full bg-[#1F1F1F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none ${
                              item.selected && !item.updateExisting && !item.precoVenda
                                ? 'border-2 border-red-500 focus:border-red-500'
                                : 'border border-[#333333] focus:border-[#22c55e]'
                            }`}
                            placeholder={item.selected && !item.updateExisting ? 'Obrigatório' : '0.00'}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#6B7280] mb-1">Est. Mínimo</label>
                          <input
                            type="number"
                            value={item.estoqueMinimo}
                            onChange={(e) => {
                              const newItems = [...ocrItems];
                              newItems[index].estoqueMinimo = parseFloat(e.target.value) || 0;
                              setOcrItems(newItems);
                            }}
                            className="w-full bg-[#1F1F1F] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#22c55e]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-[#333333] flex gap-3 justify-between">
              <button
                onClick={() => {
                  setShowOcrItems(false);
                  setOcrItems([]);
                  setOcrResult(null);
                }}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  // Validate that all new products have a sale price
                  const selectedItems = ocrItems.filter(i => i.selected);
                  const itemsNeedingPrice = selectedItems.filter(i => !i.updateExisting && !i.precoVenda);

                  if (itemsNeedingPrice.length > 0) {
                    toast.error(`Preencha o preço de venda de ${itemsNeedingPrice.length} produto(s)`);
                    return;
                  }

                  setSavingOcr(true);
                  let successCount = 0;
                  let updatedCount = 0;

                  for (const item of selectedItems) {
                    try {
                      if (item.existingProduct && item.updateExisting) {
                        // Update existing product quantity
                        const newQuantity = item.existingProduct.quantidade + (item.quantidade || 0);
                        const res = await fetch(`/api/produtos/${item.existingProduct.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            ...item.existingProduct,
                            quantidade: newQuantity,
                            precoCompraAtual: item.precoCompra || item.existingProduct.precoCompraAtual,
                          }),
                        });
                        if (res.ok) updatedCount++;
                      } else {
                        // Create new product
                        const res = await fetch('/api/produtos', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            codigo: item.codigo,
                            nome: item.descricao,
                            marca: ocrResult?.fornecedor || 'NF Import',
                            categoria: item.categoria,
                            unidade: item.unidade,
                            quantidade: item.quantidade,
                            estoqueMinimo: item.estoqueMinimo,
                            precoCompra: item.precoCompra,
                            precoCompraAtual: item.precoCompra,
                            precoVenda: item.precoVenda,
                          }),
                        });
                        if (res.ok) successCount++;
                      }
                    } catch (error) {
                      console.error('Erro ao salvar item:', error);
                    }
                  }

                  setSavingOcr(false);
                  setShowOcrItems(false);
                  setOcrItems([]);
                  setOcrResult(null);
                  fetchProdutos();

                  let message = '';
                  if (successCount > 0) message += `${successCount} produto(s) cadastrado(s)`;
                  if (updatedCount > 0) {
                    if (message) message += ' e ';
                    message += `${updatedCount} estoque(s) atualizado(s)`;
                  }
                  toast.success(message + ' com sucesso!');
                }}
                disabled={
                  savingOcr ||
                  ocrItems.filter(i => i.selected).length === 0 ||
                  ocrItems.some(i => i.selected && !i.updateExisting && !i.precoVenda)
                }
                className="px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {savingOcr
                  ? 'Salvando...'
                  : ocrItems.some(i => i.selected && !i.updateExisting && !i.precoVenda)
                    ? 'Preencha os preços de venda'
                    : `Adicionar ${ocrItems.filter(i => i.selected).length} Produtos`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Produto */}
      {showEditModal && editingProduto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-semibold text-white">Editar Produto</h2>
              <p className="text-sm text-[#6B7280] mt-1">Atualize as informações do produto</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Código</label>
                  <input
                    type="text"
                    value={editingForm.codigo}
                    onChange={(e) => setEditingForm({ ...editingForm, codigo: e.target.value })}
                    className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Marca</label>
                  <input
                    type="text"
                    value={editingForm.marca}
                    onChange={(e) => setEditingForm({ ...editingForm, marca: e.target.value })}
                    className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Nome do Produto</label>
                <input
                  type="text"
                  value={editingForm.nome}
                  onChange={(e) => setEditingForm({ ...editingForm, nome: e.target.value })}
                  className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Categoria</label>
                  <select
                    value={editingForm.categoria}
                    onChange={(e) => setEditingForm({ ...editingForm, categoria: e.target.value })}
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
                    value={editingForm.unidade}
                    onChange={(e) => setEditingForm({ ...editingForm, unidade: e.target.value })}
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
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Quantidade</label>
                  <input
                    type="number"
                    value={editingForm.quantidade}
                    onChange={(e) => setEditingForm({ ...editingForm, quantidade: e.target.value })}
                    className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Estoque Mínimo</label>
                  <input
                    type="number"
                    value={editingForm.estoqueMinimo}
                    onChange={(e) => setEditingForm({ ...editingForm, estoqueMinimo: e.target.value })}
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
                    value={editingForm.precoCompra}
                    onChange={(e) => setEditingForm({ ...editingForm, precoCompra: e.target.value })}
                    className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Preço Venda</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingForm.precoVenda}
                    onChange={(e) => setEditingForm({ ...editingForm, precoVenda: e.target.value })}
                    className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-2">Preço Granel</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingForm.precoGranel}
                    onChange={(e) => setEditingForm({ ...editingForm, precoGranel: e.target.value })}
                    placeholder="Por litro"
                    className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProduto(null);
                }}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditSubmit}
                className="px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {showDeleteConfirm && deletingProduto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl w-full max-w-md animate-fade-in">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-semibold text-white">Confirmar Exclusão</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-500/20 rounded-xl">
                  <Trash2 size={24} className="text-red-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{deletingProduto.nome}</p>
                  <p className="text-sm text-[#6B7280]">{deletingProduto.codigo} • {deletingProduto.marca}</p>
                </div>
              </div>
              <p className="text-[#94a3b8] text-sm">
                Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingProduto(null);
                }}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-700 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
              >
                Excluir Produto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Histórico de Movimentações */}
      {showHistoryModal && historyProduto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl w-full max-w-2xl animate-fade-in max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-semibold text-white">Histórico de Movimentações</h2>
              <p className="text-sm text-[#6B7280] mt-1">{historyProduto.nome}</p>
              <p className="text-xs text-[#6B7280]">
                {historyProduto.codigo} • Estoque atual: {historyProduto.quantidade} {historyProduto.unidade}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingHistory ? (
                <div className="text-center py-8 text-[#6B7280]">Carregando...</div>
              ) : movimentacoes.length === 0 ? (
                <div className="text-center py-8 text-[#6B7280]">
                  <History size={40} className="mx-auto mb-3 opacity-50" />
                  <p>Nenhuma movimentação registrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {movimentacoes.map((mov) => (
                    <div
                      key={mov.id}
                      className={`p-4 rounded-xl border ${
                        mov.tipo === 'ENTRADA'
                          ? 'bg-[#22c55e]/10 border-[#22c55e]/30'
                          : mov.tipo === 'SAIDA'
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-blue-500/10 border-blue-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {mov.tipo === 'ENTRADA' ? (
                            <ArrowDownCircle size={20} className="text-[#22c55e]" />
                          ) : mov.tipo === 'SAIDA' ? (
                            <ArrowUpCircle size={20} className="text-red-400" />
                          ) : (
                            <History size={20} className="text-blue-400" />
                          )}
                          <div>
                            <p className={`font-medium ${
                              mov.tipo === 'ENTRADA' ? 'text-[#22c55e]' : mov.tipo === 'SAIDA' ? 'text-red-400' : 'text-blue-400'
                            }`}>
                              {mov.tipo === 'ENTRADA' ? '+' : mov.tipo === 'SAIDA' ? '-' : ''}{mov.quantidade} {historyProduto.unidade}
                            </p>
                            {mov.motivo && (
                              <p className="text-sm text-[#94a3b8]">{mov.motivo}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-[#6B7280]">
                            {new Date(mov.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs text-[#6B7280]">
                            {new Date(mov.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[#333333] flex justify-end">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryProduto(null);
                  setMovimentacoes([]);
                }}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
