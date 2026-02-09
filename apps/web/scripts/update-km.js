const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Listar veículos
  const veiculos = await prisma.veiculo.findMany({
    include: { cliente: true }
  });

  console.log('Veiculos encontrados:');
  veiculos.forEach(v => {
    console.log(`ID: ${v.id}, Placa: ${v.placa}, ${v.marca} ${v.modelo}, KM: ${v.kmAtual || 'N/A'}, Cliente: ${v.cliente.nome}`);
  });

  // Atualizar KM para valores que gerem lembretes (próximos de múltiplos de 5000)
  // Para gerar lembrete, o km atual deve estar a menos de 500km do próximo múltiplo de 5000
  // Ex: 4600km (faltam 400 para 5000) ou 9700km (faltam 300 para 10000)

  const kmsParaTeste = [4600, 9700, 14800]; // Todos vão gerar lembretes

  for (let i = 0; i < Math.min(veiculos.length, kmsParaTeste.length); i++) {
    const v = veiculos[i];
    const novoKm = kmsParaTeste[i];

    await prisma.veiculo.update({
      where: { id: v.id },
      data: { kmAtual: novoKm }
    });

    console.log(`\nAtualizado ${v.placa}: ${v.kmAtual || 0} -> ${novoKm} km`);
  }

  console.log('\nDone! Agora vá em Lembretes e clique em "Gerar Auto"');
}

main().catch(console.error).finally(() => prisma.$disconnect());
