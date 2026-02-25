import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json({ error: 'Token e senha são obrigatórios' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }

    // Buscar token válido
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { usuario: { select: { id: true, nome: true, ativo: true } } }
    });

    if (!resetToken) {
      return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 400 });
    }

    if (resetToken.usedAt) {
      return NextResponse.json({ error: 'Este link já foi utilizado' }, { status: 400 });
    }

    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Este link expirou' }, { status: 400 });
    }

    if (!resetToken.usuario.ativo) {
      return NextResponse.json({ error: 'Conta desativada' }, { status: 400 });
    }

    // Hash da nova senha
    const senhaHash = await bcrypt.hash(password, 10);

    // Atualizar senha e marcar token como usado
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: resetToken.usuarioId },
        data: { senhaHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() }
      })
    ]);

    console.log('[RESET-PASSWORD] Senha alterada para usuário:', resetToken.usuario.nome);

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

// GET para validar token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Token não fornecido' });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      select: {
        expiresAt: true,
        usedAt: true,
        usuario: { select: { nome: true, ativo: true } }
      }
    });

    if (!resetToken) {
      return NextResponse.json({ valid: false, error: 'Link inválido' });
    }

    if (resetToken.usedAt) {
      return NextResponse.json({ valid: false, error: 'Este link já foi utilizado' });
    }

    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json({ valid: false, error: 'Este link expirou' });
    }

    if (!resetToken.usuario.ativo) {
      return NextResponse.json({ valid: false, error: 'Conta desativada' });
    }

    return NextResponse.json({
      valid: true,
      userName: resetToken.usuario.nome
    });
  } catch (error: any) {
    console.error('[RESET-PASSWORD] Erro ao validar token:', error?.message);
    return NextResponse.json({ valid: false, error: 'Erro interno' });
  }
}
