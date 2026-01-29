import Tesseract from 'tesseract.js';

// Regex para placa brasileira (antiga e Mercosul)
const PLATE_REGEX_OLD = /[A-Z]{3}[-\s]?\d{4}/gi;
const PLATE_REGEX_MERCOSUL = /[A-Z]{3}\d[A-Z]\d{2}/gi;

export interface OCRResult {
  text: string;
  confidence: number;
}

export interface PlateResult {
  plate: string;
  format: 'old' | 'mercosul';
  confidence: number;
}

export interface InvoiceData {
  fornecedor?: string;
  cnpj?: string;
  dataEmissao?: string;
  numeroNF?: string;
  valorTotal?: number;
  itens: Array<{
    descricao: string;
    quantidade?: number;
    valorUnitario?: number;
    valorTotal?: number;
  }>;
  rawText: string;
}

export interface DocumentData {
  tipo: 'CNH' | 'CRLV' | 'UNKNOWN';
  nome?: string;
  cpf?: string;
  rg?: string;
  dataNascimento?: string;
  placa?: string;
  renavam?: string;
  chassi?: string;
  marca?: string;
  modelo?: string;
  ano?: string;
  rawText: string;
}

// OCR básico - retorna texto extraído
export async function extractText(imageBuffer: Buffer): Promise<OCRResult> {
  const result = await Tesseract.recognize(imageBuffer, 'por', {
    logger: () => {}, // Silencia logs
  });

  return {
    text: result.data.text,
    confidence: result.data.confidence,
  };
}

// Extrai placa de veículo
export async function extractPlate(imageBuffer: Buffer): Promise<PlateResult | null> {
  const result = await Tesseract.recognize(imageBuffer, 'por', {
    logger: () => {},
  });

  const text = result.data.text.toUpperCase().replace(/\s+/g, '');

  // Tenta encontrar placa Mercosul primeiro (mais nova)
  const mercosulMatch = text.match(PLATE_REGEX_MERCOSUL);
  if (mercosulMatch) {
    return {
      plate: mercosulMatch[0],
      format: 'mercosul',
      confidence: result.data.confidence,
    };
  }

  // Tenta encontrar placa antiga
  const oldMatch = text.match(PLATE_REGEX_OLD);
  if (oldMatch) {
    const plate = oldMatch[0].replace(/[-\s]/g, '');
    return {
      plate: `${plate.slice(0, 3)}-${plate.slice(3)}`,
      format: 'old',
      confidence: result.data.confidence,
    };
  }

  return null;
}

// Extrai dados de nota fiscal
export async function extractInvoiceData(imageBuffer: Buffer): Promise<InvoiceData> {
  const result = await Tesseract.recognize(imageBuffer, 'por', {
    logger: () => {},
  });

  const text = result.data.text;
  const lines = text.split('\n').filter(l => l.trim());

  const data: InvoiceData = {
    itens: [],
    rawText: text,
  };

  // Tenta extrair CNPJ
  const cnpjMatch = text.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
  if (cnpjMatch) {
    data.cnpj = cnpjMatch[0];
  }

  // Tenta extrair número da NF
  const nfMatch = text.match(/(?:NF|NOTA FISCAL|N[°º])\s*:?\s*(\d+)/i);
  if (nfMatch) {
    data.numeroNF = nfMatch[1];
  }

  // Tenta extrair data
  const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (dateMatch) {
    data.dataEmissao = dateMatch[1];
  }

  // Tenta extrair valor total
  const totalMatch = text.match(/(?:TOTAL|VALOR TOTAL)[:\s]*R?\$?\s*([\d.,]+)/i);
  if (totalMatch) {
    data.valorTotal = parseFloat(totalMatch[1].replace(/\./g, '').replace(',', '.'));
  }

  // Extrai possíveis itens (linhas com valores monetários)
  const itemRegex = /(.+?)\s+(\d+(?:[.,]\d+)?)\s*(?:UN|PC|LT|KG|CX)?\s*R?\$?\s*([\d.,]+)/gi;
  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    data.itens.push({
      descricao: match[1].trim(),
      quantidade: parseFloat(match[2].replace(',', '.')),
      valorTotal: parseFloat(match[3].replace(/\./g, '').replace(',', '.')),
    });
  }

  return data;
}

// Extrai dados de documento (CNH ou CRLV)
export async function extractDocumentData(imageBuffer: Buffer): Promise<DocumentData> {
  const result = await Tesseract.recognize(imageBuffer, 'por', {
    logger: () => {},
  });

  const text = result.data.text;
  const upperText = text.toUpperCase();

  const data: DocumentData = {
    tipo: 'UNKNOWN',
    rawText: text,
  };

  // Detecta tipo de documento
  if (upperText.includes('HABILITAÇÃO') || upperText.includes('CNH')) {
    data.tipo = 'CNH';

    // Extrai dados da CNH
    const cpfMatch = text.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
    if (cpfMatch) data.cpf = cpfMatch[0];

    const rgMatch = text.match(/(?:RG|IDENTIDADE)[:\s]*(\d[\d.\-]+)/i);
    if (rgMatch) data.rg = rgMatch[1];

    const dateMatch = text.match(/(?:NASC|NASCIMENTO)[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
    if (dateMatch) data.dataNascimento = dateMatch[1];

  } else if (upperText.includes('CRLV') || upperText.includes('LICENCIAMENTO') || upperText.includes('RENAVAM')) {
    data.tipo = 'CRLV';

    // Extrai placa
    const plateMatch = text.match(/[A-Z]{3}[-\s]?\d[A-Z0-9]\d{2}/i);
    if (plateMatch) data.placa = plateMatch[0].toUpperCase();

    // Extrai RENAVAM
    const renavamMatch = text.match(/(?:RENAVAM)[:\s]*(\d{9,11})/i);
    if (renavamMatch) data.renavam = renavamMatch[1];

    // Extrai chassi
    const chassiMatch = text.match(/(?:CHASSI)[:\s]*([A-Z0-9]{17})/i);
    if (chassiMatch) data.chassi = chassiMatch[1].toUpperCase();

    // Extrai marca/modelo
    const marcaMatch = text.match(/(?:MARCA|MODELO)[:\s]*([A-Z][A-Z\s\/]+)/i);
    if (marcaMatch) data.marca = marcaMatch[1].trim();

    // Extrai ano
    const anoMatch = text.match(/(?:ANO|FAB)[:\s]*(\d{4})/i);
    if (anoMatch) data.ano = anoMatch[1];
  }

  // Tenta extrair nome (comum a ambos)
  const nomeMatch = text.match(/(?:NOME|PROPRIETÁRIO)[:\s]*([A-ZÀ-Ú\s]+)/i);
  if (nomeMatch) data.nome = nomeMatch[1].trim();

  return data;
}
