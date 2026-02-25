import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    // Buscar usuário pelo email
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, nome: true, email: true, ativo: true }
    });

    // Sempre retornar sucesso para não revelar se o email existe ou não
    if (!usuario || !usuario.ativo) {
      console.log('[FORGOT-PASSWORD] Email não encontrado ou inativo:', email);
      return NextResponse.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá um link de recuperação.'
      });
    }

    // Invalidar tokens anteriores não utilizados
    await prisma.passwordResetToken.updateMany({
      where: {
        usuarioId: usuario.id,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      data: { expiresAt: new Date() } // Expirar imediatamente
    });

    // Gerar token único
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Salvar token no banco
    await prisma.passwordResetToken.create({
      data: {
        token,
        usuarioId: usuario.id,
        expiresAt,
      }
    });

    // Construir link de reset
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lubia.helsenia.com.br';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    // Enviar email
    const emailResult = await sendPasswordResetEmail({
      to: usuario.email,
      userName: usuario.nome,
      resetLink,
    });

    if (!emailResult.success) {
      console.error('[FORGOT-PASSWORD] Erro ao enviar email:', emailResult.error);
      // Não revelar o erro ao usuário
    } else {
      console.log('[FORGOT-PASSWORD] Email enviado para:', usuario.email);
    }

    return NextResponse.json({
      success: true,
      message: 'Se o email estiver cadastrado, você receberá um link de recuperação.'
    });
  } catch (error: any) {
    console.error('[FORGOT-PASSWORD] Erro:', error?.message);
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}
