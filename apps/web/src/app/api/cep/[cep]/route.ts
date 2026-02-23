import { NextResponse } from 'next/server';

// Buscar via ViaCEP
async function buscarViaCep(cep: string) {
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(5000), // 5 segundos timeout
  });

  if (!response.ok) return null;

  const data = await response.json();
  if (data.erro) return null;

  return {
    logradouro: data.logradouro || '',
    bairro: data.bairro || '',
    localidade: data.localidade || '',
    uf: data.uf || '',
  };
}

// Buscar via BrasilAPI (fallback)
async function buscarBrasilApi(cep: string) {
  const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) return null;

  const data = await response.json();

  return {
    logradouro: data.street || '',
    bairro: data.neighborhood || '',
    localidade: data.city || '',
    uf: data.state || '',
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cep: string }> }
) {
  const { cep } = await params;
  const cepLimpo = cep.replace(/\D/g, '');

  if (cepLimpo.length !== 8) {
    return NextResponse.json(
      { error: 'CEP inválido' },
      { status: 400 }
    );
  }

  try {
    // Tentar ViaCEP primeiro
    let resultado = await buscarViaCep(cepLimpo);

    // Se falhar, tentar BrasilAPI
    if (!resultado) {
      console.log('[CEP] ViaCEP falhou, tentando BrasilAPI...');
      resultado = await buscarBrasilApi(cepLimpo);
    }

    if (!resultado) {
      return NextResponse.json(
        { error: 'CEP não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('[CEP] Erro ao buscar CEP:', error);
    return NextResponse.json(
      { error: 'Erro ao conectar com o serviço de CEP' },
      { status: 500 }
    );
  }
}
