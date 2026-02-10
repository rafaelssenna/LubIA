import { PrismaClient, Prisma } from '@prisma/client';

export interface StockOperation {
  produtoId: number;
  quantidade: number;
  tipo: 'SAIDA' | 'ENTRADA' | 'DEVOLUCAO';
  motivo: string;
  documento: string;
  empresaId: number;
}

/**
 * Valida se todos os produtos têm estoque suficiente para operações SAIDA.
 * Retorna mensagem de erro se a validação falhar, ou null se OK.
 */
export async function validateStock(
  prisma: PrismaClient,
  operations: StockOperation[]
): Promise<string | null> {
  for (const op of operations) {
    if (op.tipo !== 'SAIDA') continue;

    const produto = await prisma.produto.findUnique({
      where: { id: op.produtoId },
      select: { nome: true, quantidade: true },
    });

    if (!produto) {
      return `Produto ID ${op.produtoId} não encontrado`;
    }

    if (Number(produto.quantidade) < op.quantidade) {
      return `Estoque insuficiente para "${produto.nome}": disponível ${Number(produto.quantidade)}, necessário ${op.quantidade}`;
    }
  }
  return null;
}

/**
 * Executa operações de estoque dentro de uma transação Prisma existente.
 * Deve ser chamado dentro de prisma.$transaction(async (tx) => { ... })
 */
export async function executeStockOperations(
  tx: Prisma.TransactionClient,
  operations: StockOperation[]
): Promise<void> {
  for (const op of operations) {
    const produto = await tx.produto.findUnique({
      where: { id: op.produtoId },
    });

    if (!produto) continue;

    let novaQuantidade = Number(produto.quantidade);
    if (op.tipo === 'SAIDA') {
      novaQuantidade -= op.quantidade;
    } else {
      novaQuantidade += op.quantidade;
    }

    await tx.movimentacaoEstoque.create({
      data: {
        empresaId: op.empresaId,
        produtoId: op.produtoId,
        tipo: op.tipo,
        quantidade: op.quantidade,
        motivo: op.motivo,
        documento: op.documento,
      },
    });

    await tx.produto.update({
      where: { id: op.produtoId },
      data: { quantidade: novaQuantidade },
    });
  }
}

/**
 * Verifica se existem movimentações de SAIDA para um documento (número da O.S.).
 * Usado para evitar criar devoluções fantasma para O.S. antigas.
 */
export async function hasStockMovements(
  prisma: PrismaClient,
  documento: string
): Promise<boolean> {
  const count = await prisma.movimentacaoEstoque.count({
    where: {
      documento,
      tipo: 'SAIDA',
    },
  });
  return count > 0;
}
