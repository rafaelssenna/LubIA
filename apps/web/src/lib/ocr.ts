import { GoogleGenerativeAI } from '@google/generative-ai';

console.log('========================================');
console.log('[OCR LIB] Iniciando módulo ocr.ts');
console.log('[OCR LIB] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('[OCR LIB] GEMINI_API_KEY length:', process.env.GEMINI_API_KEY?.length || 0);
if (process.env.GEMINI_API_KEY) {
  console.log('[OCR LIB] GEMINI_API_KEY preview:', process.env.GEMINI_API_KEY.substring(0, 10) + '...');
} else {
  console.error('[OCR LIB] ERRO: GEMINI_API_KEY não está definida!');
}
console.log('========================================');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Helper function to safely parse JSON
function tryParseJSON(text: string): any | null {
  try {
    // Remove markdown code blocks if present
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanText);
  } catch {
    return null;
  }
}

export interface PlateResult {
  plate: string;
  format: 'antiga' | 'mercosul';
  confidence: 'alta' | 'media' | 'baixa';
}

export interface InvoiceData {
  fornecedor?: string;
  cnpj?: string;
  dataEmissao?: string;
  numeroNF?: string;
  valorTotal?: number;
  itens: Array<{
    descricao: string;
    codigo?: string;
    quantidade?: number;
    unidade?: string;
    valorUnitario?: number;
    valorTotal?: number;
  }>;
  erro?: string;
}

export interface DocumentData {
  tipo: 'CNH' | 'CRLV' | 'DESCONHECIDO';
  nome?: string;
  cpf?: string;
  rg?: string;
  dataNascimento?: string;
  cnh?: string;
  categoria?: string;
  validade?: string;
  placa?: string;
  renavam?: string;
  chassi?: string;
  marca?: string;
  modelo?: string;
  anoFabricacao?: string;
  anoModelo?: string;
  cor?: string;
  erro?: string;
}

export async function extractPlate(imageBuffer: Buffer): Promise<PlateResult | null> {
  console.log('========================================');
  console.log('[OCR extractPlate] Função iniciada');
  console.log('[OCR extractPlate] Buffer size:', imageBuffer.length, 'bytes');
  console.log('[OCR extractPlate] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

  try {
    console.log('[OCR extractPlate] Obtendo modelo gemini-2.0-flash...');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    console.log('[OCR extractPlate] Modelo obtido com sucesso');

    const prompt = `Analise esta imagem e extraia a placa do veículo brasileiro.

IMPORTANTE: Responda APENAS com JSON válido, sem nenhum texto adicional.

Se encontrar uma placa, responda:
{"encontrou": true, "placa": "ABC1D23", "formato": "mercosul", "confianca": "alta"}

Se NÃO encontrar uma placa (imagem não contém veículo/placa), responda:
{"encontrou": false}

Regras:
- Placa Mercosul: 3 letras + 1 número + 1 letra + 2 números (ex: ABC1D23)
- Placa Antiga: 3 letras + 4 números com hífen (ex: ABC-1234)
- formato: "mercosul" ou "antiga"
- confianca: "alta", "media" ou "baixa"`;

    console.log('[OCR extractPlate] Enviando requisição para Gemini...');
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBuffer.toString('base64'),
        },
      },
    ]);

    console.log('[OCR extractPlate] Resposta recebida do Gemini');
    const text = result.response.text().trim();
    console.log('[OCR extractPlate] Texto da resposta:', text);

    const data = tryParseJSON(text);

    if (!data) {
      console.log('[OCR extractPlate] Resposta não é JSON válido, retornando null');
      console.log('========================================');
      return null;
    }

    console.log('[OCR extractPlate] JSON parseado:', JSON.stringify(data, null, 2));

    if (!data.encontrou) {
      console.log('[OCR extractPlate] Placa não encontrada na imagem');
      console.log('========================================');
      return null;
    }

    const resultado = {
      plate: data.placa,
      format: data.formato,
      confidence: data.confianca,
    };
    console.log('[OCR extractPlate] Resultado final:', JSON.stringify(resultado, null, 2));
    console.log('========================================');

    return resultado;
  } catch (error: any) {
    console.error('========================================');
    console.error('[OCR extractPlate] ERRO CAPTURADO!');
    console.error('[OCR extractPlate] Tipo do erro:', error?.constructor?.name);
    console.error('[OCR extractPlate] Mensagem:', error?.message);
    console.error('========================================');
    return null;
  }
}

