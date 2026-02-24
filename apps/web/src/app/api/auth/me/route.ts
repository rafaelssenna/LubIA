import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: session.userId,
        nome: session.nome,
        email: session.email,
        empresaId: session.empresaId,
        empresaNome: session.empresaNome,
        role: session.role,
        isSuperAdmin: session.isSuperAdmin,
      },
    });
  } catch (error: any) {
    console.error('[ME] Erro:', error?.message);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
