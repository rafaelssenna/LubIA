import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { produtoNF, produtoEstoque } = await request.json();

    if (!produtoNF || !produtoEstoque) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Você é um especialista em peças automotivas e lubrificantes. Analise se esses dois itens são o MESMO produto ou produtos DIFERENTES.

PRODUTO DA NOTA FISCAL:
- Nome: "${produtoNF.nome}"
- Código: "${produtoNF.codigo || 'N/A'}"
- Marca/Fornecedor: "${produtoNF.marca || 'N/A'}"

PRODUTO JÁ NO ESTOQUE:
- Nome: "${produtoEstoque.nome}"
- Código: "${produtoEstoque.codigo || 'N/A'}"
- Marca: "${produtoEstoque.marca || 'N/A'}"

REGRAS IMPORTANTES:
- Códigos de produto diferentes (ex: FCD2066 vs FCD2093, WO920 vs WO180) = PRODUTOS DIFERENTES
- Viscosidades diferentes (ex: 5W30 vs 15W40, 0W20 vs 5W40) = PRODUTOS DIFERENTES
- Especificações diferentes (ex: DOT3 vs DOT4, DEXRON III vs DEXRON VI) = PRODUTOS DIFERENTES
- Cores diferentes (ex: verde vs rosa) = PRODUTOS DIFERENTES
- Volumes/embalagens diferentes (ex: 1L vs 5L, 24X1 vs 12X1) = PRODUTOS DIFERENTES
- Variações de escrita/acentos/abreviações do MESMO produto = MESMO PRODUTO
- Marca com variação corporativa (LTDA vs LT, EIRELI vs ME) mas mesmo nome = MESMO PRODUTO

Responda APENAS com um JSON no formato:
{"mesmo": true/false, "motivo": "explicação curta"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Parse JSON da resposta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[VERIFICAR DUPLICADO] Resposta inválida da IA:', text);
      return NextResponse.json({ mesmo: false, motivo: 'Não foi possível verificar', confianca: 'baixa' });
    }

    const resposta = JSON.parse(jsonMatch[0]);

    console.log(`[VERIFICAR DUPLICADO] "${produtoNF.nome}" vs "${produtoEstoque.nome}" → ${resposta.mesmo ? 'MESMO' : 'DIFERENTE'}: ${resposta.motivo}`);

    return NextResponse.json({
      mesmo: resposta.mesmo,
      motivo: resposta.motivo,
      confianca: 'ia',
    });
  } catch (error: any) {
    console.error('[VERIFICAR DUPLICADO] Erro:', error?.message);
    // Em caso de erro da IA, retorna inconclusivo (não bloqueia o fluxo)
    return NextResponse.json({ mesmo: false, motivo: 'Erro na verificação', confianca: 'erro' });
  }
}