export async function extractInvoiceData(imageBuffer: Buffer): Promise<InvoiceData> {
  console.log('========================================');
  console.log('[OCR extractInvoiceData] Função iniciada');
  console.log('[OCR extractInvoiceData] Buffer size:', imageBuffer.length, 'bytes');
  console.log('[OCR extractInvoiceData] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

  try {
    console.log('[OCR extractInvoiceData] Obtendo modelo gemini-2.0-flash...');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    console.log('[OCR extractInvoiceData] Modelo obtido com sucesso');

    const prompt = `Analise esta imagem e extraia dados de nota fiscal/cupom fiscal brasileiro.

IMPORTANTE: Responda APENAS com JSON válido, sem nenhum texto adicional.

Se for uma nota fiscal válida, responda no formato:
{
  "valido": true,
  "fornecedor": "Nome da empresa",
  "cnpj": "00.000.000/0000-00",
  "dataEmissao": "DD/MM/AAAA",
  "numeroNF": "123456",
  "valorTotal": 150.00,
  "itens": [
    {
      "descricao": "Nome do produto",
      "codigo": "código",
      "quantidade": 1,
      "unidade": "UN",
      "valorUnitario": 50.00,
      "valorTotal": 50.00
    }
  ]
}

Se a imagem NÃO for uma nota fiscal (é outra coisa), responda:
{"valido": false, "motivo": "descrição breve do que é a imagem"}

Regras:
- Extraia TODOS os itens/produtos listados
- Valores numéricos sem "R$"
- Se não conseguir ler algum campo, omita-o
- Para óleos, identifique a viscosidade (5W30, 10W40, etc)`;

    console.log('[OCR extractInvoiceData] Enviando requisição para Gemini...');
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBuffer.toString('base64'),
        },
      },
    ]);

    console.log('[OCR extractInvoiceData] Resposta recebida do Gemini');
    const text = result.response.text().trim();
    console.log('[OCR extractInvoiceData] Texto da resposta:', text.substring(0, 500));

    const data = tryParseJSON(text);

    if (!data) {
      console.log('[OCR extractInvoiceData] Resposta não é JSON válido');
      console.log('[OCR extractInvoiceData] Texto recebido:', text.substring(0, 200));
      console.log('========================================');
      return {
        itens: [],
        erro: 'Não foi possível processar a imagem. Certifique-se de enviar uma foto de nota fiscal.'
      };
    }

    // Check if the image is not a valid invoice
    if (data.valido === false) {
      console.log('[OCR extractInvoiceData] Imagem não é nota fiscal:', data.motivo);
      console.log('========================================');
      return {
        itens: [],
        erro: `Esta imagem não parece ser uma nota fiscal. ${data.motivo || ''}`
      };
    }

    console.log('[OCR extractInvoiceData] JSON parseado - fornecedor:', data.fornecedor);
    console.log('[OCR extractInvoiceData] JSON parseado - itens count:', data.itens?.length || 0);

    const resultado = {
      fornecedor: data.fornecedor,
      cnpj: data.cnpj,
      dataEmissao: data.dataEmissao,
      numeroNF: data.numeroNF,
      valorTotal: data.valorTotal,
      itens: data.itens || [],
    };
    console.log('[OCR extractInvoiceData] Resultado final preparado');
    console.log('========================================');

    return resultado;
  } catch (error: any) {
    console.error('========================================');
    console.error('[OCR extractInvoiceData] ERRO CAPTURADO!');
    console.error('[OCR extractInvoiceData] Tipo do erro:', error?.constructor?.name);
    console.error('[OCR extractInvoiceData] Mensagem:', error?.message);
    console.error('========================================');
    return { itens: [], erro: 'Erro ao processar a imagem. Tente novamente.' };
  }
}

export async function extractDocumentData(imageBuffer: Buffer): Promise<DocumentData> {
  console.log('========================================');
  console.log('[OCR extractDocumentData] Função iniciada');
  console.log('[OCR extractDocumentData] Buffer size:', imageBuffer.length, 'bytes');
  console.log('[OCR extractDocumentData] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

  try {
    console.log('[OCR extractDocumentData] Obtendo modelo gemini-2.0-flash...');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    console.log('[OCR extractDocumentData] Modelo obtido com sucesso');

    const prompt = `Analise esta imagem e extraia dados de documento brasileiro (CNH ou CRLV).

IMPORTANTE: Responda APENAS com JSON válido, sem nenhum texto adicional.

Para CNH, responda:
{"tipo": "CNH", "nome": "Nome", "cpf": "000.000.000-00", "rg": "00.000.000-0", "dataNascimento": "DD/MM/AAAA", "cnh": "00000000000", "categoria": "AB", "validade": "DD/MM/AAAA"}

Para CRLV, responda:
{"tipo": "CRLV", "nome": "Nome", "cpf": "000.000.000-00", "placa": "ABC1D23", "renavam": "00000000000", "chassi": "XXX", "marca": "MARCA", "modelo": "MODELO", "anoFabricacao": "2020", "anoModelo": "2021", "cor": "PRATA"}

Se NÃO conseguir identificar como CNH ou CRLV, responda:
{"tipo": "DESCONHECIDO", "motivo": "descrição do que é a imagem"}

Regras:
- CPF com pontuação
- Placa no formato correto
- Omita campos que não conseguir ler`;

    console.log('[OCR extractDocumentData] Enviando requisição para Gemini...');
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBuffer.toString('base64'),
        },
      },
    ]);

    console.log('[OCR extractDocumentData] Resposta recebida do Gemini');
    const text = result.response.text().trim();
    console.log('[OCR extractDocumentData] Texto da resposta:', text);

    const data = tryParseJSON(text);

    if (!data) {
      console.log('[OCR extractDocumentData] Resposta não é JSON válido');
      console.log('========================================');
      return {
        tipo: 'DESCONHECIDO',
        erro: 'Não foi possível processar a imagem. Certifique-se de enviar uma foto de CNH ou CRLV.'
      };
    }

    console.log('[OCR extractDocumentData] JSON parseado - tipo:', data.tipo);
    console.log('[OCR extractDocumentData] JSON parseado:', JSON.stringify(data, null, 2));
    console.log('========================================');

    if (data.tipo === 'DESCONHECIDO' && data.motivo) {
      return {
        ...data,
        erro: `Esta imagem não parece ser CNH ou CRLV. ${data.motivo}`
      };
    }

    return data;
  } catch (error: any) {
    console.error('========================================');
    console.error('[OCR extractDocumentData] ERRO CAPTURADO!');
    console.error('[OCR extractDocumentData] Tipo do erro:', error?.constructor?.name);
    console.error('[OCR extractDocumentData] Mensagem:', error?.message);
    console.error('========================================');
    return { tipo: 'DESCONHECIDO', erro: 'Erro ao processar a imagem. Tente novamente.' };
  }
}
