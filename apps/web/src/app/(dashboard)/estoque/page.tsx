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
  Eye,
  EyeOff,
  Sparkles,
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
  volumeUnidade: number | null; // Volume por unidade (ex: 5 para galão de 5L)
  quantidade: number;
  estoqueMinimo: number;
  precoCompra: number;
  precoCompraAtual: number;
  precoVenda: number;
  precoGranel: number | null;
  localizacao: string | null;
  cnpjFornecedor: string | null;
  filialId: number | null;
  filialNome: string | null;
  ativo: boolean;
  estoqueBaixo: boolean;
}

interface Filial {
  id: number;
  nome: string;
  cnpj: string;
  ativo: boolean;
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
    'oleo_lubrificante': 'bg-amber-500/10 text-amber-400',
    'aditivo': 'bg-blue-500/10 text-blue-400',
    'graxa': 'bg-purple-500/10 text-purple-400',
    'filtro_oleo': 'bg-green-500/10 text-primary',
    'filtro_ar': 'bg-cyan-500/10 text-cyan-400',
    'filtro_ar_condicionado': 'bg-indigo-500/10 text-indigo-400',
    'filtro_combustivel': 'bg-orange-500/10 text-orange-400',
    'acessorio': 'bg-pink-500/10 text-pink-400',
    'outro': 'bg-gray-500/10 text-gray-400',
  };
  return colors[categoria.toLowerCase()] || 'bg-gray-500/10 text-gray-400';
};

// Auto-detect category based on product description and code
const detectCategoria = (descricao: string, codigo?: string): string => {
  const texto = descricao.toLowerCase();
  const cod = (codigo || '').toUpperCase();

  // === DETECÇÃO POR CÓDIGO DO PRODUTO ===

  // Wega filters (marca brasileira de filtros)
  // WO = Oil filter, WA = Air filter, WAP = Air filter, WFC = Fuel filter, WAC = A/C filter
  if (cod.includes('WO') || texto.match(/\bwo[-\s]?\d+/i)) {
    return 'FILTRO_OLEO';
  }
  if (cod.includes('WAC') || texto.match(/\bwac[-\s]?\d+/i)) {
    return 'FILTRO_AR_CONDICIONADO';
  }
  if (cod.includes('WFC') || texto.match(/\bwfc[-\s]?\d+/i)) {
    return 'FILTRO_COMBUSTIVEL';
  }
  if (cod.includes('WA') || cod.includes('WAP') || texto.match(/\bwa[p]?[-\s]?\d+/i)) {
    return 'FILTRO_AR';
  }

  // Tecfil filters
  // PSL = Oil filter, ARL = Air filter, ACP = A/C filter, GI = Fuel filter
  if (cod.includes('PSL') || cod.includes('PEL') || texto.match(/\bpsl[-\s]?\d+/i)) {
    return 'FILTRO_OLEO';
  }
  if (cod.includes('ARL') || texto.match(/\barl[-\s]?\d+/i)) {
    return 'FILTRO_AR';
  }
  if (cod.includes('ACP') || texto.match(/\bacp[-\s]?\d+/i)) {
    return 'FILTRO_AR_CONDICIONADO';
  }
  if (cod.includes('GI') || texto.match(/\bgi[-\s]?\d+/i)) {
    return 'FILTRO_COMBUSTIVEL';
  }

  // Mann filters
  // W = Oil filter, C = Air filter, CU/CUK = A/C filter, WK = Fuel filter, HU = Oil filter
  if (cod.match(/^W\d/) || cod.includes('HU') || texto.match(/\bw\d{3}/i) || texto.match(/\bhu\d{3}/i)) {
    return 'FILTRO_OLEO';
  }
  if (cod.match(/^C\d/) && !cod.includes('CU') || texto.match(/\bc\d{4,}/i)) {
    return 'FILTRO_AR';
  }
  if (cod.includes('CUK') || cod.includes('CU') || texto.match(/\bcuk?\d+/i)) {
    return 'FILTRO_AR_CONDICIONADO';
  }
  if (cod.includes('WK') || texto.match(/\bwk[-\s]?\d+/i)) {
    return 'FILTRO_COMBUSTIVEL';
  }

  // Fram filters
  // PH = Oil filter, CA = Air filter, CF = A/C filter, G = Fuel filter
  if (cod.match(/^PH\d/) || texto.match(/\bph\d{4}/i)) {
    return 'FILTRO_OLEO';
  }
  if (cod.match(/^CA\d/) || texto.match(/\bca\d{4,}/i)) {
    return 'FILTRO_AR';
  }
  if (cod.match(/^CF\d/) || texto.match(/\bcf\d+/i)) {
    return 'FILTRO_AR_CONDICIONADO';
  }
  if (cod.match(/^G\d/) || texto.match(/\bg\d{4}/i)) {
    return 'FILTRO_COMBUSTIVEL';
  }

  // Bosch filters
  // OB/OF = Oil filter
  if (cod.includes('OB') || cod.includes('OF') || texto.match(/\bo[bf]\d+/i)) {
    return 'FILTRO_OLEO';
  }

  // === DETECÇÃO POR DESCRIÇÃO ===

  // Óleos lubrificantes
  if (texto.includes('óleo') || texto.includes('oleo') ||
      texto.match(/\d+w[-]?\d+/) || // 5W30, 10W40, 5W-30, etc
      texto.includes('lubrificante') ||
      texto.includes('castrol') || texto.includes('mobil') ||
      texto.includes('shell helix') || texto.includes('petronas') ||
      texto.includes('selenia') || texto.includes('motul') ||
      texto.includes('lubrax') || texto.includes('total quartz') ||
      texto.includes('sintético') || texto.includes('sintetico')) {
    return 'OLEO_LUBRIFICANTE';
  }

  // Filtros por descrição
  if (texto.includes('filtro') || texto.includes('filter')) {
    if (texto.includes('ar condicionado') || texto.includes('cabine') ||
        texto.includes('antipolen') || texto.includes('anti-polen') ||
        texto.includes('carvão ativado') || texto.includes('cabin')) {
      return 'FILTRO_AR_CONDICIONADO';
    }
    if (texto.includes('combustível') || texto.includes('combustivel') ||
        texto.includes('diesel') || texto.includes('gasolina') ||
        texto.includes('fuel')) {
      return 'FILTRO_COMBUSTIVEL';
    }
    if (texto.includes('ar motor') || texto.includes('ar do motor') ||
        (texto.includes('ar') && !texto.includes('condicionado'))) {
      return 'FILTRO_AR';
    }
    // Default para filtros genéricos = filtro de óleo
    return 'FILTRO_OLEO';
  }

  // Marcas conhecidas de filtros (quando não tem "filtro" na descrição)
  if (texto.includes('wega') || texto.includes('tecfil') ||
      texto.includes('fram') || texto.includes('mann') ||
      texto.includes('mahle') || texto.includes('bosch filter')) {
    // Tenta detectar pelo código se disponível
    return 'FILTRO_OLEO'; // Default para marcas de filtro
  }

  // Aditivos
  if (texto.includes('aditivo') || texto.includes('arla') ||
      texto.includes('anticorrosivo') || texto.includes('antiferrugem') ||
      texto.includes('radiador') || texto.includes('coolant') ||
      texto.includes('limpa bico') || texto.includes('limpa injetor') ||
      texto.includes('descarbonizante')) {
    return 'ADITIVO';
  }

  // Graxa
  if (texto.includes('graxa') || texto.includes('grease') ||
      texto.includes('chassis') || texto.includes('rolamento')) {
    return 'GRAXA';
  }

  // Fluidos (categorizar como acessório)
  if (texto.includes('fluido') || texto.includes('dot4') || texto.includes('dot 4') ||
      texto.includes('freio') || texto.includes('direção hidráulica')) {
    return 'ACESSORIO';
  }

  return 'OUTRO';
};

