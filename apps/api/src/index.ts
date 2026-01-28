import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from './lib/prisma';

const fastify = Fastify({ logger: true });

// CORS
fastify.register(cors, {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
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
