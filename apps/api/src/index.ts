import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { prisma } from './lib/prisma';
import { extractPlate, extractInvoiceData, extractDocumentData } from './services/ocr';

const fastify = Fastify({ logger: true });

// CORS
fastify.register(cors, {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
});

// Multipart para upload de arquivos
fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// Health check
fastify.get('/', async () => {
  return { message: 'LubIA API v1.0', status: 'online' };
});

// ============ CLIENTES ============

// Listar clientes
fastify.get('/api/clientes', async () => {
  const clientes = await prisma.cliente.findMany({
    include: {
      _count: {
        select: { veiculos: true }
      }
    },
    orderBy: { nome: 'asc' }
  });

  return {
    data: clientes.map(c => ({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      email: c.email,
      cpf: c.cpf,
      veiculos: c._count.veiculos
    })),
    total: clientes.length
  };
});

// Buscar cliente por ID
fastify.get<{ Params: { id: string } }>('/api/clientes/:id', async (request, reply) => {
  const cliente = await prisma.cliente.findUnique({
    where: { id: Number(request.params.id) },
    include: { veiculos: true }
  });

  if (!cliente) {
    reply.code(404);
    return { error: 'Cliente não encontrado' };
  }
  return { data: cliente };
});

// Criar cliente
fastify.post<{ Body: { nome: string; telefone: string; email?: string; cpf?: string; endereco?: string } }>(
  '/api/clientes',
  async (request, reply) => {
    const { nome, telefone, email, cpf, endereco } = request.body;

    const cliente = await prisma.cliente.create({
      data: { nome, telefone, email, cpf, endereco }
    });

    reply.code(201);
    return { data: cliente };
  }
);

// Atualizar cliente
fastify.put<{ Params: { id: string }; Body: { nome?: string; telefone?: string; email?: string; cpf?: string; endereco?: string } }>(
  '/api/clientes/:id',
  async (request, reply) => {
    const { nome, telefone, email, cpf, endereco } = request.body;

    try {
      const cliente = await prisma.cliente.update({
        where: { id: Number(request.params.id) },
        data: { nome, telefone, email, cpf, endereco }
      });
      return { data: cliente };
    } catch {
      reply.code(404);
      return { error: 'Cliente não encontrado' };
    }
  }
);

// Deletar cliente
fastify.delete<{ Params: { id: string } }>('/api/clientes/:id', async (request, reply) => {
  try {
    await prisma.cliente.delete({
      where: { id: Number(request.params.id) }
    });
    return { success: true };
  } catch {
    reply.code(404);
    return { error: 'Cliente não encontrado' };
  }
});

// ============ VEÍCULOS ============

// Listar veículos
fastify.get('/api/veiculos', async () => {
  const veiculos = await prisma.veiculo.findMany({
    include: { cliente: true },
    orderBy: { placa: 'asc' }
  });

  return {
    data: veiculos.map(v => ({
      id: v.id,
      placa: v.placa,
      marca: v.marca,
      modelo: v.modelo,
      ano: v.ano,
      cor: v.cor,
      km: v.kmAtual?.toString() || '0',
      clienteId: v.clienteId,
      clienteNome: v.cliente.nome
    })),
    total: veiculos.length
  };
});

// Buscar veículo por ID
fastify.get<{ Params: { id: string } }>('/api/veiculos/:id', async (request, reply) => {
  const veiculo = await prisma.veiculo.findUnique({
    where: { id: Number(request.params.id) },
    include: { cliente: true, ordens: true }
  });

  if (!veiculo) {
    reply.code(404);
    return { error: 'Veículo não encontrado' };
  }
  return { data: veiculo };
});

// Criar veículo
fastify.post<{ Body: { placa: string; marca: string; modelo: string; ano?: number; cor?: string; kmAtual?: number; clienteId: number } }>(
  '/api/veiculos',
  async (request, reply) => {
    const { placa, marca, modelo, ano, cor, kmAtual, clienteId } = request.body;

    const veiculo = await prisma.veiculo.create({
      data: { placa, marca, modelo, ano, cor, kmAtual, clienteId }
    });

    reply.code(201);
    return { data: veiculo };
  }
);

// ============ SERVIÇOS ============

// Listar serviços
fastify.get('/api/servicos', async () => {
  const servicos = await prisma.servico.findMany({
    where: { ativo: true },
    orderBy: { nome: 'asc' }
  });

  return { data: servicos, total: servicos.length };
});

