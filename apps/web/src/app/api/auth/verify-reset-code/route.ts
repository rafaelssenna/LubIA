import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email e código são obrigatórios' }, { status: 400 });
    }

    // Buscar usuário
    const usuario = await prisma.usuario.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
      select: { id: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 400 });
    }

    // Buscar token válido
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        usuarioId: usuario.id,
        token: code,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetToken) {
      return NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Código válido' });
  } catch (error: any) {
    console.error('[VERIFY-RESET-CODE] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
