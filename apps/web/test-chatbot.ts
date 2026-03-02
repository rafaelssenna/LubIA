import { generateChatResponse } from './src/lib/chatbot';

const PHONE = '5531999999999'; // número fictício para teste
const EMPRESA_ID = 4; // Oficina Do Massa (mjacomiiwtelles@gmail.com)

async function simulateConversation() {
  const messages = [
    'Oi, boa tarde!',
    'Quero agendar uma troca de óleo',
    'João Silva',
    'Gol 2020',
  ];

  console.log('========================================');
  console.log('  SIMULAÇÃO DE CONVERSA - CHATBOT IA');
  console.log('========================================\n');

  for (const msg of messages) {
    console.log(`👤 CLIENTE: ${msg}`);
    console.log('---');

    try {
      const response = await generateChatResponse(msg, PHONE, EMPRESA_ID, 'Cliente Teste');

      if (response.type === 'text') {
        console.log(`🤖 BOT: ${response.message}`);
      } else if (response.type === 'list') {
        console.log(`🤖 BOT: ${response.text}`);
        console.log(`   [LISTA: ${response.listButton}]`);
        console.log(`   Opções: ${response.choices.join(', ')}`);
      } else if (response.type === 'button') {
        console.log(`🤖 BOT: ${response.text}`);
        console.log(`   [BOTÕES: ${response.choices.join(', ')}]`);
      }
    } catch (error: any) {
      console.log(`❌ ERRO: ${error.message}`);
    }

    console.log('\n========================================\n');
  }

  process.exit(0);
}

simulateConversation();
