import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET - Buscar todos os orçamentos
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const busca = searchParams.get('busca') || '';
    const status = searchParams.get('status') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    const where: any = {
      empresaId: session.empresaId,
    };

    if (busca) {
      where.OR = [
        { numero: { contains: busca, mode: 'insensitive' } },
        { nomeCliente: { contains: busca, mode: 'insensitive' } },
        { telefoneCliente: { contains: busca, mode: 'insensitive' } },
        { veiculo: { placa: { contains: busca, mode: 'insensitive' } } },
        { veiculo: { cliente: { nome: { contains: busca, mode: 'insensitive' } } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const total = await prisma.orcamento.count({ where });

    const orcamentos = await prisma.orcamento.findMany({
      where,
      include: {
        veiculo: {
          include: {
            cliente: true,
          },
        },
        itens: {
          include: {
            servico: true,
          },
        },
        itensProduto: {
          include: {
            produto: true,
          },
        },
        servicosExtras: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Stats
    const [statsTotal, statsPendentes, statsAprovados, statsConvertidos] = await Promise.all([
      prisma.orcamento.count({ where: { empresaId: session.empresaId } }),
      prisma.orcamento.count({
        where: { empresaId: session.empresaId, status: 'PENDENTE' },
      }),
      prisma.orcamento.count({
        where: { empresaId: session.empresaId, status: 'APROVADO' },
      }),
      prisma.orcamento.count({
        where: { empresaId: session.empresaId, status: 'CONVERTIDO' },
      }),
    ]);

    const stats = {
      total: statsTotal,
      pendentes: statsPendentes,
      aprovados: statsAprovados,
      convertidos: statsConvertidos,
    };

    return NextResponse.json({
      data: orcamentos.map(o => ({
        id: o.id,
        numero: o.numero,
        nomeCliente: o.nomeCliente,
        telefoneCliente: o.telefoneCliente,
        status: o.status,
        validade: o.validade,
        observacoes: o.observacoes,
        total: Number(o.total),
        ordemServicoId: o.ordemServicoId,
        createdAt: o.createdAt,
        // Veículo pode ser null agora
        veiculo: o.veiculo ? {
          id: o.veiculo.id,
          placa: o.veiculo.placa,
          marca: o.veiculo.marca,
          modelo: o.veiculo.modelo,
          ano: o.veiculo.ano,
          cliente: o.veiculo.cliente ? {
            id: o.veiculo.cliente.id,
            nome: o.veiculo.cliente.nome,
            telefone: o.veiculo.cliente.telefone,
          } : null,
        } : null,
        itens: o.itens.map(i => ({
          id: i.id,
          servicoId: i.servicoId,
          servicoNome: i.servico.nome,
          quantidade: i.quantidade,
          precoUnitario: Number(i.precoUnitario),
          desconto: Number(i.desconto),
          subtotal: Number(i.subtotal),
        })),
        itensProduto: o.itensProduto.map(i => ({
          id: i.id,
          produtoId: i.produtoId,
          produtoNome: i.produto.nome,
          quantidade: Number(i.quantidade),
          precoUnitario: Number(i.precoUnitario),
          desconto: Number(i.desconto),
          subtotal: Number(i.subtotal),
        })),
        servicosExtras: o.servicosExtras.map(s => ({
          id: s.id,
          descricao: s.descricao,
          valor: Number(s.valor),
        })),
      })),
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[ORCAMENTOS API GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar orçamentos' }, { status: 500 });
  }
}

// POST - Criar novo orçamento
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nomeCliente, telefoneCliente, observacoes, itensProduto, servicosExtras } = body;

    // Calculate total from products
    let totalProdutos = 0;
    const itensProdutoData: any[] = [];
    if (itensProduto && itensProduto.length > 0) {
      for (const item of itensProduto) {
        const produto = await prisma.produto.findFirst({
          where: { id: item.produtoId, empresaId: session.empresaId },
        });
        if (produto) {
          const precoUnit = item.precoUnitario || Number(produto.precoVenda);
          const qtd = item.quantidade || 1;
          const desc = item.desconto || 0;
          const subtotal = (precoUnit * qtd) - desc;
          totalProdutos += subtotal;
          itensProdutoData.push({
            produtoId: item.produtoId,
            quantidade: qtd,
            precoUnitario: precoUnit,
            desconto: desc,
            subtotal,
          });
        }
      }
    }

    // Calculate total from serviços extras (mão de obra)
    let totalExtras = 0;
    const servicosExtrasData: { descricao: string; valor: number }[] = [];
    if (servicosExtras && servicosExtras.length > 0) {
      for (const extra of servicosExtras) {
        if (extra.descricao && extra.valor > 0) {
          totalExtras += extra.valor;
          servicosExtrasData.push({
            descricao: extra.descricao,
            valor: extra.valor,
          });
        }
      }
    }

    const total = totalProdutos + totalExtras;

    if (total === 0) {
      return NextResponse.json({ error: 'Adicione pelo menos um produto ou serviço' }, { status: 400 });
    }

    // Create orcamento with items
    const orcamento = await prisma.$transaction(async (tx) => {
      // Gerar número sequencial por empresa (ORC-0001, ORC-0002...)
      const ultimoOrcamento = await tx.orcamento.findFirst({
        where: { empresaId: session.empresaId },
        orderBy: { id: 'desc' },
        select: { numero: true }
      });

      let proximoNumero = 1;
      if (ultimoOrcamento?.numero) {
        const match = ultimoOrcamento.numero.match(/ORC-(\d+)/);
        if (match) {
          const numeroAtual = parseInt(match[1], 10);
          if (!isNaN(numeroAtual)) {
            proximoNumero = numeroAtual + 1;
          }
        }
      }
      const numeroFormatado = `ORC-${proximoNumero.toString().padStart(4, '0')}`;

      const novoOrcamento = await tx.orcamento.create({
        data: {
          numero: numeroFormatado,
          nomeCliente: nomeCliente || null,
          telefoneCliente: telefoneCliente || null,
          observacoes: observacoes || null,
          total,
          empresaId: session.empresaId,
          itensProduto: {
            create: itensProdutoData,
          },
          servicosExtras: {
            create: servicosExtrasData,
          },
        },
        include: {
          itensProduto: {
            include: {
              produto: true,
            },
          },
          servicosExtras: true,
        },
      });

      return novoOrcamento;
    });

    return NextResponse.json({
      data: {
        id: orcamento.id,
        numero: orcamento.numero,
        nomeCliente: orcamento.nomeCliente,
        telefoneCliente: orcamento.telefoneCliente,
        status: orcamento.status,
        total: Number(orcamento.total),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[ORCAMENTOS API POST] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao criar orçamento' }, { status: 500 });
  }
}
