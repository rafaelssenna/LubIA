import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { gerarLembretesParaEmpresa } from '@/lib/lembretes';

// POST - Gerar lembretes automáticos baseado nos intervalos dos serviços
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const lembretesGerados = await gerarLembretesParaEmpresa(session.empresaId);

    console.log(`[LEMBRETES GERAR] Gerados ${lembretesGerados.length} lembretes para empresa ${session.empresaId}`);

    return NextResponse.json({
      success: true,
      total: lembretesGerados.length,
      lembretes: lembretesGerados,
    });
  } catch (error: any) {
    console.error('[LEMBRETES GERAR] Erro:', error?.message);
    return NextResponse.json({
      error: 'Erro ao gerar lembretes',
      details: error?.message,
    }, { status: 500 });
  }
}
