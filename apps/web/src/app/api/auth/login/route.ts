import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, senha } = await request.json();

    if (!email || !senha) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar usuário
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { empresa: true },
    });

    if (!usuario || !usuario.ativo) {
      return NextResponse.json(
        { error: 'Email ou senha incorretos' },
        { status: 401 }
      );
    }

    // Verificar senha
    const senhaValida = await verifyPassword(senha, usuario.senhaHash);
    if (!senhaValida) {
      return NextResponse.json(
        { error: 'Email ou senha incorretos' },
        { status: 401 }
      );
    }

    // Verificar se empresa está ativa
    if (!usuario.empresa.ativo) {
      return NextResponse.json(
        { error: 'Empresa inativa' },
        { status: 403 }
      );
    }

    // Atualizar último login
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { lastLoginAt: new Date() },
    });

    // Criar sessão JWT
    const token = await createSession({
      userId: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      empresaId: usuario.empresaId,
      empresaNome: usuario.empresa.nome,
      role: usuario.role as 'ADMIN' | 'GERENTE' | 'ATENDENTE',
    });

    // Salvar cookie
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        empresa: usuario.empresa.nome,
        role: usuario.role,
      },
    });
  } catch (error: any) {
    console.error('[LOGIN] Erro:', error?.message);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
