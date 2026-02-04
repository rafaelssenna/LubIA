import { NextResponse } from 'next/server';

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
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Erro ao buscar CEP' },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.erro) {
      return NextResponse.json(
        { error: 'CEP não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      localidade: data.localidade || '',
      uf: data.uf || '',
    });
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return NextResponse.json(
      { error: 'Erro ao conectar com o serviço de CEP' },
      { status: 500 }
    );
  }
}
