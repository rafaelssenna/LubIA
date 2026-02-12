import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Função para detectar categoria automaticamente
function detectCategoria(nome: string, codigo: string): string {
  const texto = nome.toLowerCase();
  const cod = codigo.toUpperCase();

  // === DETECÇÃO POR CÓDIGO DO PRODUTO ===

  // Wega filters (marca brasileira de filtros)
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
  if (cod.includes('OB') || cod.includes('OF') || texto.match(/\bo[bf]\d+/i)) {
    return 'FILTRO_OLEO';
  }

  // === DETECÇÃO POR DESCRIÇÃO ===

  // Óleos lubrificantes
  if (texto.includes('óleo') || texto.includes('oleo') ||
      texto.match(/\d+w[-]?\d+/) ||
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
        texto.includes('antipolen') || texto.includes('cabin')) {
      return 'FILTRO_AR_CONDICIONADO';
    }
    if (texto.includes('combustível') || texto.includes('combustivel') ||
        texto.includes('diesel') || texto.includes('gasolina')) {
      return 'FILTRO_COMBUSTIVEL';
    }
    if (texto.includes('ar motor') || texto.includes('ar do motor') ||
        (texto.includes('ar') && !texto.includes('condicionado'))) {
      return 'FILTRO_AR';
    }
    return 'FILTRO_OLEO';
  }

  // Marcas de filtros
  if (texto.includes('wega') || texto.includes('tecfil') ||
      texto.includes('fram') || texto.includes('mann') ||
      texto.includes('mahle')) {
    return 'FILTRO_OLEO';
  }

  // Aditivos
  if (texto.includes('aditivo') || texto.includes('arla') ||
      texto.includes('anticorrosivo') || texto.includes('radiador') ||
      texto.includes('limpa bico') || texto.includes('descarbonizante')) {
    return 'ADITIVO';
  }

  // Graxa
  if (texto.includes('graxa') || texto.includes('grease') ||
      texto.includes('chassis') || texto.includes('rolamento')) {
    return 'GRAXA';
  }

  // Fluidos
  if (texto.includes('fluido') || texto.includes('dot4') ||
      texto.includes('freio') || texto.includes('direção hidráulica')) {
    return 'ACESSORIO';
  }

  return 'OUTRO';
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar todos os produtos da empresa
    const produtos = await prisma.produto.findMany({
      where: { empresaId: session.empresaId },
      select: { id: true, codigo: true, nome: true, categoria: true }
    });

    const correcoes: Array<{ id: number; nome: string; de: string; para: string }> = [];

    // Analisar cada produto
    for (const produto of produtos) {
      const categoriaDetectada = detectCategoria(produto.nome, produto.codigo);

      // Se a categoria atual for "OUTRO" e detectamos uma categoria diferente, corrigir
      if (produto.categoria === 'OUTRO' && categoriaDetectada !== 'OUTRO') {
        await prisma.produto.update({
          where: { id: produto.id },
          data: { categoria: categoriaDetectada as any }
        });

        correcoes.push({
          id: produto.id,
          nome: produto.nome,
          de: produto.categoria,
          para: categoriaDetectada
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${correcoes.length} produto(s) corrigido(s)`,
      correcoes
    });

  } catch (error) {
    console.error('Erro ao corrigir categorias:', error);
    return NextResponse.json({ error: 'Erro ao corrigir categorias' }, { status: 500 });
  }
}

// GET para visualizar o que seria corrigido (preview)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const produtos = await prisma.produto.findMany({
      where: { empresaId: session.empresaId },
      select: { id: true, codigo: true, nome: true, categoria: true }
    });

    const sugestoes: Array<{ id: number; codigo: string; nome: string; categoriaAtual: string; categoriaSugerida: string }> = [];

    for (const produto of produtos) {
      const categoriaDetectada = detectCategoria(produto.nome, produto.codigo);

      if (produto.categoria === 'OUTRO' && categoriaDetectada !== 'OUTRO') {
        sugestoes.push({
          id: produto.id,
          codigo: produto.codigo,
          nome: produto.nome,
          categoriaAtual: produto.categoria,
          categoriaSugerida: categoriaDetectada
        });
      }
    }

    return NextResponse.json({
      total: produtos.length,
      comCategoriaOutro: produtos.filter(p => p.categoria === 'OUTRO').length,
      sugestoes
    });

  } catch (error) {
    console.error('Erro ao analisar categorias:', error);
    return NextResponse.json({ error: 'Erro ao analisar categorias' }, { status: 500 });
  }
}
