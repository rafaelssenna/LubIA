import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

export async function POST() {
  try {
    await clearSession();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[LOGOUT] Erro:', error?.message);
    return NextResponse.json(
      { error: 'Erro ao fazer logout' },
      { status: 500 }
    );
  }
}
