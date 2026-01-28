import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { Cliente, Veiculo, OrdemServico } from '@lubia/types';

const fastify = Fastify({ logger: true });

// CORS
fastify.register(cors, {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
});

// Mock data (será substituído por banco de dados)
const clientes: Cliente[] = [
  { id: 1, nome: 'João Silva', telefone: '(11) 99999-1234', veiculos: 2 },
  { id: 2, nome: 'Maria Santos', telefone: '(11) 98888-5678', veiculos: 1 },
  { id: 3, nome: 'Pedro Oliveira', telefone: '(11) 97777-9012', veiculos: 3 },
];

const veiculos: Veiculo[] = [
  { id: 1, placa: 'ABC-1234', modelo: 'Honda Civic', marca: 'Honda', ano: 2020, km: '45.230', clienteId: 1 },
  { id: 2, placa: 'DEF-5678', modelo: 'Toyota Corolla', marca: 'Toyota', ano: 2019, km: '62.450', clienteId: 2 },
  { id: 3, placa: 'GHI-9012', modelo: 'VW Golf', marca: 'Volkswagen', ano: 2021, km: '28.100', clienteId: 3 },
];

// Routes
fastify.get('/', async () => {
  return { message: 'LubIA API v1.0', status: 'online' };
});

// Clientes
fastify.get('/api/clientes', async () => {
  return { data: clientes, total: clientes.length };
});

fastify.get<{ Params: { id: string } }>('/api/clientes/:id', async (request, reply) => {
  const cliente = clientes.find(c => c.id === Number(request.params.id));
  if (!cliente) {
    reply.code(404);
    return { error: 'Cliente não encontrado' };
  }
  return { data: cliente };
});

// Veículos
fastify.get('/api/veiculos', async () => {
  return { data: veiculos, total: veiculos.length };
});

fastify.get<{ Params: { id: string } }>('/api/veiculos/:id', async (request, reply) => {
  const veiculo = veiculos.find(v => v.id === Number(request.params.id));
  if (!veiculo) {
    reply.code(404);
    return { error: 'Veículo não encontrado' };
  }
  return { data: veiculo };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3333, host: '0.0.0.0' });
    console.log('🚀 API rodando em http://localhost:3333');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
