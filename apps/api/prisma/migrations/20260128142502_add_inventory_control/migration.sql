-- CreateEnum
CREATE TYPE "CategoriaProduto" AS ENUM ('OLEO_LUBRIFICANTE', 'ADITIVO', 'GRAXA', 'FILTRO_OLEO', 'FILTRO_AR', 'FILTRO_AR_CONDICIONADO', 'FILTRO_COMBUSTIVEL', 'ACESSORIO', 'OUTRO');

-- CreateEnum
CREATE TYPE "UnidadeMedida" AS ENUM ('LITRO', 'UNIDADE', 'KG', 'METRO');

-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE', 'DEVOLUCAO');

-- CreateTable
CREATE TABLE "produtos" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "categoria" "CategoriaProduto" NOT NULL,
    "unidade" "UnidadeMedida" NOT NULL DEFAULT 'UNIDADE',
    "quantidade" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estoqueMinimo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "precoCompra" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "precoCompraAtual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "precoVenda" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "precoGranel" DECIMAL(10,2),
    "localizacao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_estoque" (
    "id" SERIAL NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL,
    "precoUnit" DECIMAL(10,2),
    "motivo" TEXT,
    "documento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_ordem_produto" (
    "id" SERIAL NOT NULL,
    "ordemId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL,
    "precoUnitario" DECIMAL(10,2) NOT NULL,
    "desconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "itens_ordem_produto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "produtos_codigo_key" ON "produtos"("codigo");

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_ordem_produto" ADD CONSTRAINT "itens_ordem_produto_ordemId_fkey" FOREIGN KEY ("ordemId") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_ordem_produto" ADD CONSTRAINT "itens_ordem_produto_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
