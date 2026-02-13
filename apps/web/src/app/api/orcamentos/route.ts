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
        status: o.status,
        validade: o.validade,
        observacoes: o.observacoes,
        total: Number(o.total),
        ordemServicoId: o.ordemServicoId,
        createdAt: o.createdAt,
        veiculo: {
          id: o.veiculo.id,
          placa: o.veiculo.placa,
          marca: o.veiculo.marca,
          modelo: o.veiculo.modelo,
          ano: o.veiculo.ano,
          cliente: {
            id: o.veiculo.cliente.id,
            nome: o.veiculo.cliente.nome,
            telefone: o.veiculo.cliente.telefone,
          },
        },
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
    const { veiculoId, validade, observacoes, itens, itensProduto, servicosExtras } = body;

    if (!veiculoId) {
      return NextResponse.json({ error: 'Veículo é obrigatório' }, { status: 400 });
    }

    // Verify vehicle exists and belongs to this empresa
    const veiculo = await prisma.veiculo.findFirst({
      where: { id: veiculoId, empresaId: session.empresaId },
    });

    if (!veiculo) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    // Calculate total from services
    let totalServicos = 0;
    const itensData: any[] = [];
    if (itens && itens.length > 0) {
      for (const item of itens) {
        const servico = await prisma.servico.findFirst({
          where: { id: item.servicoId, empresaId: session.empresaId },
        });
        if (servico) {
          const precoUnit = item.precoUnitario || Number(servico.precoBase);
          const qtd = item.quantidade || 1;
          const desc = item.desconto || 0;
          const subtotal = (precoUnit * qtd) - desc;
          totalServicos += subtotal;
          itensData.push({
            servicoId: item.servicoId,
            quantidade: qtd,
            precoUnitario: precoUnit,
            desconto: desc,
            subtotal,
          });
        }
      }
    }

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

    // Calculate total from serviços extras
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

    const total = totalServicos + totalProdutos + totalExtras;

    // Default validade: 7 dias
    const validadeDate = validade ? new Date(validade) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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
          veiculoId,
          validade: validadeDate,
          observacoes: observacoes || null,
          total,
          empresaId: session.empresaId,
          itens: {
            create: itensData,
          },
          itensProduto: {
            create: itensProdutoData,
          },
          servicosExtras: {
            create: servicosExtrasData,
          },
        },
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
      });

      return novoOrcamento;
    });

    return NextResponse.json({
      data: {
        id: orcamento.id,
        numero: orcamento.numero,
        status: orcamento.status,
        validade: orcamento.validade,
        total: Number(orcamento.total),
        veiculo: {
          placa: orcamento.veiculo.placa,
          cliente: orcamento.veiculo.cliente.nome,
        },
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[ORCAMENTOS API POST] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao criar orçamento' }, { status: 500 });
  }
}