// Criar serviço
fastify.post<{ Body: { nome: string; descricao?: string; precoBase: number; duracaoMin?: number } }>(
  '/api/servicos',
  async (request, reply) => {
    const { nome, descricao, precoBase, duracaoMin } = request.body;

    const servico = await prisma.servico.create({
      data: { nome, descricao, precoBase, duracaoMin }
    });

    reply.code(201);
    return { data: servico };
  }
);

// ============ ORDENS DE SERVIÇO ============

// Listar ordens
fastify.get('/api/ordens', async () => {
  const ordens = await prisma.ordemServico.findMany({
    include: {
      veiculo: {
        include: { cliente: true }
      },
      itens: {
        include: { servico: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return {
    data: ordens.map(o => ({
      id: o.numero,
      clienteNome: o.veiculo.cliente.nome,
      veiculo: `${o.veiculo.marca} ${o.veiculo.modelo}`,
      placa: o.veiculo.placa,
      status: o.status.toLowerCase(),
      dataAgendada: o.dataAgendada?.toISOString().split('T')[0],
      total: Number(o.total),
      servicos: o.itens.map(i => i.servico.nome)
    })),
    total: ordens.length
  };
});

// Criar ordem de serviço
fastify.post<{ Body: { veiculoId: number; dataAgendada?: string; kmEntrada?: number; observacoes?: string } }>(
  '/api/ordens',
  async (request, reply) => {
    const { veiculoId, dataAgendada, kmEntrada, observacoes } = request.body;

    const ordem = await prisma.ordemServico.create({
      data: {
        veiculoId,
        dataAgendada: dataAgendada ? new Date(dataAgendada) : null,
        kmEntrada,
        observacoes
      }
    });

    reply.code(201);
    return { data: ordem };
  }
);

// Atualizar status da ordem
fastify.patch<{ Params: { id: string }; Body: { status: string } }>(
  '/api/ordens/:id/status',
  async (request, reply) => {
    const { status } = request.body;

    try {
      const ordem = await prisma.ordemServico.update({
        where: { numero: request.params.id },
        data: {
          status: status.toUpperCase() as any,
          ...(status === 'EM_ANDAMENTO' && { dataInicio: new Date() }),
          ...(status === 'CONCLUIDO' && { dataConclusao: new Date() })
        }
      });
      return { data: ordem };
    } catch {
      reply.code(404);
      return { error: 'Ordem não encontrada' };
    }
  }
);

// ============ LEMBRETES ============

// Listar lembretes
fastify.get('/api/lembretes', async () => {
  const lembretes = await prisma.lembrete.findMany({
    include: {
      veiculo: {
        include: { cliente: true }
      }
    },
    orderBy: { dataLembrete: 'asc' }
  });

  return {
    data: lembretes.map(l => ({
      id: l.id,
      clienteNome: l.veiculo.cliente.nome,
      telefone: l.veiculo.cliente.telefone,
      veiculo: `${l.veiculo.marca} ${l.veiculo.modelo}`,
      placa: l.veiculo.placa,
      tipo: l.tipo.toLowerCase().replace('_', ' '),
      dataLembrete: l.dataLembrete.toISOString().split('T')[0],
      enviado: l.enviado
    })),
    total: lembretes.length
  };
});

// ============ ESTOQUE / PRODUTOS ============

// Listar produtos
fastify.get<{ Querystring: { categoria?: string; marca?: string; busca?: string; estoqueBaixo?: string } }>(
  '/api/produtos',
  async (request) => {
    const { categoria, marca, busca, estoqueBaixo } = request.query;

    const where: any = { ativo: true };

    if (categoria) {
      where.categoria = categoria.toUpperCase();
    }
    if (marca) {
      where.marca = { contains: marca, mode: 'insensitive' };
    }
    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { codigo: { contains: busca, mode: 'insensitive' } },
        { marca: { contains: busca, mode: 'insensitive' } }
      ];
    }

    const produtos = await prisma.produto.findMany({
      where,
      orderBy: [{ categoria: 'asc' }, { marca: 'asc' }, { nome: 'asc' }]
    });

    let data = produtos.map(p => ({
      id: p.id,
      codigo: p.codigo,
      nome: p.nome,
      marca: p.marca,
      categoria: p.categoria.toLowerCase(),
      unidade: p.unidade.toLowerCase(),
      quantidade: Number(p.quantidade),
      estoqueMinimo: Number(p.estoqueMinimo),
      precoCompra: Number(p.precoCompra),
      precoCompraAtual: Number(p.precoCompraAtual),
      precoVenda: Number(p.precoVenda),
      precoGranel: p.precoGranel ? Number(p.precoGranel) : null,
      localizacao: p.localizacao,
      estoqueBaixo: Number(p.quantidade) <= Number(p.estoqueMinimo)
    }));

    // Filtrar por estoque baixo se solicitado
    if (estoqueBaixo === 'true') {
      data = data.filter(p => p.estoqueBaixo);
    }

    return { data, total: data.length };
  }
);

// Buscar produto por ID
fastify.get<{ Params: { id: string } }>('/api/produtos/:id', async (request, reply) => {
  const produto = await prisma.produto.findUnique({
    where: { id: Number(request.params.id) },
    include: {
      movimentacoes: {
        orderBy: { createdAt: 'desc' },
        take: 20
      }
    }
  });

  if (!produto) {
    reply.code(404);
    return { error: 'Produto não encontrado' };
  }

  return {
    data: {
      ...produto,
      quantidade: Number(produto.quantidade),
      estoqueMinimo: Number(produto.estoqueMinimo),
      precoCompra: Number(produto.precoCompra),
      precoCompraAtual: Number(produto.precoCompraAtual),
      precoVenda: Number(produto.precoVenda),
      precoGranel: produto.precoGranel ? Number(produto.precoGranel) : null,
      movimentacoes: produto.movimentacoes.map(m => ({
        id: m.id,
        tipo: m.tipo.toLowerCase(),
        quantidade: Number(m.quantidade),
        precoUnit: m.precoUnit ? Number(m.precoUnit) : null,
        motivo: m.motivo,
        documento: m.documento,
        data: m.createdAt.toISOString()
      }))
    }
  };
});

// Criar produto
fastify.post<{
  Body: {
    codigo: string;
    nome: string;
    marca: string;
    categoria: string;
    unidade?: string;
    quantidade?: number;
    estoqueMinimo?: number;
    precoCompra?: number;
    precoCompraAtual?: number;
    precoVenda?: number;
    precoGranel?: number;
    localizacao?: string;
  };
}>('/api/produtos', async (request, reply) => {
  const {
    codigo, nome, marca, categoria, unidade,
    quantidade, estoqueMinimo, precoCompra,
    precoCompraAtual, precoVenda, precoGranel, localizacao
  } = request.body;

  try {
    const produto = await prisma.produto.create({
      data: {
        codigo,
        nome,
        marca,
        categoria: categoria.toUpperCase() as any,
        unidade: (unidade?.toUpperCase() || 'UNIDADE') as any,
        quantidade: quantidade || 0,
        estoqueMinimo: estoqueMinimo || 0,
        precoCompra: precoCompra || 0,
        precoCompraAtual: precoCompraAtual || precoCompra || 0,
        precoVenda: precoVenda || 0,
        precoGranel,
        localizacao
      }
    });

    reply.code(201);
    return { data: produto };
  } catch (error: any) {
    if (error.code === 'P2002') {
      reply.code(400);
      return { error: 'Código do produto já existe' };
    }
    throw error;
  }
});

// Atualizar produto
fastify.put<{
  Params: { id: string };
  Body: {
    codigo?: string;
    nome?: string;
    marca?: string;
    categoria?: string;
    unidade?: string;
    estoqueMinimo?: number;
    precoCompra?: number;
    precoCompraAtual?: number;
    precoVenda?: number;
    precoGranel?: number;
    localizacao?: string;
    ativo?: boolean;
  };
}>('/api/produtos/:id', async (request, reply) => {
  const { id } = request.params;
  const data = request.body;

  try {
    const updateData: any = { ...data };
    if (data.categoria) updateData.categoria = data.categoria.toUpperCase();
    if (data.unidade) updateData.unidade = data.unidade.toUpperCase();

    const produto = await prisma.produto.update({
      where: { id: Number(id) },
      data: updateData
    });

    return { data: produto };
  } catch (error: any) {
    if (error.code === 'P2025') {
      reply.code(404);
      return { error: 'Produto não encontrado' };
    }
    if (error.code === 'P2002') {
      reply.code(400);
      return { error: 'Código do produto já existe' };
    }
    throw error;
  }
});

// Deletar produto (soft delete)
fastify.delete<{ Params: { id: string } }>('/api/produtos/:id', async (request, reply) => {
  try {
    await prisma.produto.update({
      where: { id: Number(request.params.id) },
      data: { ativo: false }
    });
    return { success: true };
  } catch {
    reply.code(404);
    return { error: 'Produto não encontrado' };
  }
});

// Movimentação de estoque (entrada/saída)
fastify.post<{
  Params: { id: string };
  Body: {
    tipo: string;
    quantidade: number;
    precoUnit?: number;
    motivo?: string;
    documento?: string;
  };
}>('/api/produtos/:id/movimentacao', async (request, reply) => {
  const { id } = request.params;
  const { tipo, quantidade, precoUnit, motivo, documento } = request.body;

  const produto = await prisma.produto.findUnique({
    where: { id: Number(id) }
  });

  if (!produto) {
    reply.code(404);
    return { error: 'Produto não encontrado' };
  }

  const tipoUpper = tipo.toUpperCase() as 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'DEVOLUCAO';
  let novaQuantidade = Number(produto.quantidade);

  if (tipoUpper === 'ENTRADA' || tipoUpper === 'DEVOLUCAO') {
    novaQuantidade += quantidade;
  } else if (tipoUpper === 'SAIDA') {
    novaQuantidade -= quantidade;
    if (novaQuantidade < 0) {
      reply.code(400);
      return { error: 'Quantidade insuficiente em estoque' };
    }
  } else if (tipoUpper === 'AJUSTE') {
    novaQuantidade = quantidade; // Ajuste define quantidade absoluta
  }

  // Transação para atualizar quantidade e registrar movimentação
  const [movimentacao] = await prisma.$transaction([
    prisma.movimentacaoEstoque.create({
      data: {
        produtoId: Number(id),
        tipo: tipoUpper,
        quantidade,
        precoUnit,
        motivo,
        documento
      }
    }),
    prisma.produto.update({
      where: { id: Number(id) },
      data: {
        quantidade: novaQuantidade,
        ...(tipoUpper === 'ENTRADA' && precoUnit ? { precoCompraAtual: precoUnit } : {})
      }
    })
  ]);

  reply.code(201);
  return {
    data: {
      movimentacao: {
        id: movimentacao.id,
        tipo: movimentacao.tipo.toLowerCase(),
        quantidade: Number(movimentacao.quantidade),
        precoUnit: movimentacao.precoUnit ? Number(movimentacao.precoUnit) : null
      },
      novaQuantidade
    }
  };
});

// Listar categorias disponíveis
fastify.get('/api/produtos/categorias', async () => {
  return {
    data: [
      { value: 'OLEO_LUBRIFICANTE', label: 'Óleo Lubrificante' },
      { value: 'ADITIVO', label: 'Aditivo' },
      { value: 'GRAXA', label: 'Graxa' },
      { value: 'FILTRO_OLEO', label: 'Filtro de Óleo' },
      { value: 'FILTRO_AR', label: 'Filtro de Ar' },
      { value: 'FILTRO_AR_CONDICIONADO', label: 'Filtro de Ar Condicionado' },
      { value: 'FILTRO_COMBUSTIVEL', label: 'Filtro de Combustível' },
      { value: 'ACESSORIO', label: 'Acessório' },
      { value: 'OUTRO', label: 'Outro' }
    ]
  };
});

// Produtos com estoque baixo (para alertas)
fastify.get('/api/estoque/alertas', async () => {
  const produtos = await prisma.$queryRaw`
    SELECT * FROM produtos
    WHERE ativo = true AND quantidade <= estoque_minimo
    ORDER BY categoria, marca, nome
  ` as any[];

  return {
    data: produtos.map(p => ({
      id: p.id,
      codigo: p.codigo,
      nome: p.nome,
      marca: p.marca,
      categoria: p.categoria.toLowerCase(),
      quantidade: Number(p.quantidade),
      estoqueMinimo: Number(p.estoque_minimo)
    })),
    total: produtos.length
  };
});

// ============ OCR ============

// Ler placa de veículo
fastify.post('/api/ocr/placa', async (request, reply) => {
  const file = await request.file();

  if (!file) {
    reply.code(400);
    return { error: 'Nenhuma imagem enviada' };
  }

  const buffer = await file.toBuffer();
  const result = await extractPlate(buffer);

  if (!result) {
    return {
      success: false,
      message: 'Não foi possível identificar uma placa na imagem'
    };
  }

  return {
    success: true,
    data: result
  };
});

// Ler nota fiscal
fastify.post('/api/ocr/nota-fiscal', async (request, reply) => {
  const file = await request.file();

  if (!file) {
    reply.code(400);
    return { error: 'Nenhuma imagem enviada' };
  }

  const buffer = await file.toBuffer();
  const result = await extractInvoiceData(buffer);

  return {
    success: true,
    data: result
  };
});

// Ler documento (CNH ou CRLV)
fastify.post('/api/ocr/documento', async (request, reply) => {
  const file = await request.file();

  if (!file) {
    reply.code(400);
    return { error: 'Nenhuma imagem enviada' };
  }

  const buffer = await file.toBuffer();
  const result = await extractDocumentData(buffer);

  return {
    success: true,
    data: result
  };
});

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 API rodando em http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
