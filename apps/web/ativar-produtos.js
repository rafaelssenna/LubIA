const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function ajustarStatusProdutos() {
  try {
    // 1. Ativar produtos que TÊM estoque (quantidade > 0)
    const ativados = await prisma.produto.updateMany({
      where: {
        quantidade: { gt: 0 }
      },
      data: {
        ativo: true
      }
    });

    console.log(`✅ ${ativados.count} produtos COM estoque foram ATIVADOS`);

    // 2. Desativar produtos que NÃO TÊM estoque (quantidade = 0)
    const desativados = await prisma.produto.updateMany({
      where: {
        quantidade: { lte: 0 }
      },
      data: {
        ativo: false
      }
    });

    console.log(`❌ ${desativados.count} produtos SEM estoque foram DESATIVADOS`);

    // Resumo final
    const totalAtivos = await prisma.produto.count({
      where: { ativo: true }
    });

    const totalInativos = await prisma.produto.count({
      where: { ativo: false }
    });

    console.log(`\n📊 Resumo Final:`);
    console.log(`   Produtos ativos (com estoque): ${totalAtivos}`);
    console.log(`   Produtos inativos (sem estoque): ${totalInativos}`);

  } catch (error) {
    console.error('Erro ao ajustar produtos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

ajustarStatusProdutos();
