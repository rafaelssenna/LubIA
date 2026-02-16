import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function detectCategoria(nome: string, codigo: string): string {
  const texto = nome.toLowerCase();
  const cod = codigo.toUpperCase();

  // Wega filters
  if (cod.includes('WO') || texto.match(/\bwo[-\s]?\d+/i)) return 'FILTRO_OLEO';
  if (cod.includes('WAC')) return 'FILTRO_AR_CONDICIONADO';
  if (cod.includes('WFC')) return 'FILTRO_COMBUSTIVEL';
  if (cod.includes('WA') || cod.includes('WAP')) return 'FILTRO_AR';

  // Tecfil
  if (cod.includes('PSL') || cod.includes('PEL')) return 'FILTRO_OLEO';
  if (cod.includes('ARL')) return 'FILTRO_AR';
  if (cod.includes('ACP')) return 'FILTRO_AR_CONDICIONADO';
  if (cod.includes('GI')) return 'FILTRO_COMBUSTIVEL';

  // Mann
  if (cod.match(/^W\d/) || cod.includes('HU')) return 'FILTRO_OLEO';
  if (cod.match(/^C\d/) && !cod.includes('CU')) return 'FILTRO_AR';
  if (cod.includes('CUK') || cod.includes('CU')) return 'FILTRO_AR_CONDICIONADO';
  if (cod.includes('WK')) return 'FILTRO_COMBUSTIVEL';

  // Fram
  if (cod.match(/^PH\d/)) return 'FILTRO_OLEO';
  if (cod.match(/^CA\d/)) return 'FILTRO_AR';

  // Bosch
  if (cod.includes('OB') || cod.includes('OF')) return 'FILTRO_OLEO';

  // Por descrição - marcas de filtro
  if (texto.includes('wega') || texto.includes('tecfil') || texto.includes('fram') || texto.includes('mann') || texto.includes('mahle')) {
    return 'FILTRO_OLEO';
  }

  return 'OUTRO';
}

async function main() {
  console.log('🔍 Buscando TODOS os produtos com categoria OUTRO...\n');

  const produtos = await prisma.produto.findMany({
    where: { categoria: 'OUTRO' },
    include: { empresa: { select: { nome: true } } }
  });

  console.log(`📦 Encontrados ${produtos.length} produtos com categoria OUTRO\n`);

  let corrigidos = 0;

  for (const p of produtos) {
    const novaCategoria = detectCategoria(p.nome, p.codigo);

    if (novaCategoria !== 'OUTRO') {
      await prisma.produto.update({
        where: { id: p.id },
        data: { categoria: novaCategoria as any }
      });

      console.log(`✅ [${p.empresa?.nome}] ${p.nome} (${p.codigo}): OUTRO → ${novaCategoria}`);
      corrigidos++;
    }
  }

  console.log(`\n🎉 Total corrigido: ${corrigidos} produtos`);
  console.log(`📊 Permaneceram como OUTRO: ${produtos.length - corrigidos} produtos`);

  await prisma.$disconnect();
}

main().catch(console.error);
