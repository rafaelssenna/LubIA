import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET - Listar NF-e da empresa
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const periodo = searchParams.get('periodo'); // '7d', '30d', '90d', 'all'
    const tipo = searchParams.get('tipo'); // 'os', 'venda', 'all'

    const where: any = { empresaId: session.empresaId };

    // Filtro por status
    if (status && status !== 'all') {
      where.status = status;
    }

    // Filtro por período
    if (periodo && periodo !== 'all') {
      const dias = periodo === '7d' ? 7 : periodo === '30d' ? 30 : periodo === '90d' ? 90 : 365;
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - dias);
      where.createdAt = { gte: dataInicio };
    }

    // Filtro por tipo (OS ou Venda Rápida)
    if (tipo === 'os') {
      where.ordemServicoId = { not: null };
    } else if (tipo === 'venda') {
      where.vendaRapidaId = { not: null };
    }

    const notas = await prisma.notaFiscal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        numero: true,
        serie: true,
        chaveAcesso: true,
        protocolo: true,
        status: true,
        valorTotal: true,
        valorProdutos: true,
        valorServicos: true,
        motivoCancelamento: true,
        createdAt: true,
        ordemServicoId: true,
        vendaRapidaId: true,
        ordemServico: {
          select: {
            numero: true,
            veiculo: {
              select: {
                cliente: {
                  select: { nome: true },
                },
              },
            },
          },
        },
        vendaRapida: {
          select: {
            numero: true,
            nomeCliente: true,
          },
        },
      },
    });

    // Stats
    const stats = {
      total: notas.length,
      autorizadas: notas.filter(n => n.status === 'AUTORIZADA').length,
      canceladas: notas.filter(n => n.status === 'CANCELADA').length,
      rejeitadas: notas.filter(n => n.status === 'REJEITADA').length,
      valorTotal: notas
        .filter(n => n.status === 'AUTORIZADA')
        .reduce((sum, n) => sum + Number(n.valorTotal), 0),
    };

    return NextResponse.json({ data: notas, stats });
  } catch (error: any) {
    console.error('[NFE GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao listar notas fiscais' }, { status: 500 });
  }
}
