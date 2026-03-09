import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  emitirNFe,
  buscarConfigNFe,
  proximoNumeroNFe,
  type DadosNFe,
  type ItemNFe,
  type DadosDestinatario,
} from '@/lib/nfe';

// POST - Emitir NF-e a partir de OS ou Venda Rápida
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { ordemServicoId, vendaRapidaId } = body;

    if (!ordemServicoId && !vendaRapidaId) {
      return NextResponse.json({
        error: 'Informe ordemServicoId ou vendaRapidaId',
      }, { status: 400 });
    }

    // Buscar config NF-e da empresa
    const configNFe = await buscarConfigNFe(session.empresaId);

    // Verificar certificado
    const cert = await prisma.certificadoDigital.findUnique({
      where: { empresaId: session.empresaId },
    });
    if (!cert) {
      return NextResponse.json({
        error: 'Certificado digital não encontrado. Faça o upload nas configurações.',
      }, { status: 400 });
    }
    if (new Date(cert.validade) < new Date()) {
      return NextResponse.json({
        error: 'Certificado digital expirado.',
      }, { status: 400 });
    }

    let itens: ItemNFe[] = [];
    let destinatario: DadosDestinatario | undefined;
    let valorTotal = 0;
    let valorProdutos = 0;
    let valorServicos = 0;
    let valorDesconto = 0;
    let formaPagamento = 'DINHEIRO';
    let osId: number | undefined;
    let vrId: number | undefined;

    if (ordemServicoId) {
      // === EMISSÃO A PARTIR DE ORDEM DE SERVIÇO ===
      const os = await prisma.ordemServico.findFirst({
        where: { id: ordemServicoId, empresaId: session.empresaId },
        include: {
          itensProduto: {
            include: { produto: true },
          },
          servicosExtras: true,
          veiculo: {
            include: { cliente: true },
          },
          pagamentos: true,
        },
      });

      if (!os) {
        return NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 });
      }

      if (os.status !== 'CONCLUIDO' && os.status !== 'ENTREGUE') {
        return NextResponse.json({
          error: 'Apenas ordens concluídas ou entregues podem emitir NF-e',
        }, { status: 400 });
      }

      // Verificar se já tem NF-e autorizada
      const nfExistente = await prisma.notaFiscal.findFirst({
        where: {
          ordemServicoId: os.id,
          empresaId: session.empresaId,
          status: 'AUTORIZADA',
        },
      });
      if (nfExistente) {
        return NextResponse.json({
          error: `Já existe NF-e autorizada para esta OS (Nº ${nfExistente.numero})`,
        }, { status: 400 });
      }

      // Montar itens de produtos
      for (const item of os.itensProduto) {
        if (!item.produto.ncm || !item.produto.cfop) {
          return NextResponse.json({
            error: `Produto "${item.produto.nome}" não tem NCM ou CFOP cadastrado. Atualize no estoque.`,
          }, { status: 400 });
        }

        itens.push({
          codigo: item.produto.codigo,
          descricao: item.produto.nome,
          ncm: item.produto.ncm,
          cfop: parseInt(item.produto.cfop),
          unidade: item.produto.unidade === 'LITRO' ? 'LT' : 'UN',
          quantidade: Number(item.quantidade),
          valorUnitario: Number(item.precoUnitario),
          valorTotal: Number(item.subtotal),
          desconto: Number(item.desconto),
        });
      }

      // Serviços extras como itens (se houver)
      for (const svc of os.servicosExtras) {
        itens.push({
          codigo: `SVC-${svc.id}`,
          descricao: svc.descricao,
          ncm: '00000000',
          cfop: 5933, // CFOP para serviços
          unidade: 'SV',
          quantidade: 1,
          valorUnitario: Number(svc.valor),
          valorTotal: Number(svc.valor),
        });
        valorServicos += Number(svc.valor);
      }

      if (itens.length === 0) {
        return NextResponse.json({
          error: 'A ordem de serviço não possui itens para emissão de NF-e',
        }, { status: 400 });
      }

      // Destinatário
      const cliente = os.veiculo?.cliente;
      if (cliente) {
        destinatario = {
          cpf: cliente.cpf || undefined,
          cnpj: (cliente as any).cnpj || undefined,
          nome: cliente.nome,
        };
      }

      valorProdutos = itens.reduce((sum, i) => sum + i.valorTotal, 0);
      valorDesconto = Number(os.desconto) > 0 ? (valorProdutos * Number(os.desconto)) / 100 : 0;
      valorTotal = Number(os.total);
      formaPagamento = os.formaPagamento || os.pagamentos[0]?.tipo || 'DINHEIRO';
      osId = os.id;

    } else if (vendaRapidaId) {
      // === EMISSÃO A PARTIR DE VENDA RÁPIDA ===
      const vr = await prisma.vendaRapida.findFirst({
        where: { id: vendaRapidaId, empresaId: session.empresaId },
        include: {
          itens: {
            include: { produto: true },
          },
          pagamentos: true,
        },
      });

      if (!vr) {
        return NextResponse.json({ error: 'Venda rápida não encontrada' }, { status: 404 });
      }

      // Verificar se já tem NF-e autorizada
      const nfExistente = await prisma.notaFiscal.findFirst({
        where: {
          vendaRapidaId: vr.id,
          empresaId: session.empresaId,
          status: 'AUTORIZADA',
        },
      });
      if (nfExistente) {
        return NextResponse.json({
          error: `Já existe NF-e autorizada para esta venda (Nº ${nfExistente.numero})`,
        }, { status: 400 });
      }

      // Montar itens
      for (const item of vr.itens) {
        if (!item.produto.ncm || !item.produto.cfop) {
          return NextResponse.json({
            error: `Produto "${item.produto.nome}" não tem NCM ou CFOP cadastrado. Atualize no estoque.`,
          }, { status: 400 });
        }

        itens.push({
          codigo: item.produto.codigo,
          descricao: item.produto.nome,
          ncm: item.produto.ncm,
          cfop: parseInt(item.produto.cfop),
          unidade: item.produto.unidade === 'LITRO' ? 'LT' : 'UN',
          quantidade: Number(item.quantidade),
          valorUnitario: Number(item.precoUnitario),
          valorTotal: Number(item.subtotal),
          desconto: Number(item.desconto),
        });
      }

      if (itens.length === 0) {
        return NextResponse.json({
          error: 'A venda não possui itens para emissão de NF-e',
        }, { status: 400 });
      }

      // Venda rápida: consumidor final (sem CPF obrigatório)
      if (vr.nomeCliente) {
        destinatario = { nome: vr.nomeCliente };
      }

      valorProdutos = itens.reduce((sum, i) => sum + i.valorTotal, 0);
      valorDesconto = Number(vr.desconto) > 0 ? (valorProdutos * Number(vr.desconto)) / 100 : 0;
      valorTotal = Number(vr.total);
      formaPagamento = vr.formaPagamento || vr.pagamentos[0]?.tipo || 'DINHEIRO';
      vrId = vr.id;
    }

    // Próximo número de NF-e
    const numero = await proximoNumeroNFe(session.empresaId);

    // Montar dados completos
    const dadosNFe: DadosNFe = {
      emitente: configNFe,
      destinatario,
      itens,
      valorTotal,
      valorProdutos,
      valorServicos: valorServicos > 0 ? valorServicos : undefined,
      valorDesconto,
      numero,
      formaPagamento,
      valorPagamento: valorTotal,
    };

    // Emitir na SEFAZ
    const resultado = await emitirNFe(session.empresaId, dadosNFe);

    // Salvar no banco
    const notaFiscal = await prisma.notaFiscal.create({
      data: {
        empresaId: session.empresaId,
        ordemServicoId: osId,
        vendaRapidaId: vrId,
        numero,
        serie: configNFe.serie,
        chaveAcesso: resultado.chaveAcesso,
        protocolo: resultado.protocolo,
        status: resultado.success ? 'AUTORIZADA' : 'REJEITADA',
        xmlEnvio: resultado.xmlEnvio,
        xmlRetorno: resultado.xmlRetorno,
        danfePdf: resultado.danfePdf || null,
        valorTotal,
        valorProdutos,
        valorServicos: valorServicos > 0 ? valorServicos : null,
        motivoCancelamento: resultado.success ? null : resultado.motivo,
      },
    });

    if (resultado.success) {
      return NextResponse.json({
        success: true,
        data: {
          id: notaFiscal.id,
          numero: notaFiscal.numero,
          serie: notaFiscal.serie,
          chaveAcesso: notaFiscal.chaveAcesso,
          protocolo: notaFiscal.protocolo,
          status: notaFiscal.status,
          valorTotal: notaFiscal.valorTotal,
        },
      });
    }

    return NextResponse.json({
      error: `NF-e rejeitada pela SEFAZ: ${resultado.motivo}`,
      data: {
        id: notaFiscal.id,
        numero: notaFiscal.numero,
        status: 'REJEITADA',
        motivo: resultado.motivo,
      },
    }, { status: 422 });

  } catch (error: any) {
    console.error('[NFE EMITIR] Erro:', error?.message);
    return NextResponse.json({
      error: error?.message || 'Erro ao emitir NF-e',
    }, { status: 500 });
  }
}
