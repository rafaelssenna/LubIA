import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
}

// Extrai placa de veículo usando Gemini Vision
export async function extractPlate(imageBuffer: Buffer): Promise<PlateResult | null> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Analise esta imagem e extraia a placa do veículo brasileiro.

Responda APENAS em JSON válido, sem markdown, no formato:
{
  "encontrou": true/false,
  "placa": "ABC1D23" ou "ABC-1234",
  "formato": "mercosul" ou "antiga",
  "confianca": "alta", "media" ou "baixa"
}

Se não encontrar placa, retorne: {"encontrou": false}

Regras:
- Placa Mercosul: 3 letras + 1 número + 1 letra + 2 números (ex: ABC1D23)
- Placa Antiga: 3 letras + 4 números com hífen (ex: ABC-1234)
- Retorne a placa SEM espaços extras
- Se a imagem estiver borrada ou ilegível, confiança = "baixa"`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBuffer.toString('base64'),
        },
      },
    ]);

    const text = result.response.text().trim();
    // Remove possíveis marcadores de código markdown
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const data = JSON.parse(jsonText);

    if (!data.encontrou) {
      return null;
    }

    return {
      plate: data.placa,
      format: data.formato,
      confidence: data.confianca,
    };
  } catch (error) {
    console.error('Erro ao extrair placa:', error);
    return null;
  }
}

// Extrai dados de nota fiscal usando Gemini Vision
export async function extractInvoiceData(imageBuffer: Buffer): Promise<InvoiceData> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Analise esta imagem de nota fiscal/cupom fiscal brasileiro e extraia os dados.

Responda APENAS em JSON válido, sem markdown, no formato:
{
  "fornecedor": "Nome da empresa",
  "cnpj": "00.000.000/0000-00",
  "dataEmissao": "DD/MM/AAAA",
  "numeroNF": "123456",
  "valorTotal": 150.00,
  "itens": [
    {
      "descricao": "Nome do produto",
      "codigo": "código se houver",
      "quantidade": 1,
      "unidade": "UN/LT/KG/PC",
      "valorUnitario": 50.00,
      "valorTotal": 50.00
    }
  ]
}

Regras:
- Extraia TODOS os itens/produtos listados
- Valores numéricos sem "R$" (apenas números)
- Se não conseguir ler algum campo, omita-o
- Para óleos lubrificantes, tente identificar a viscosidade (5W30, 10W40, etc)
- CNPJ deve estar no formato com pontuação`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBuffer.toString('base64'),
        },
      },
    ]);

    const text = result.response.text().trim();
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const data = JSON.parse(jsonText);

    return {
      fornecedor: data.fornecedor,
      cnpj: data.cnpj,
      dataEmissao: data.dataEmissao,
      numeroNF: data.numeroNF,
      valorTotal: data.valorTotal,
      itens: data.itens || [],
    };
  } catch (error) {
    console.error('Erro ao extrair nota fiscal:', error);
    return { itens: [] };
  }
}

// Extrai dados de documento (CNH ou CRLV) usando Gemini Vision
export async function extractDocumentData(imageBuffer: Buffer): Promise<DocumentData> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Analise esta imagem de documento brasileiro (CNH ou CRLV) e extraia os dados.

Responda APENAS em JSON válido, sem markdown, no formato:

Para CNH:
{
  "tipo": "CNH",
  "nome": "Nome completo",
  "cpf": "000.000.000-00",
  "rg": "00.000.000-0",
  "dataNascimento": "DD/MM/AAAA",
  "cnh": "00000000000",
  "categoria": "AB",
  "validade": "DD/MM/AAAA"
}

Para CRLV:
{
  "tipo": "CRLV",
  "nome": "Nome do proprietário",
  "cpf": "000.000.000-00",
  "placa": "ABC1D23",
  "renavam": "00000000000",
  "chassi": "XXXXXXXXXXXXXXXXX",
  "marca": "MARCA",
  "modelo": "MODELO",
  "anoFabricacao": "2020",
  "anoModelo": "2021",
  "cor": "PRATA"
}

Se não conseguir identificar o tipo de documento:
{
  "tipo": "DESCONHECIDO"
}

Regras:
- CPF com pontuação
- Placa no formato correto (Mercosul ou antiga)
- Se não conseguir ler algum campo, omita-o`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBuffer.toString('base64'),
        },
      },
    ]);

    const text = result.response.text().trim();
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const data = JSON.parse(jsonText);

    return data;
  } catch (error) {
    console.error('Erro ao extrair documento:', error);
    return { tipo: 'DESCONHECIDO' };
  }
}
