import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Função para detectar categoria automaticamente baseado no código e nome do produto
function detectCategoria(nome: string, codigo: string): string {
  const texto = nome.toLowerCase();
  const cod = codigo.toUpperCase();

  // === DETECÇÃO POR CÓDIGO DO PRODUTO ===

  // Wega filters (marca brasileira de filtros)
  if (cod.includes('WO') || texto.match(/\bwo[-\s]?\d+/i)) return 'FILTRO_OLEO';
  if (cod.includes('WAC') || texto.match(/\bwac[-\s]?\d+/i)) return 'FILTRO_AR_CONDICIONADO';
  if (cod.includes('WFC') || texto.match(/\bwfc[-\s]?\d+/i)) return 'FILTRO_COMBUSTIVEL';
  if (cod.includes('WA') || cod.includes('WAP') || texto.match(/\bwa[p]?[-\s]?\d+/i)) return 'FILTRO_AR';

  // Tecfil filters
  if (cod.includes('PSL') || cod.includes('PEL') || texto.match(/\bpsl[-\s]?\d+/i)) return 'FILTRO_OLEO';
  if (cod.includes('ARL') || texto.match(/\barl[-\s]?\d+/i)) return 'FILTRO_AR';
  if (cod.includes('ACP') || texto.match(/\bacp[-\s]?\d+/i)) return 'FILTRO_AR_CONDICIONADO';
  if (cod.includes('GI') || texto.match(/\bgi[-\s]?\d+/i)) return 'FILTRO_COMBUSTIVEL';

  // Mann filters
  if (cod.match(/^W\d/) || cod.includes('HU') || texto.match(/\bw\d{3}/i) || texto.match(/\bhu\d{3}/i)) return 'FILTRO_OLEO';
  if (cod.match(/^C\d/) && !cod.includes('CU') || texto.match(/\bc\d{4,}/i)) return 'FILTRO_AR';
  if (cod.includes('CUK') || cod.includes('CU') || texto.match(/\bcuk?\d+/i)) return 'FILTRO_AR_CONDICIONADO';
  if (cod.includes('WK') || texto.match(/\bwk[-\s]?\d+/i)) return 'FILTRO_COMBUSTIVEL';

  // Fram filters
  if (cod.match(/^PH\d/) || texto.match(/\bph\d{4}/i)) return 'FILTRO_OLEO';
  if (cod.match(/^CA\d/) || texto.match(/\bca\d{4,}/i)) return 'FILTRO_AR';
  if (cod.match(/^CF\d/) || texto.match(/\bcf\d+/i)) return 'FILTRO_AR_CONDICIONADO';
  if (cod.match(/^G\d/) || texto.match(/\bg\d{4}/i)) return 'FILTRO_COMBUSTIVEL';

  // Bosch filters
  if (cod.includes('OB') || cod.includes('OF') || texto.match(/\bo[bf]\d+/i)) return 'FILTRO_OLEO';

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

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  console.log('========================================');
  console.log('[PRODUTOS API] GET request iniciado');
  console.log('[PRODUTOS API] URL:', request.url);
  console.log('[PRODUTOS API] DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('[PRODUTOS API] DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 30) + '...');

  try {
    const { searchParams } = new URL(request.url);
    const busca = searchParams.get('busca') || '';
    const categoria = searchParams.get('categoria') || '';
    const ativoParam = searchParams.get('ativo');
    const filialIdParam = searchParams.get('filialId');

    console.log('[PRODUTOS API] Params - busca:', busca, 'categoria:', categoria, 'ativo:', ativoParam, 'filialId:', filialIdParam);
    console.log('[PRODUTOS API] Tentando conectar ao banco...');

    // Filtro de ativo: 'todos' = não filtra, 'true' = apenas ativos, 'false' = apenas inativos
    const ativoFilter = ativoParam === 'todos' ? {} : ativoParam === 'false' ? { ativo: false } : { ativo: true };

    // Filtro de filial: se 'sem' = produtos sem filial, se número = filial específica
    const filialFilter = filialIdParam === 'sem'
      ? { filialId: null }
      : filialIdParam
        ? { filialId: parseInt(filialIdParam) }
        : {};

    const produtos = await prisma.produto.findMany({
      where: {
        empresaId: session.empresaId,
        ...ativoFilter,
        ...filialFilter,
        ...(busca && {
          OR: [
            { nome: { contains: busca, mode: 'insensitive' } },
            { codigo: { contains: busca, mode: 'insensitive' } },
            { marca: { contains: busca, mode: 'insensitive' } },
          ],
        }),
        ...(categoria && { categoria: categoria as any }),
      },
      include: {
        filial: {
          select: {
            id: true,
            nome: true,
            cnpj: true,
          },
        },
      },
      orderBy: { nome: 'asc' },
    });

    console.log('[PRODUTOS API] Query executada com sucesso!');
    console.log('[PRODUTOS API] Produtos encontrados:', produtos.length);

    const data = produtos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nome: p.nome,
      marca: p.marca,
      categoria: p.categoria.toLowerCase(),
      unidade: p.unidade,
      volumeUnidade: p.volumeUnidade ? Number(p.volumeUnidade) : null,
      quantidade: Number(p.quantidade),
      estoqueMinimo: Number(p.estoqueMinimo),
      precoCompra: Number(p.precoCompra),
      precoCompraAtual: Number(p.precoCompraAtual),
      precoVenda: Number(p.precoVenda),
      precoGranel: p.precoGranel ? Number(p.precoGranel) : null,
      localizacao: p.localizacao,
      cnpjFornecedor: p.cnpjFornecedor,
      filialId: p.filialId,
      filialNome: p.filial?.nome || null,
      ativo: p.ativo,
      estoqueBaixo: Number(p.quantidade) <= Number(p.estoqueMinimo),
    }));

    console.log('[PRODUTOS API] Dados mapeados, retornando resposta...');
    console.log('========================================');

    return NextResponse.json({ data, total: data.length });
  } catch (error: any) {
    console.error('========================================');
    console.error('[PRODUTOS API] ERRO CAPTURADO!');
    console.error('[PRODUTOS API] Tipo do erro:', error?.constructor?.name);
    console.error('[PRODUTOS API] Mensagem:', error?.message);
    console.error('[PRODUTOS API] Code:', error?.code);
    console.error('[PRODUTOS API] Stack:', error?.stack);
    console.error('[PRODUTOS API] Erro completo:', JSON.stringify(error, null, 2));
    console.error('========================================');

    return NextResponse.json({
      error: 'Erro ao buscar produtos',
      details: error?.message,
      code: error?.code,
      type: error?.constructor?.name
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  console.log('========================================');
  console.log('[PRODUTOS API] POST request iniciado');
  console.log('[PRODUTOS API] DATABASE_URL exists:', !!process.env.DATABASE_URL);

  try {
    const body = await request.json();
    console.log('[PRODUTOS API] Body recebido:', JSON.stringify(body, null, 2));

    // Convert unidade to uppercase (enum format)
    const unidade = (body.unidade?.toUpperCase?.() || body.unidade) || 'UNIDADE';

    // Auto-detectar categoria se for "OUTRO" ou não informada
    let categoria = body.categoria?.toUpperCase?.() || body.categoria || 'OUTRO';
    if (categoria === 'OUTRO' || !categoria) {
      const categoriaDetectada = detectCategoria(body.nome || '', body.codigo || '');
      if (categoriaDetectada !== 'OUTRO') {
        console.log('[PRODUTOS API] Categoria auto-detectada:', categoriaDetectada);
        categoria = categoriaDetectada;
      }
    }

    // Check if codigo already exists for this empresa
    if (body.codigo) {
      const existing = await prisma.produto.findFirst({
        where: { codigo: body.codigo, empresaId: session.empresaId }
      });
      if (existing) {
        return NextResponse.json({ error: 'Código já cadastrado' }, { status: 400 });
      }
    }

    const produto = await prisma.produto.create({
      data: {
        codigo: body.codigo,
        nome: body.nome,
        marca: body.marca,
        categoria: categoria,
        unidade: unidade,
        volumeUnidade: body.volumeUnidade || null,
        quantidade: body.quantidade || 0,
        estoqueMinimo: body.estoqueMinimo || 0,
        precoCompra: body.precoCompra || 0,
        precoCompraAtual: body.precoCompraAtual || body.precoCompra || 0,
        precoVenda: body.precoVenda || 0,
        precoGranel: body.precoGranel || null,
        localizacao: body.localizacao || null,
        cnpjFornecedor: body.cnpjFornecedor || null,
        filialId: body.filialId || null,
        empresaId: session.empresaId,
      },
    });

    console.log('[PRODUTOS API] Produto criado com sucesso! ID:', produto.id);
    console.log('========================================');

    return NextResponse.json({ data: produto }, { status: 201 });
  } catch (error: any) {
    console.error('========================================');
    console.error('[PRODUTOS API POST] ERRO CAPTURADO!');
    console.error('[PRODUTOS API POST] Tipo:', error?.constructor?.name);
    console.error('[PRODUTOS API POST] Mensagem:', error?.message);
    console.error('[PRODUTOS API POST] Code:', error?.code);
    console.error('[PRODUTOS API POST] Stack:', error?.stack);
    console.error('========================================');

    return NextResponse.json({
      error: 'Erro ao criar produto',
      details: error?.message,
      code: error?.code
    }, { status: 500 });
  }
}
