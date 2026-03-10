import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: 'Email, código e nova senha são obrigatórios' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }

    // Buscar usuário
    const usuario = await prisma.usuario.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
      select: { id: true, nome: true, ativo: true }
    });

    if (!usuario || !usuario.ativo) {
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

    // Hash da nova senha
    const senhaHash = await bcrypt.hash(newPassword, 10);

    // Atualizar senha e marcar token como usado
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: usuario.id },
        data: { senhaHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() }
      })
    ]);

    console.log('[RESET-PASSWORD] Senha alterada para usuário:', usuario.nome);

    return NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso!'
    });
  } catch (error: any) {
    console.error('[RESET-PASSWORD] Erro:', error?.message);
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}
