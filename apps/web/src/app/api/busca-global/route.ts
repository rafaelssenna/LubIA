import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results: Array<{
      tipo: 'cliente' | 'veiculo' | 'ordem';
      id: number;
      titulo: string;
      subtitulo: string;
    }> = [];

    // Buscar clientes
    const clientes = await prisma.cliente.findMany({
      where: {
        empresaId: session.empresaId,
        OR: [
          { nome: { contains: query, mode: 'insensitive' } },
          { telefone: { contains: query } },
          { cpfCnpj: { contains: query } },
        ],
      },
      take: 5,
      orderBy: { nome: 'asc' },
    });

    clientes.forEach((c) => {
      results.push({
        tipo: 'cliente',
        id: c.id,
        titulo: c.nome,
        subtitulo: c.telefone || c.cpfCnpj || '',
      });
    });

    // Buscar veículos por placa
    const veiculos = await prisma.veiculo.findMany({
      where: {
        empresaId: session.empresaId,
        OR: [
          { placa: { contains: query, mode: 'insensitive' } },
          { marca: { contains: query, mode: 'insensitive' } },
          { modelo: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        cliente: { select: { nome: true } },
      },
      take: 5,
      orderBy: { placa: 'asc' },
    });

    veiculos.forEach((v) => {
      results.push({
        tipo: 'veiculo',
        id: v.id,
        titulo: `${v.placa} - ${v.marca} ${v.modelo}`,
        subtitulo: v.cliente?.nome || '',
      });
    });

    // Buscar ordens de serviço
    const ordens = await prisma.ordemServico.findMany({
      where: {
        empresaId: session.empresaId,
        OR: [
          { id: !isNaN(parseInt(query)) ? parseInt(query) : undefined },
          { veiculo: { placa: { contains: query, mode: 'insensitive' } } },
          { cliente: { nome: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: {
        cliente: { select: { nome: true } },
        veiculo: { select: { placa: true } },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    ordens.forEach((o) => {
      results.push({
        tipo: 'ordem',
        id: o.id,
        titulo: `O.S. #${o.id} - ${o.veiculo?.placa || 'Sem placa'}`,
        subtitulo: `${o.cliente?.nome || 'Cliente'} • ${o.status}`,
      });
    });

    // Ordenar resultados: clientes primeiro, depois veículos, depois ordens
    results.sort((a, b) => {
      const order = { cliente: 0, veiculo: 1, ordem: 2 };
      return order[a.tipo] - order[b.tipo];
    });

    return NextResponse.json({ results: results.slice(0, 10) });
  } catch (error: any) {
    console.error('[BUSCA GLOBAL] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro na busca', results: [] }, { status: 500 });
  }
}
