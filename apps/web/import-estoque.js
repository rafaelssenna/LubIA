const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

// Categorias do sistema
const categorias = {
  'OLEO_LUBRIFICANTE': ['5w', '10w', '15w', '20w', '25w', '0w', '4t', 'turbo', 'diesel'],
  'ADITIVO': ['aditivo', 'condicionador', 'flush', 'militec', 'descarbonizante', 'b12', 'prolonga', 'flex', 'gasolina', 'max s10', 'max diesel', 'potency', 'injector', 'selante', 'treatment', 'no smoke'],
  'GRAXA': ['graxa', 'grease'],
  'FILTRO_OLEO': ['filtro oleo', 'saca filtro'],
  'FILTRO_AR': ['filtro ar'],
  'FILTRO_AR_CONDICIONADO': ['higienizador', 'aromatizante'],
  'FILTRO_COMBUSTIVEL': ['filtro combustivel'],
  'OUTRO': []
};

function detectCategoria(nome, marca) {
  const texto = `${marca} ${nome}`.toLowerCase();

  // ATF e transmissão
  if (texto.includes('atf') || texto.includes('dexron') || texto.includes('cvt') || texto.includes('gl-') || texto.includes('gl4') || texto.includes('gl5') || texto.includes('80w') || texto.includes('90w') || texto.includes('85w') || texto.includes('75w')) {
    return 'OLEO_LUBRIFICANTE';
  }

  // Fluido de freio
  if (texto.includes('dot 3') || texto.includes('dot 4') || texto.includes('dot3') || texto.includes('dot4')) {
    return 'ADITIVO';
  }

  // Coolant/Radiador
  if (texto.includes('coolant') || texto.includes('radiador') || texto.includes('paraflu') || texto.includes('radiex') || texto.includes('pronto uso') || texto.includes('concentrado')) {
    return 'ADITIVO';
  }

  // Graxa
  if (texto.includes('graxa') || texto.includes('grease') || texto.includes('grax')) {
    return 'GRAXA';
  }

  // Aditivos
  for (const termo of categorias.ADITIVO) {
    if (texto.includes(termo)) return 'ADITIVO';
  }

  // Óleos lubrificantes (motor)
  for (const termo of categorias.OLEO_LUBRIFICANTE) {
    if (texto.includes(termo)) return 'OLEO_LUBRIFICANTE';
  }

  // Higienizador/Aromatizante
  if (texto.includes('higienizador') || texto.includes('aromatizante')) {
    return 'ACESSORIO';
  }

  // Silicone, desengripante, etc
  if (texto.includes('silicone') || texto.includes('desengripante') || texto.includes('limpa') || texto.includes('spray')) {
    return 'ACESSORIO';
  }

  // Água desmineralizada
  if (texto.includes('agua') || texto.includes('desmineralizada')) {
    return 'OUTRO';
  }

  // 2T (dois tempos)
  if (texto.includes('2t')) {
    return 'OLEO_LUBRIFICANTE';
  }

  // Hidráulico
  if (texto.includes('hidraulico') || texto.includes('isafluido')) {
    return 'OLEO_LUBRIFICANTE';
  }

  return 'OUTRO';
}

function detectUnidade(nome, quantidade) {
  const texto = nome.toLowerCase();

  // Granel (LT = Litros a granel)
  if (texto.includes('granel') || texto.includes('60lt') || texto.includes('200lt') || texto.includes('bd')) {
    return 'LITRO';
  }

  // Quilos
  if (texto.includes('kg') || texto.includes('10kg') || texto.includes('20kg')) {
    return 'KG';
  }

  // Gramas (graxa em gramas)
  if (texto.includes('grs') || texto.includes('500g') || texto.includes('g ')) {
    return 'UNIDADE';
  }

  // Mililitros são vendidos como unidade
  if (texto.includes('ml') || texto.includes('500ml') || texto.includes('200ml') || texto.includes('300ml')) {
    return 'UNIDADE';
  }

  return 'LITRO'; // Default para óleos
}

async function importProducts() {
  try {
    // Buscar empresa pelo email do usuário
    const usuario = await prisma.usuario.findUnique({
      where: { email: 'mjacomiiwtelles@gmail.com' },
      include: { empresa: true }
    });

    if (!usuario || !usuario.empresa) {
      console.log('Usuário ou empresa não encontrada para email: mjacomiiwtelles@gmail.com');
      return;
    }

    const empresa = usuario.empresa;

    console.log(`\nImportando para: ${empresa.nome} (ID: ${empresa.id})\n`);

    // Ler arquivo Excel
    const filePath = path.join(__dirname, '..', '..', 'Controle de Estoque 1.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    let produtosImportados = 0;
    let produtosIgnorados = 0;
    let currentSection = '';

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const marca = String(row[0] || '').trim();
      const codigo = String(row[1] || '').trim();
      const quantidade = parseFloat(row[2]) || 0;
      const precoCompra = parseFloat(row[3]) || 0;
      const precoCompraAtual = parseFloat(row[4]) || precoCompra;
      const precoVenda = parseFloat(row[5]) || 0;
      const precoGranel = parseFloat(row[6]) || null;

      // Detectar seções
      if (marca.includes('ÓLEOS') || marca.includes('OLEOS') || marca.includes('LUBRIFICANTES')) {
        currentSection = 'OLEOS';
        continue;
      }
      if (marca.includes('ADITIVOS') || marca.includes('GRAXAS') || marca.includes('ACESSÓRIOS')) {
        currentSection = 'ADITIVOS';
        continue;
      }

      // Ignorar cabeçalhos e linhas vazias
      if (marca === 'MARCA' || marca === '' || codigo === '' || codigo === 'CÓD DO PRODUTO') {
        continue;
      }

      // Ignorar linhas sem dados válidos
      if (!marca || !codigo || (precoVenda === 0 && precoCompra === 0)) {
        continue;
      }

      // Criar nome do produto
      const nome = `${marca} ${codigo}`.trim();

      // Detectar categoria
      const categoria = detectCategoria(codigo, marca);

      // Detectar unidade
      const unidade = detectUnidade(codigo, quantidade);

      // Criar código único
      const codigoProduto = `${marca.substring(0, 3).toUpperCase()}-${codigo.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase()}`;

      // Verificar se já existe
      const existe = await prisma.produto.findFirst({
        where: {
          empresaId: empresa.id,
          OR: [
            { codigo: codigoProduto },
            { nome: nome }
          ]
        }
      });

      if (existe) {
        produtosIgnorados++;
        continue;
      }

      // Criar produto
      try {
        await prisma.produto.create({
          data: {
            empresaId: empresa.id,
            codigo: codigoProduto,
            nome: nome,
            marca: marca,
            categoria: categoria,
            unidade: unidade,
            quantidade: quantidade,
            estoqueMinimo: Math.max(2, Math.floor(quantidade * 0.1)),
            precoCompra: precoCompra,
            precoCompraAtual: precoCompraAtual || precoCompra,
            precoVenda: precoVenda,
            precoGranel: precoGranel > 0 ? precoGranel : null,
          }
        });

        produtosImportados++;
        console.log(`  + ${nome} (${categoria}) - Qtd: ${quantidade} - R$ ${precoVenda}`);
      } catch (err) {
        console.log(`  ! Erro ao importar ${nome}: ${err.message}`);
        produtosIgnorados++;
      }
    }

    console.log(`\n========================================`);
    console.log(`Importados: ${produtosImportados} produtos`);
    console.log(`Ignorados: ${produtosIgnorados} (duplicados ou inválidos)`);
    console.log(`========================================\n`);

  } catch (error) {
    console.error('Erro na importação:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importProducts();
