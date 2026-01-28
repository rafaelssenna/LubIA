-- CreateEnum
CREATE TYPE "StatusOS" AS ENUM ('AGENDADO', 'AGUARDANDO_PECAS', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO', 'ENTREGUE');

-- CreateEnum
CREATE TYPE "TipoLembrete" AS ENUM ('TROCA_OLEO', 'REVISAO', 'FILTROS', 'PNEUS', 'FREIOS', 'OUTRO');

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "cpf" TEXT,
    "endereco" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" SERIAL NOT NULL,
    "placa" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "ano" INTEGER,
    "cor" TEXT,
    "kmAtual" INTEGER,
    "clienteId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "precoBase" DECIMAL(10,2) NOT NULL,
    "duracaoMin" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordens_servico" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "veiculoId" INTEGER NOT NULL,
    "status" "StatusOS" NOT NULL DEFAULT 'AGENDADO',
    "dataAgendada" TIMESTAMP(3),
    "dataInicio" TIMESTAMP(3),
    "dataConclusao" TIMESTAMP(3),
    "kmEntrada" INTEGER,
    "observacoes" TEXT,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_ordem" (
    "id" SERIAL NOT NULL,
    "ordemId" INTEGER NOT NULL,
    "servicoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "precoUnitario" DECIMAL(10,2) NOT NULL,
    "desconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "itens_ordem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lembretes" (
    "id" SERIAL NOT NULL,
    "veiculoId" INTEGER NOT NULL,
    "tipo" "TipoLembrete" NOT NULL,
    "dataLembrete" TIMESTAMP(3) NOT NULL,
    "kmLembrete" INTEGER,
    "mensagem" TEXT,
    "enviado" BOOLEAN NOT NULL DEFAULT false,
    "dataEnvio" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lembretes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cpf_key" ON "clientes"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_placa_key" ON "veiculos"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "ordens_servico_numero_key" ON "ordens_servico"("numero");

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_ordem" ADD CONSTRAINT "itens_ordem_ordemId_fkey" FOREIGN KEY ("ordemId") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_ordem" ADD CONSTRAINT "itens_ordem_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lembretes" ADD CONSTRAINT "lembretes_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
