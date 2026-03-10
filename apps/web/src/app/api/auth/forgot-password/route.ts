import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    // Buscar usuário pelo email (case-insensitive)
    const usuario = await prisma.usuario.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
      select: { id: true, nome: true, email: true, ativo: true }
    });

    // Sempre retornar sucesso para não revelar se o email existe ou não
    if (!usuario || !usuario.ativo) {
      console.log('[FORGOT-PASSWORD] Email não encontrado ou inativo:', email);
      return NextResponse.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá um código de recuperação.'
      });
    }

    // Invalidar tokens anteriores não utilizados
    await prisma.passwordResetToken.updateMany({
      where: {
        usuarioId: usuario.id,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      data: { expiresAt: new Date() }
    });

    // Gerar código de 6 dígitos
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Salvar código no banco
    await prisma.passwordResetToken.create({
      data: {
        token: resetCode,
        usuarioId: usuario.id,
        expiresAt,
      }
    });

    // Enviar email com código
    console.log('[FORGOT-PASSWORD] Enviando código para:', usuario.email);
    console.log('[FORGOT-PASSWORD] ZOHO_CLIENT_ID existe:', !!process.env.ZOHO_CLIENT_ID);
    console.log('[FORGOT-PASSWORD] ZOHO_ACCOUNT_ID existe:', !!process.env.ZOHO_ACCOUNT_ID);
    console.log('[FORGOT-PASSWORD] ZOHO_REFRESH_TOKEN existe:', !!process.env.ZOHO_REFRESH_TOKEN);

    const emailResult = await sendPasswordResetEmail({
      to: usuario.email,
      userName: usuario.nome,
      resetCode,
    });

    console.log('[FORGOT-PASSWORD] Resultado email:', JSON.stringify(emailResult));

    if (!emailResult.success) {
      console.error('[FORGOT-PASSWORD] Erro ao enviar email:', emailResult.error);
    } else {
      console.log('[FORGOT-PASSWORD] Código enviado com sucesso para:', usuario.email);
    }

    return NextResponse.json({
      success: true,
      message: 'Se o email estiver cadastrado, você receberá um código de recuperação.'
    });
  } catch (error: any) {
    console.error('[FORGOT-PASSWORD] Erro:', error?.message);
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}
