import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';

// GET - Listar usuários da empresa (apenas ADMIN)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Apenas ADMIN pode listar usuários
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const usuarios = await prisma.usuario.findMany({
      where: { empresaId: session.empresaId },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { nome: 'asc' },
    });

    return NextResponse.json({ data: usuarios });
  } catch (error: any) {
    console.error('[USUARIOS GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Criar novo usuário (apenas ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Apenas ADMIN pode criar usuários
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { nome, email, senha, role } = await request.json();

    // Validações
    if (!nome || !email || !senha) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (senha.length < 6) {
      return NextResponse.json(
        { error: 'Senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      );
    }

    // Verificar se email já existe
    const emailExiste = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (emailExiste) {
      return NextResponse.json(
        { error: 'Este email já está em uso' },
        { status: 400 }
      );
    }

    // Validar role
    const validRoles = ['ADMIN', 'GERENTE', 'ATENDENTE', 'VENDEDOR'];
    const userRole = validRoles.includes(role) ? role : 'ATENDENTE';

    // Hash da senha
    const senhaHash = await hashPassword(senha);

    // Criar usuário
    const usuario = await prisma.usuario.create({
      data: {
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        senhaHash,
        role: userRole,
        empresaId: session.empresaId,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: usuario }, { status: 201 });
  } catch (error: any) {
    console.error('[USUARIOS POST] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
