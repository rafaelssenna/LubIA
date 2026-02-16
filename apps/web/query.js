const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const p = new PrismaClient();

async function main() {
  console.log('🗑️  Deletando TUDO...\n');

  // Deletar na ordem correta (foreign keys)
  await p.mensagem.deleteMany();
  console.log('   ✓ Mensagens deletadas');

  await p.conversa.deleteMany();
  console.log('   ✓ Conversas deletadas');

  await p.lembrete.deleteMany();
  console.log('   ✓ Lembretes deletados');

  await p.itemOrdemProduto.deleteMany();
  console.log('   ✓ Itens de produto deletados');

  await p.itemOrdem.deleteMany();
  console.log('   ✓ Itens de ordem deletados');

  await p.ordemServico.deleteMany();
  console.log('   ✓ Ordens de serviço deletadas');

  await p.movimentacaoEstoque.deleteMany();
  console.log('   ✓ Movimentações de estoque deletadas');

  await p.produto.deleteMany();
  console.log('   ✓ Produtos deletados');

  await p.servico.deleteMany();
  console.log('   ✓ Serviços deletados');

  await p.veiculo.deleteMany();
  console.log('   ✓ Veículos deletados');

  await p.cliente.deleteMany();
  console.log('   ✓ Clientes deletados');

  await p.usuario.deleteMany();
  console.log('   ✓ Usuários deletados');

  await p.configuracao.deleteMany();
  console.log('   ✓ Configurações deletadas');

  await p.empresa.deleteMany();
  console.log('   ✓ Empresas deletadas');

  console.log('\n✅ Tudo deletado!\n');

  // Criar empresa e usuário novos
  console.log('🔨 Criando dados iniciais...\n');

  const empresa = await p.empresa.create({
    data: {
      nome: 'Oficina Do Massa',
      slug: 'oficina-do-massa',
      ativo: true,
    }
  });
  console.log('   ✓ Empresa criada: ' + empresa.nome);

  const senhaHash = await bcrypt.hash('123456', 12);
  const usuario = await p.usuario.create({
    data: {
      email: 'mjacomiiwtelles@gmail.com',
      senhaHash: senhaHash,
      nome: 'Matheus',
      empresaId: empresa.id,
      ativo: true,
    }
  });
  console.log('   ✓ Usuário criado: ' + usuario.email);

  // Criar configuração
  await p.configuracao.create({
    data: {
      empresaId: empresa.id,
      nomeOficina: 'Oficina Do Massa',
      chatbotEnabled: true,
      chatbotNome: 'LoopIA',
    }
  });
  console.log('   ✓ Configuração criada');

  console.log('\n🎉 PRONTO! Banco resetado.\n');
  console.log('📧 Email: mjacomiiwtelles@gmail.com');
  console.log('🔑 Senha: 123456');
}

main().finally(() => p.$disconnect());