// Auto-detect unit based on product description
const detectUnidade = (descricao: string, unidadeOCR?: string): string => {
  const texto = descricao.toLowerCase();

  // PRIMEIRO: Detecta óleo lubrificante pelo padrão de viscosidade (5W30, 15W40, etc.)
  // Óleos são SEMPRE vendidos em litros
  if (texto.match(/\d+w[-]?\d+/i)) {
    return 'LITRO';
  }

  // Detecta padrões de litros na descrição
  if (texto.match(/\d+\s*l\b/) || texto.includes('litro')) {
    return 'LITRO';
  }

  // Check OCR unit
  if (unidadeOCR) {
    const un = unidadeOCR.toUpperCase();
    if (un === 'LT' || un === 'L' || un.includes('LITRO')) return 'LITRO';
    if (un === 'KG' || un.includes('QUILO')) return 'KG';
    if (un === 'UN' || un.includes('UNID')) return 'UNIDADE';
    if (un === 'PC' || un.includes('PECA') || un.includes('PEÇA')) return 'UNIDADE';
  }

  // Outros padrões
  if (texto.includes('kg') || texto.includes('quilo')) {
    return 'KG';
  }

  return 'UNIDADE';
};

// Auto-detect volume from product description (ex: "5L", "1L", "500ml")
const detectVolume = (descricao: string): number | null => {
  const texto = descricao.toLowerCase();

  // Detecta padrões como "5L", "5 L", "5 litros", "5litros"
  const matchLitros = texto.match(/(\d+(?:[.,]\d+)?)\s*(?:l|lt|litro|litros)\b/i);
  if (matchLitros) {
    return parseFloat(matchLitros[1].replace(',', '.'));
  }

  // Detecta padrões como "500ml", "500 ml"
  const matchMl = texto.match(/(\d+)\s*ml\b/i);
  if (matchMl) {
    return parseFloat(matchMl[1]) / 1000; // Converte ml para litros
  }

  // Detecta padrões como "1kg", "5 kg", "500g"
  const matchKg = texto.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i);
  if (matchKg) {
    return parseFloat(matchKg[1].replace(',', '.'));
  }

  const matchG = texto.match(/(\d+)\s*g\b/i);
  if (matchG) {
    return parseFloat(matchG[1]) / 1000; // Converte g para kg
  }

  // Se é óleo (tem viscosidade) mas não tem volume, assume 1L
  if (texto.match(/\d+w[-]?\d+/i)) {
    return 1;
  }

  return null;
};

// Normaliza nome do produto para comparação (remove caracteres especiais, espaços extras, etc.)
const normalizeProductName = (name: string): string => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[-_]/g, ' ')           // Substitui hífens e underscores por espaço
    .replace(/\s+/g, ' ')            // Remove espaços múltiplos
    .replace(/[^a-z0-9\s]/g, '')     // Remove caracteres especiais
    .trim();
};

// Calcula similaridade entre duas strings (0 a 1)
const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = normalizeProductName(str1);
  const s2 = normalizeProductName(str2);

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Verifica se um contém o outro
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = s1.length < s2.length ? s1 : s2;
    const longer = s1.length >= s2.length ? s1 : s2;
    return shorter.length / longer.length;
  }

  // Divide em palavras e verifica quantas são iguais
  const words1 = s1.split(' ').filter(w => w.length > 2);
  const words2 = s2.split(' ').filter(w => w.length > 2);

  if (words1.length === 0 || words2.length === 0) return 0;

  let matchingWords = 0;
  for (const w1 of words1) {
    if (words2.some(w2 => w1 === w2 || w1.includes(w2) || w2.includes(w1))) {
      matchingWords++;
    }
  }

  return matchingWords / Math.max(words1.length, words2.length);
};

