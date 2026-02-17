const { chromium } = require('playwright');

async function runTests() {
  console.log('🚀 Iniciando testes E2E do Frontend...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const results = [];
  const BASE_URL = 'http://localhost:3001';

  // Criar pasta de screenshots
  const fs = require('fs');
  if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots');
  }

  // Helper para testar página
  async function testPage(name, url, checks) {
    try {
      console.log(`📄 Testando: ${name}`);
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      const result = {
        page: name,
        url: url,
        status: response.status(),
        checks: []
      };

      // Verificar status
      if (response.status() === 200 || response.status() === 307) {
        result.checks.push({ name: 'HTTP Status', passed: true, value: response.status() });
      } else {
        result.checks.push({ name: 'HTTP Status', passed: false, value: response.status() });
      }

      // Verificar título
      const title = await page.title();
      result.checks.push({ name: 'Tem título', passed: title.length > 0, value: title });

      // Executar checks customizados
      if (checks) {
        for (const check of checks) {
          try {
            const passed = await check.fn(page);
            result.checks.push({ name: check.name, passed, value: passed ? 'OK' : 'Falhou' });
          } catch (e) {
            result.checks.push({ name: check.name, passed: false, value: e.message.substring(0, 50) });
          }
        }
      }

      // Tirar screenshot
      const screenshotName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      await page.screenshot({ path: `screenshots/${screenshotName}.png`, fullPage: true });
      result.screenshot = `screenshots/${screenshotName}.png`;

      results.push(result);
      console.log(`   ✅ ${name} - OK\n`);
      return true;
    } catch (e) {
      results.push({ page: name, url: url, error: e.message.substring(0, 100) });
      console.log(`   ❌ ${name} - Erro: ${e.message.substring(0, 50)}\n`);
      return false;
    }
  }

  // ========== TESTES ==========

  // 1. Página de Login
  await testPage('Login', `${BASE_URL}/login`, [
    { name: 'Campo email existe', fn: async (p) => await p.locator('input[type="email"], input[name="email"]').count() > 0 },
    { name: 'Campo senha existe', fn: async (p) => await p.locator('input[type="password"]').count() > 0 },
    { name: 'Botão entrar existe', fn: async (p) => await p.locator('button[type="submit"]').count() > 0 }
  ]);

  // 2. Fazer login
  console.log('🔐 Fazendo login...');
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.locator('input[type="email"], input[name="email"]').first().fill('mjacomiiwtelles@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3000);
    console.log('   ✅ Login realizado\n');
  } catch (e) {
    console.log(`   ⚠️ Login: ${e.message.substring(0, 50)}\n`);
  }

  // 3. Dashboard
  await testPage('Dashboard', `${BASE_URL}`, [
    { name: 'Conteúdo carregado', fn: async (p) => (await p.content()).length > 1000 },
    { name: 'Sem erro visível', fn: async (p) => !(await p.content()).includes('Error') }
  ]);

  // 4. Clientes
  await testPage('Clientes', `${BASE_URL}/clientes`, [
    { name: 'Conteúdo carregado', fn: async (p) => (await p.content()).length > 1000 }
  ]);

  // 5. Veículos
  await testPage('Veículos', `${BASE_URL}/veiculos`, [
    { name: 'Conteúdo carregado', fn: async (p) => (await p.content()).length > 1000 }
  ]);

  // 6. Ordens de Serviço
  await testPage('Ordens de Serviço', `${BASE_URL}/ordens`, [
    { name: 'Conteúdo carregado', fn: async (p) => (await p.content()).length > 1000 }
  ]);

  // 7. Orçamentos
  await testPage('Orçamentos', `${BASE_URL}/orcamentos`, [
    { name: 'Conteúdo carregado', fn: async (p) => (await p.content()).length > 1000 }
  ]);

  // 8. Estoque
  await testPage('Estoque', `${BASE_URL}/estoque`, [
    { name: 'Conteúdo carregado', fn: async (p) => (await p.content()).length > 1000 }
  ]);

  // 9. Serviços
  await testPage('Serviços', `${BASE_URL}/servicos`, [
    { name: 'Conteúdo carregado', fn: async (p) => (await p.content()).length > 1000 }
  ]);

  // 10. Lembretes
  await testPage('Lembretes', `${BASE_URL}/lembretes`, [
    { name: 'Conteúdo carregado', fn: async (p) => (await p.content()).length > 1000 }
  ]);

  // 11. WhatsApp
  await testPage('WhatsApp', `${BASE_URL}/whatsapp`, [
    { name: 'Conteúdo carregado', fn: async (p) => (await p.content()).length > 1000 }
  ]);

  // 12. Usuários
  await testPage('Usuários', `${BASE_URL}/usuarios`, [
    { name: 'Conteúdo carregado', fn: async (p) => (await p.content()).length > 1000 }
  ]);

  // 13. Configurações
  await testPage('Configurações', `${BASE_URL}/configuracoes`, [
    { name: 'Conteúdo carregado', fn: async (p) => (await p.content()).length > 1000 }
  ]);

  // Testar responsividade (mobile)
  console.log('📱 Testando responsividade (mobile)...');
  try {
    await context.close();
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      isMobile: true
    });
    const mobilePage = await mobileContext.newPage();

    await mobilePage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await mobilePage.screenshot({ path: 'screenshots/mobile-login.png', fullPage: true });

    await mobilePage.locator('input[type="email"], input[name="email"]').first().fill('mjacomiiwtelles@gmail.com');
    await mobilePage.locator('input[type="password"]').first().fill('123456');
    await mobilePage.locator('button[type="submit"]').first().click();
    await mobilePage.waitForTimeout(3000);

    await mobilePage.goto(`${BASE_URL}`, { waitUntil: 'networkidle' });
    await mobilePage.screenshot({ path: 'screenshots/mobile-dashboard.png', fullPage: true });

    await mobilePage.goto(`${BASE_URL}/clientes`, { waitUntil: 'networkidle' });
    await mobilePage.screenshot({ path: 'screenshots/mobile-clientes.png', fullPage: true });

    await mobilePage.goto(`${BASE_URL}/ordens`, { waitUntil: 'networkidle' });
    await mobilePage.screenshot({ path: 'screenshots/mobile-ordens.png', fullPage: true });

    console.log('   ✅ Screenshots mobile salvos\n');
    results.push({ page: 'Mobile', status: 200, checks: [{ name: 'Screenshots mobile', passed: true }] });
  } catch (e) {
    console.log(`   ⚠️ Mobile: ${e.message.substring(0, 50)}\n`);
  }

  await browser.close();

  // ========== RELATÓRIO ==========
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO DE TESTES E2E DO FRONTEND');
  console.log('='.repeat(60) + '\n');

  let totalChecks = 0;
  let passedChecks = 0;

  for (const result of results) {
    if (result.error) {
      console.log(`❌ ${result.page}: ERRO - ${result.error}`);
    } else {
      console.log(`✅ ${result.page} (${result.status})`);
      if (result.checks) {
        for (const check of result.checks) {
          totalChecks++;
          if (check.passed) {
            passedChecks++;
            console.log(`   ✓ ${check.name}`);
          } else {
            console.log(`   ✗ ${check.name}: ${check.value}`);
          }
        }
      }
    }
    console.log('');
  }

  console.log('='.repeat(60));
  console.log(`TOTAL: ${passedChecks}/${totalChecks} verificações passaram`);
  console.log(`Taxa de sucesso: ${((passedChecks/totalChecks)*100).toFixed(1)}%`);
  console.log('='.repeat(60));
  console.log('\n📸 Screenshots salvos na pasta ./screenshots/');
}

runTests().catch(console.error);