// Encontra o produto mais similar no estoque
const findBestMatch = (descricao: string, produtos: Produto[]): Produto | null => {
  let bestMatch: Produto | null = null;
  let bestScore = 0;
  const threshold = 0.6; // Mínimo 60% de similaridade

  for (const produto of produtos) {
    const score = calculateSimilarity(descricao, produto.nome);
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = produto;
    }
  }

  return bestMatch;
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
    volumeUnidade: '',
    quantidade: '',
    estoqueMinimo: '',
    precoCompra: '',
    precoVenda: '',
    precoGranel: '',
    cnpjFornecedor: '',
    filialId: '' as string | number,
  });

  // Sorting state
  const [sortBy, setSortBy] = useState<'nome' | 'quantidade' | 'precoCompra' | 'precoVenda'>('nome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Low stock filter
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);

  // Active filter: 'todos' | 'ativos' | 'inativos'
  const [ativoFilter, setAtivoFilter] = useState<'todos' | 'ativos' | 'inativos'>('ativos');

  // Filial filter
  const [filialFilter, setFilialFilter] = useState<string>('');

  // Filiais for dropdown
  const [filiais, setFiliais] = useState<Filial[]>([]);

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
    volumeUnidade: '',
    quantidade: '',
    estoqueMinimo: '',
    precoCompra: '',
    precoVenda: '',
    precoGranel: '',
    cnpjFornecedor: '',
    filialId: '' as string | number,
  });

  const fetchFiliais = async () => {
    try {
      const res = await fetch('/api/filiais');
      const data = await res.json();
      setFiliais(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar filiais:', error);
    }
  };

  const fetchProdutos = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('busca', searchTerm);
      if (categoriaFilter) params.append('categoria', categoriaFilter);
      if (filialFilter) params.append('filialId', filialFilter);
      // Map filter to API param
      const ativoParam = ativoFilter === 'todos' ? 'todos' : ativoFilter === 'inativos' ? 'false' : 'true';
      params.append('ativo', ativoParam);

      const res = await fetch(`/api/produtos?${params}`);
      const data = await res.json();
      setProdutos(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Corrigir categorias automaticamente ao carregar (só uma vez por sessão)
  const [categoriesChecked, setCategoriesChecked] = useState(false);

  useEffect(() => {
    const autoFixCategories = async () => {
      if (categoriesChecked) return;
      setCategoriesChecked(true);
      try {
        const res = await fetch('/api/produtos/corrigir-categorias', { method: 'POST' });
        const data = await res.json();
        if (data.correcoes?.length > 0) {
          toast.success(`${data.correcoes.length} categoria(s) corrigida(s) automaticamente`);
          fetchProdutos(); // Recarregar após correção
        }
      } catch (error) {
        console.error('Erro ao auto-corrigir categorias:', error);
      }
    };

    fetchProdutos();
    fetchFiliais();
    autoFixCategories();
  }, [searchTerm, categoriaFilter, ativoFilter, filialFilter, categoriesChecked]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoriaFilter, showOnlyLowStock, sortBy, sortOrder, ativoFilter, filialFilter]);

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
          volumeUnidade: form.volumeUnidade ? parseFloat(form.volumeUnidade) : null,
          quantidade: parseFloat(form.quantidade) || 0,
          estoqueMinimo: parseFloat(form.estoqueMinimo) || 0,
          precoCompra: parseFloat(form.precoCompra) || 0,
          precoCompraAtual: parseFloat(form.precoCompra) || 0,
          precoVenda: parseFloat(form.precoVenda) || 0,
          precoGranel: form.precoGranel ? parseFloat(form.precoGranel) : null,
          cnpjFornecedor: form.cnpjFornecedor || null,
          filialId: form.filialId ? parseInt(form.filialId.toString()) : null,
        }),
      });

      if (res.ok) {
        toast.success('Produto cadastrado com sucesso!');
        setShowModal(false);
        setForm({
          codigo: '',
          nome: '',
          marca: '',
          categoria: 'OLEO_LUBRIFICANTE',
          unidade: 'LITRO',
          volumeUnidade: '',
          quantidade: '',
          estoqueMinimo: '',
          precoCompra: '',
          precoVenda: '',
          precoGranel: '',
          cnpjFornecedor: '',
          filialId: '',
        });
        fetchProdutos();
      }
    } catch (error) {
      console.error('Erro ao cadastrar produto:', error);
      toast.error('Erro ao cadastrar produto');
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
        toast.success('Movimentação registrada com sucesso!');
        setShowMovModal(false);
        setSelectedProduto(null);
        setMovQuantidade('');
        setMovMotivo('');
        fetchProdutos();
      }
    } catch (error) {
      console.error('Erro ao registrar movimentação:', error);
      toast.error('Erro ao registrar movimentação');
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
      volumeUnidade: produto.volumeUnidade?.toString() || '',
      quantidade: produto.quantidade.toString(),
      estoqueMinimo: produto.estoqueMinimo.toString(),
      precoCompra: produto.precoCompraAtual.toString(),
      precoVenda: produto.precoVenda.toString(),
      precoGranel: produto.precoGranel?.toString() || '',
      cnpjFornecedor: produto.cnpjFornecedor || '',
      filialId: produto.filialId || '',
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
          volumeUnidade: editingForm.volumeUnidade ? parseFloat(editingForm.volumeUnidade) : null,
          quantidade: parseFloat(editingForm.quantidade) || 0,
          estoqueMinimo: parseFloat(editingForm.estoqueMinimo) || 0,
          precoCompra: parseFloat(editingForm.precoCompra) || 0,
          precoCompraAtual: parseFloat(editingForm.precoCompra) || 0,
          precoVenda: parseFloat(editingForm.precoVenda) || 0,
          precoGranel: editingForm.precoGranel ? parseFloat(editingForm.precoGranel) : null,
          filialId: editingForm.filialId ? parseInt(editingForm.filialId.toString()) : null,
        }),
      });

      if (res.ok) {
        toast.success('Produto atualizado com sucesso!');
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
        toast.success('Produto excluído com sucesso!');
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

  const handleToggleAtivo = async (produto: Produto) => {
    try {
      const res = await fetch(`/api/produtos/${produto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...produto,
          ativo: !produto.ativo,
        }),
      });

      if (res.ok) {
        toast.success(produto.ativo ? 'Produto desativado!' : 'Produto ativado!');
        fetchProdutos();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao alterar status');
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do produto');
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
        <title>Relatório de Estoque - LoopIA</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { color: #43A047; margin-bottom: 5px; }
          .subtitle { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #43A047; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          .stats { display: flex; gap: 20px; margin-bottom: 20px; }
          .stat { padding: 15px; background: #f5f5f5; border-radius: 8px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #43A047; }
          .stat-label { font-size: 12px; color: #666; }
          .text-right { text-align: right; }
          .low-stock { color: red; font-weight: bold; }
          .footer { margin-top: 20px; font-size: 10px; color: #666; text-align: center; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>Relatório de Estoque</h1>
        <p class="subtitle">LoopIA - Sistema de Gestão para Oficinas • ${new Date().toLocaleDateString('pt-BR')}</p>

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

        <p class="footer">Gerado por LoopIA em ${new Date().toLocaleString('pt-BR')}</p>

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-amber-500/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-amber-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-muted animate-pulse">Carregando estoque...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Header title="Controle de Estoque" subtitle="Gerencie produtos e movimentações" />

      <div className="px-4 lg:px-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-8">
          {/* Produtos */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-2xl p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl">
                  <Package className="h-6 w-6 text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">Produtos</span>
              </div>
              <p className="text-4xl font-bold text-foreground mb-1">{produtos.length}</p>
              <p className="text-sm text-muted">cadastrados</p>
            </div>
          </div>

          {/* Itens em Estoque */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-2xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Droplets className="h-6 w-6 text-blue-400" />
                </div>
                <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">Itens</span>
              </div>
              <p className="text-4xl font-bold text-foreground mb-1">{totalItens.toFixed(0)}</p>
              <p className="text-sm text-muted">em estoque</p>
            </div>
          </div>

          {/* Valor Total */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-amber-500/20 to-amber-500/5 rounded-2xl p-6 border border-amber-500/20 hover:border-amber-500/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-500/20 rounded-xl">
                  <DollarSign className="h-6 w-6 text-amber-400" />
                </div>
                <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">Valor</span>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              <p className="text-sm text-muted">valor total</p>
            </div>
          </div>

          {/* Estoque Baixo */}
          <div className={`group relative overflow-hidden bg-gradient-to-br ${estoqueBaixoCount > 0 ? 'from-red-500/20 to-red-500/5 border-red-500/20 hover:border-red-500/40' : 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'} rounded-2xl p-6 border transition-all duration-300`}>
            <div className={`absolute top-0 right-0 w-32 h-32 ${estoqueBaixoCount > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'} rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500`}></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${estoqueBaixoCount > 0 ? 'bg-red-500/20' : 'bg-emerald-500/20'} rounded-xl`}>
                  <AlertTriangle className={`h-6 w-6 ${estoqueBaixoCount > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
                </div>
                <span className={`text-xs font-medium ${estoqueBaixoCount > 0 ? 'text-red-400 bg-red-500/10' : 'text-emerald-400 bg-emerald-500/10'} px-2 py-1 rounded-full`}>Alerta</span>
              </div>
              <p className="text-4xl font-bold text-foreground mb-1">{estoqueBaixoCount}</p>
              <p className="text-sm text-muted">estoque baixo</p>
            </div>
          </div>
        </div>

        {/* Low Stock Alert Banner */}
        {estoqueBaixoCount > 0 && !showOnlyLowStock && (
          <div className="bg-gradient-to-r from-red-500/10 to-red-500/5 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-foreground font-medium">
                  {estoqueBaixoCount} {estoqueBaixoCount === 1 ? 'produto esta' : 'produtos estao'} com estoque baixo
                </p>
                <p className="text-sm text-red-400">Verifique os itens que precisam de reposicao</p>
              </div>
            </div>
            <button
              onClick={() => setShowOnlyLowStock(true)}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium transition-all duration-200"
            >
              Ver produtos
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted" size={18} />
              <input
                type="text"
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background-secondary border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all duration-200"
              />
            </div>
            <select
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
              className="bg-background-secondary border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all duration-200"
            >
              {categorias.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            <button
              onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 ${
                showOnlyLowStock
                  ? 'bg-red-500/10 border border-red-500/50 text-red-400'
                  : 'border border-border text-foreground-muted hover:bg-background-secondary hover:text-foreground'
              }`}
              title="Filtrar estoque baixo"
            >
              <AlertTriangle size={18} />
              <span className="hidden md:inline">Estoque Baixo</span>
              {showOnlyLowStock && (
                <X size={14} className="ml-1" />
              )}
            </button>
            <select
              value={ativoFilter}
              onChange={(e) => setAtivoFilter(e.target.value as 'todos' | 'ativos' | 'inativos')}
              className={`bg-background-secondary border rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200 ${
                ativoFilter === 'inativos'
                  ? 'border-red-500/50 text-red-400'
                  : ativoFilter === 'todos'
                    ? 'border-blue-500/50 text-blue-400'
                    : 'border-border text-foreground'
              }`}
              title="Filtrar por status"
            >
              <option value="ativos">Ativos</option>
              <option value="inativos">Inativos</option>
              <option value="todos">Todos</option>
            </select>
            <select
              value={filialFilter}
              onChange={(e) => setFilialFilter(e.target.value)}
              className="bg-background-secondary border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
              title="Filtrar por filial/fornecedor"
            >
              <option value="">Todas Filiais</option>
              <option value="sem">Sem Filial</option>
              {filiais.map((filial) => (
                <option key={filial.id} value={filial.id}>
                  {filial.nome} - {filial.cnpj}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-3 border border-border rounded-xl text-muted hover:bg-background hover:text-foreground transition-all duration-200"
              title="Exportar para Excel"
            >
              <FileSpreadsheet size={20} />
              <span className="hidden md:inline">Excel</span>
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-3 border border-border rounded-xl text-muted hover:bg-background hover:text-foreground transition-all duration-200"
              title="Exportar para PDF"
            >
              <Download size={20} />
              <span className="hidden md:inline">PDF</span>
            </button>
            <button
              onClick={() => setShowOCR(true)}
              className="group relative flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 overflow-hidden"
              title="Escanear nota fiscal com IA"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity" />
              <Sparkles size={18} className="text-yellow-300 animate-pulse" />
              <FileText size={20} />
              <span>Escanear NF</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">IA</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-white font-medium hover:shadow-lg hover:shadow-green-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <Plus size={20} />
              Novo Produto
            </button>
          </div>
          </div>
        </div>

        {/* Tabela de Produtos */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted">Código</th>
                  <th
                    className="text-left px-6 py-4 text-sm font-medium text-muted cursor-pointer hover:text-foreground transition-all duration-200 select-none"
                    onClick={() => handleSort('nome')}
                  >
                    <div className="flex items-center gap-1">
                      Produto
                      <SortIcon column="nome" />
                    </div>
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted">Categoria</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted">Filial</th>
                  <th
                    className="text-right px-6 py-4 text-sm font-medium text-muted cursor-pointer hover:text-foreground transition-all duration-200 select-none"
                    onClick={() => handleSort('quantidade')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Qtd
                      <SortIcon column="quantidade" />
                    </div>
                  </th>
                  <th
                    className="text-right px-6 py-4 text-sm font-medium text-muted cursor-pointer hover:text-foreground transition-all duration-200 select-none"
                    onClick={() => handleSort('precoCompra')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Preço Compra
                      <SortIcon column="precoCompra" />
                    </div>
                  </th>
                  <th
                    className="text-right px-6 py-4 text-sm font-medium text-muted cursor-pointer hover:text-foreground transition-all duration-200 select-none"
                    onClick={() => handleSort('precoVenda')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Preço Venda
                      <SortIcon column="precoVenda" />
                    </div>
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-muted">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted">Carregando...</td>
                  </tr>
                ) : paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted">
                      {showOnlyLowStock ? 'Nenhum produto com estoque baixo' : 'Nenhum produto encontrado'}
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((produto) => (
                    <tr key={produto.id} className={`border-b border-border/50 hover:bg-background transition-all duration-200 ${!produto.ativo ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-muted">{produto.codigo}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-foreground font-medium">{produto.nome}</p>
                            <p className="text-xs text-muted">{produto.marca}</p>
                          </div>
                          {!produto.ativo && (
                            <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded-full flex items-center gap-1">
                              <EyeOff size={10} />
                              Inativo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs ${getCategoriaColor(produto.categoria)}`}>
                          {getCategoriaLabel(produto.categoria)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted text-sm">
                        {produto.filialNome || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${produto.estoqueBaixo ? 'text-red-400' : 'text-foreground'}`}>
                              {produto.quantidade}
                            </span>
                            <span className="text-xs text-muted">{produto.unidade === 'UNIDADE' ? 'un' : produto.unidade}</span>
                            {produto.estoqueBaixo && (
                              <AlertTriangle size={14} className="text-red-400" />
                            )}
                          </div>
                          {produto.volumeUnidade && ['LITRO', 'KG', 'METRO'].includes(produto.unidade) && (
                            <span className="text-xs text-amber-400">
                              ({(produto.quantidade * produto.volumeUnidade).toFixed(1)}{produto.unidade === 'LITRO' ? 'L' : produto.unidade === 'KG' ? 'kg' : 'm'} total)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-muted">
                        {produto.precoCompraAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-4 text-right text-primary font-bold">
                        {produto.precoVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1 bg-background rounded-lg p-1">
                          <button
                            onClick={() => {
                              setSelectedProduto(produto);
                              setMovTipo('ENTRADA');
                              setShowMovModal(true);
                            }}
                            className="p-2 hover:bg-primary/10 rounded-md transition-all duration-200 text-primary-light hover:text-primary"
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
                            className="p-2 hover:bg-red-500/10 rounded-md transition-all duration-200 text-primary-light hover:text-red-400"
                            title="Saída"
                          >
                            <ArrowUpCircle size={18} />
                          </button>
                          <button
                            onClick={() => openHistoryModal(produto)}
                            className="p-2 hover:bg-blue-500/10 rounded-md transition-all duration-200 text-primary-light hover:text-blue-400"
                            title="Histórico"
                          >
                            <History size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleAtivo(produto)}
                            className={`p-2 rounded-md transition-all duration-200 ${
                              produto.ativo
                                ? 'hover:bg-orange-500/10 text-primary-light hover:text-orange-400'
                                : 'hover:bg-green-500/10 text-orange-400 hover:text-primary'
                            }`}
                            title={produto.ativo ? 'Desativar' : 'Ativar'}
                          >
                            {produto.ativo ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button
                            onClick={() => openEditModal(produto)}
                            className="p-2 hover:bg-background-secondary rounded-md transition-all duration-200 text-primary-light hover:text-foreground"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingProduto(produto);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 hover:bg-red-500/10 rounded-md transition-all duration-200 text-primary-light hover:text-red-400"
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
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, processedProducts.length)} de {processedProducts.length} produtos
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-border rounded-lg text-muted hover:bg-background hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-all duration-200 ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-green-500/10'
                            : 'text-muted hover:bg-background hover:text-foreground'
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
                  className="p-2 border border-border rounded-lg text-muted hover:bg-background hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Novo Produto</h2>
              <p className="text-sm text-muted mt-1">Cadastre um novo produto no estoque</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Código</label>
                  <input
                    type="text"
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                    placeholder="Ex: OL-5W30-1L"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-[#616161] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Marca</label>
                  <input
                    type="text"
                    value={form.marca}
                    onChange={(e) => setForm({ ...form, marca: e.target.value })}
                    placeholder="Ex: Mobil"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-[#616161] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Nome do Produto</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Óleo Mobil Super 5W30 1L"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-[#616161] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Categoria</label>
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  >
                    {categorias.filter(c => c.value).map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Unidade</label>
                  <select
                    value={form.unidade}
                    onChange={(e) => {
                      const newUnidade = e.target.value;
                      // Auto-preenche volume com 1 para LITRO/KG/METRO
                      const autoVolume = ['LITRO', 'KG', 'METRO'].includes(newUnidade) ? '1' : '';
                      setForm({ ...form, unidade: newUnidade, volumeUnidade: autoVolume });
                    }}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  >
                    <option value="LITRO">Litro</option>
                    <option value="UNIDADE">Unidade</option>
                    <option value="KG">Kg</option>
                    <option value="METRO">Metro</option>
                  </select>
                </div>
              </div>
              {['LITRO', 'KG', 'METRO'].includes(form.unidade) && (
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Volume por Unidade {form.unidade === 'LITRO' ? '(Litros)' : form.unidade === 'KG' ? '(Kg)' : '(Metros)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={form.volumeUnidade}
                    onChange={(e) => setForm({ ...form, volumeUnidade: e.target.value })}
                    placeholder="Ex: 5 para galão de 5L"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-[#616161] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  />
                  <p className="text-xs text-muted mt-1">
                    Usado para calcular preço proporcional na venda a granel
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Quantidade Inicial</label>
                  <input
                    type="number"
                    value={form.quantidade}
                    onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                    placeholder="0"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-[#616161] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Estoque Mínimo</label>
                  <input
                    type="number"
                    value={form.estoqueMinimo}
                    onChange={(e) => setForm({ ...form, estoqueMinimo: e.target.value })}
                    placeholder="5"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-[#616161] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Preço Compra</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.precoCompra}
                    onChange={(e) => setForm({ ...form, precoCompra: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-[#616161] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Preço Venda</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.precoVenda}
                    onChange={(e) => setForm({ ...form, precoVenda: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-[#616161] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Filial/Fornecedor</label>
                <select
                  value={form.filialId}
                  onChange={(e) => setForm({ ...form, filialId: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                >
                  <option value="">Selecione uma filial</option>
                  {filiais.map((filial) => (
                    <option key={filial.id} value={filial.id}>
                      {filial.nome} - {filial.cnpj}
                    </option>
                  ))}
                </select>
                {filiais.length === 0 && (
                  <p className="text-xs text-muted mt-1">
                    Nenhuma filial cadastrada. Cadastre em Configurações.
                  </p>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 border border-border rounded-xl text-muted hover:bg-background hover:text-foreground transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-white font-medium hover:shadow-lg hover:shadow-green-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Cadastrar Produto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Movimentação */}
      {showMovModal && selectedProduto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md animate-fade-in shadow-2xl">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">
                {movTipo === 'ENTRADA' ? 'Entrada de Estoque' : 'Saída de Estoque'}
              </h2>
              <p className="text-sm text-muted mt-1">{selectedProduto.nome}</p>
              <p className="text-xs text-muted">Estoque atual: {selectedProduto.quantidade} {selectedProduto.unidade}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Quantidade</label>
                <input
                  type="number"
                  value={movQuantidade}
                  onChange={(e) => setMovQuantidade(e.target.value)}
                  placeholder="0"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-[#616161] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Motivo (opcional)</label>
                <input
                  type="text"
                  value={movMotivo}
                  onChange={(e) => setMovMotivo(e.target.value)}
                  placeholder="Ex: Compra NF 12345"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-[#616161] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowMovModal(false);
                  setSelectedProduto(null);
                  setMovQuantidade('');
                  setMovMotivo('');
                }}
                className="px-6 py-3 border border-border rounded-xl text-muted hover:bg-background hover:text-foreground transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleMovimentacao}
                className={`px-6 py-3 rounded-xl text-white font-medium hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ${
                  movTipo === 'ENTRADA'
                    ? 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-green-500/10'
                    : 'bg-gradient-to-r from-red-500 to-red-700 hover:shadow-lg hover:shadow-red-500/25'
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
              // Prepara os itens para revisão com detecção automática de categoria, unidade e volume
              const items = await Promise.all(data.itens.map(async (item: any, index: number) => {
                const descricao = item.descricao || '';
                const categoriaDetectada = detectCategoria(descricao);
                const unidadeDetectada = detectUnidade(descricao, item.unidade);
                const volumeDetectado = detectVolume(descricao);

                // Check if product already exists using fuzzy matching
                let existingProduct = null;
                try {
                  // Busca por palavras-chave do produto
                  const keywords = normalizeProductName(descricao).split(' ').filter(w => w.length > 3).slice(0, 3).join(' ');
                  const searchRes = await fetch(`/api/produtos?busca=${encodeURIComponent(keywords)}`);
                  const searchData = await searchRes.json();
                  if (searchData.data?.length > 0) {
                    // Find best match using fuzzy matching
                    existingProduct = findBestMatch(descricao, searchData.data);
                  }
                } catch (err) {
                  console.error('Erro ao buscar produto existente:', err);
                }

                // Se unidade é LITRO e não detectou volume, assume 1L
                const volumeFinal = volumeDetectado ?? (unidadeDetectada === 'LITRO' ? 1 : null);
                // semVolume = true apenas se unidade NÃO for LITRO/KG/METRO e não tem volume
                const semVolume = !volumeFinal && !['LITRO', 'KG', 'METRO'].includes(unidadeDetectada);

                return {
                  ...item,
                  selected: true,
                  codigo: item.codigo || `NF-${data.numeroNF || 'AUTO'}-${index + 1}`,
                  categoria: categoriaDetectada,
                  unidade: unidadeDetectada,
                  volumeUnidade: volumeFinal,
                  semVolume: semVolume,
                  quantidade: item.quantidade || 1,
                  estoqueMinimo: 5,
                  precoCompra: Math.round((item.valorUnitario || 0) * 100) / 100,
                  precoVenda: existingProduct?.precoVenda || 0,
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl animate-fade-in max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Itens da Nota Fiscal</h2>
                  <p className="text-sm text-muted mt-1">
                    {ocrResult?.numeroNF && `NF: ${ocrResult.numeroNF} • `}
                    {ocrResult?.fornecedor && `${ocrResult.fornecedor} • `}
                    {ocrItems.filter(i => i.selected).length} itens selecionados
                  </p>
                </div>
                {ocrResult?.cnpj && (
                  <div className="text-right">
                    <p className="text-xs text-muted">CNPJ Fornecedor</p>
                    <p className="text-sm font-mono text-amber-400">{ocrResult.cnpj}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {ocrItems.map((item, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border transition-colors ${
                    item.selected
                      ? item.existingProduct
                        ? 'bg-amber-500/10 border-amber-300'
                        : 'bg-green-500/10 border-green-300'
                      : 'bg-background border-border'
                  }`}
                >
                  {item.existingProduct && (
                    <div className="mb-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={16} className="text-amber-400" />
                          <span className="text-amber-400 text-sm font-medium">Produto já existe no estoque</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-xs text-muted">
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
                      <p className="text-xs text-muted mt-1">
                        <span className="text-foreground">{item.existingProduct.nome}</span>
                        {' • '}Estoque atual: <span className="text-amber-400">{item.existingProduct.quantidade} {item.existingProduct.unidade}</span>
                        {item.updateExisting && (
                          <span> → <span className="text-primary">{item.existingProduct.quantidade + (item.quantidade || 0)} {item.existingProduct.unidade}</span></span>
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
                      className="mt-1 w-5 h-5 accent-primary"
                    />
                    <div className="flex-1 space-y-4">
                      <div>
                        <label className="block text-xs text-muted mb-1">Descrição</label>
                        <input
                          type="text"
                          value={item.descricao}
                          onChange={(e) => {
                            const newItems = [...ocrItems];
                            newItems[index].descricao = e.target.value;
                            setOcrItems(newItems);
                          }}
                          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                        />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-muted mb-1">Categoria</label>
                          <select
                            value={item.categoria}
                            onChange={(e) => {
                              const newItems = [...ocrItems];
                              newItems[index].categoria = e.target.value;
                              setOcrItems(newItems);
                            }}
                            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                          >
                            {categorias.filter(c => c.value).map(cat => (
                              <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-1">Unidade</label>
                          <select
                            value={item.unidade}
                            onChange={(e) => {
                              const newItems = [...ocrItems];
                              newItems[index].unidade = e.target.value;
                              setOcrItems(newItems);
                            }}
                            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                          >
                            <option value="LITRO">Litro</option>
                            <option value="UNIDADE">Unidade</option>
                            <option value="KG">Kg</option>
                            <option value="METRO">Metro</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-1">
                            Volume (L/kg/un)
                          </label>
                          {item.semVolume ? (
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = [...ocrItems];
                                newItems[index].semVolume = false;
                                setOcrItems(newItems);
                              }}
                              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-muted text-sm hover:border-primary/50 transition-colors text-left"
                            >
                              Sem volume
                            </button>
                          ) : (
                            <div className="flex gap-1">
                              <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={item.volumeUnidade || ''}
                                onChange={(e) => {
                                  const newItems = [...ocrItems];
                                  newItems[index].volumeUnidade = parseFloat(e.target.value) || null;
                                  setOcrItems(newItems);
                                }}
                                placeholder="Ex: 1"
                                className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newItems = [...ocrItems];
                                  newItems[index].semVolume = true;
                                  newItems[index].volumeUnidade = null;
                                  setOcrItems(newItems);
                                }}
                                title="Produto sem volume"
                                className="px-2 bg-card border border-border rounded-lg text-muted text-xs hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                              >
                                N/A
                              </button>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-1">Código</label>
                          <input
                            type="text"
                            value={item.codigo}
                            onChange={(e) => {
                              const newItems = [...ocrItems];
                              newItems[index].codigo = e.target.value;
                              setOcrItems(newItems);
                            }}
                            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-muted mb-1">Quantidade</label>
                          <input
                            type="number"
                            value={item.quantidade}
                            onChange={(e) => {
                              const newItems = [...ocrItems];
                              newItems[index].quantidade = parseFloat(e.target.value) || 0;
                              setOcrItems(newItems);
                            }}
                            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-1">Preço Compra</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.precoCompra}
                            onChange={(e) => {
                              const newItems = [...ocrItems];
                              newItems[index].precoCompra = parseFloat(e.target.value) || 0;
                              setOcrItems(newItems);
                            }}
                            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className={`block text-xs mb-1 ${
                            item.selected && !item.updateExisting && !item.precoVenda
                              ? 'text-red-400'
                              : 'text-muted'
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
                            className={`w-full bg-card rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none ${
                              item.selected && !item.updateExisting && !item.precoVenda
                                ? 'border-2 border-red-500 focus:border-red-500'
                                : 'border border-border focus:border-primary'
                            }`}
                            placeholder={item.selected && !item.updateExisting ? 'Obrigatório' : '0.00'}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-1">Est. Mínimo</label>
                          <input
                            type="number"
                            value={item.estoqueMinimo}
                            onChange={(e) => {
                              const newItems = [...ocrItems];
                              newItems[index].estoqueMinimo = parseFloat(e.target.value) || 0;
                              setOcrItems(newItems);
                            }}
                            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-between">
              <button
                onClick={() => {
                  setShowOcrItems(false);
                  setOcrItems([]);
                  setOcrResult(null);
                }}
                className="px-6 py-3 border border-border rounded-xl text-muted hover:bg-background hover:text-foreground transition-all duration-200"
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
                            volumeUnidade: item.volumeUnidade || null,
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
                className="px-6 py-3 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Editar Produto</h2>
              <p className="text-sm text-muted mt-1">Atualize as informações do produto</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Código</label>
                  <input
                    type="text"
                    value={editingForm.codigo}
                    onChange={(e) => setEditingForm({ ...editingForm, codigo: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-[#616161] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Marca</label>
                  <input
                    type="text"
                    value={editingForm.marca}
                    onChange={(e) => setEditingForm({ ...editingForm, marca: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-[#616161] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Nome do Produto</label>
                <input
                  type="text"
                  value={editingForm.nome}
                  onChange={(e) => setEditingForm({ ...editingForm, nome: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-[#616161] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Categoria</label>
                  <select
                    value={editingForm.categoria}
                    onChange={(e) => setEditingForm({ ...editingForm, categoria: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  >
                    {categorias.filter(c => c.value).map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Unidade</label>
                  <select
                    value={editingForm.unidade}
                    onChange={(e) => {
                      const newUnidade = e.target.value;
                      // Auto-preenche volume com 1 para LITRO/KG/METRO se estiver vazio
                      const autoVolume = ['LITRO', 'KG', 'METRO'].includes(newUnidade) && !editingForm.volumeUnidade ? '1' : editingForm.volumeUnidade;
                      setEditingForm({ ...editingForm, unidade: newUnidade, volumeUnidade: autoVolume });
                    }}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  >
                    <option value="LITRO">Litro</option>
                    <option value="UNIDADE">Unidade</option>
                    <option value="KG">Kg</option>
                    <option value="METRO">Metro</option>
                  </select>
                </div>
              </div>
              {['LITRO', 'KG', 'METRO'].includes(editingForm.unidade) && (
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Volume por Unidade {editingForm.unidade === 'LITRO' ? '(Litros)' : editingForm.unidade === 'KG' ? '(Kg)' : '(Metros)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={editingForm.volumeUnidade}
                    onChange={(e) => setEditingForm({ ...editingForm, volumeUnidade: e.target.value })}
                    placeholder="Ex: 5 para galão de 5L"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-[#616161] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Quantidade</label>
                  <input
                    type="number"
                    value={editingForm.quantidade}
                    onChange={(e) => setEditingForm({ ...editingForm, quantidade: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-[#616161] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Estoque Mínimo</label>
                  <input
                    type="number"
                    value={editingForm.estoqueMinimo}
                    onChange={(e) => setEditingForm({ ...editingForm, estoqueMinimo: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-[#616161] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Preço Compra</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingForm.precoCompra}
                    onChange={(e) => setEditingForm({ ...editingForm, precoCompra: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-[#616161] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Preço Venda</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingForm.precoVenda}
                    onChange={(e) => setEditingForm({ ...editingForm, precoVenda: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-[#616161] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Filial/Fornecedor</label>
                <select
                  value={editingForm.filialId}
                  onChange={(e) => setEditingForm({ ...editingForm, filialId: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                >
                  <option value="">Selecione uma filial</option>
                  {filiais.map((filial) => (
                    <option key={filial.id} value={filial.id}>
                      {filial.nome} - {filial.cnpj}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProduto(null);
                }}
                className="px-6 py-3 border border-border rounded-xl text-muted hover:bg-background hover:text-foreground transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditSubmit}
                className="px-6 py-3 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-white font-medium hover:shadow-lg hover:shadow-green-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {showDeleteConfirm && deletingProduto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Confirmar Exclusão</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-500/10 rounded-xl">
                  <Trash2 size={24} className="text-red-400" />
                </div>
                <div>
                  <p className="text-foreground font-medium">{deletingProduto.nome}</p>
                  <p className="text-sm text-muted">{deletingProduto.codigo} • {deletingProduto.marca}</p>
                </div>
              </div>
              <p className="text-muted text-sm">
                Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingProduto(null);
                }}
                className="px-6 py-3 border border-border rounded-xl text-muted hover:bg-background hover:text-foreground transition-all duration-200"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl animate-fade-in max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Histórico de Movimentações</h2>
              <p className="text-sm text-muted mt-1">{historyProduto.nome}</p>
              <p className="text-xs text-muted">
                {historyProduto.codigo} • Estoque atual: {historyProduto.quantidade} {historyProduto.unidade}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingHistory ? (
                <div className="text-center py-8 text-muted">Carregando...</div>
              ) : movimentacoes.length === 0 ? (
                <div className="text-center py-8 text-muted">
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
                          ? 'bg-green-500/10 border-green-500/20'
                          : mov.tipo === 'SAIDA'
                          ? 'bg-red-500/10 border-red-500/20'
                          : 'bg-blue-500/10 border-blue-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {mov.tipo === 'ENTRADA' ? (
                            <ArrowDownCircle size={20} className="text-primary" />
                          ) : mov.tipo === 'SAIDA' ? (
                            <ArrowUpCircle size={20} className="text-red-400" />
                          ) : (
                            <History size={20} className="text-blue-400" />
                          )}
                          <div>
                            <p className={`font-medium ${
                              mov.tipo === 'ENTRADA' ? 'text-primary' : mov.tipo === 'SAIDA' ? 'text-red-400' : 'text-blue-400'
                            }`}>
                              {mov.tipo === 'ENTRADA' ? '+' : mov.tipo === 'SAIDA' ? '-' : ''}{mov.quantidade} {historyProduto.unidade}
                            </p>
                            {mov.motivo && (
                              <p className="text-sm text-muted">{mov.motivo}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted">
                            {new Date(mov.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs text-muted">
                            {new Date(mov.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-border flex justify-end">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryProduto(null);
                  setMovimentacoes([]);
                }}
                className="px-6 py-3 border border-border rounded-xl text-muted hover:bg-background hover:text-foreground transition-all duration-200"
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
