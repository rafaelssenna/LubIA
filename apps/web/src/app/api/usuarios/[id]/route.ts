import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

// GET - Obter usuário específico
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { id } = await params;
    const usuarioId = parseInt(id);

    const usuario = await prisma.usuario.findFirst({
      where: {
        id: usuarioId,
        empresaId: session.empresaId,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: usuario });
  } catch (error: any) {
    console.error('[USUARIOS GET ID] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT - Atualizar usuário
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { id } = await params;
    const usuarioId = parseInt(id);

    // Verificar se usuário existe e pertence à empresa
    const usuarioExiste = await prisma.usuario.findFirst({
      where: {
        id: usuarioId,
        empresaId: session.empresaId,
      },
    });

    if (!usuarioExiste) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const { nome, email, senha, role, ativo } = await request.json();

    // Verificar se está tentando desativar o próprio usuário
    if (usuarioId === session.userId && ativo === false) {
      return NextResponse.json(
        { error: 'Você não pode desativar seu próprio usuário' },
        { status: 400 }
      );
    }

    // Verificar se está tentando mudar o próprio role
    if (usuarioId === session.userId && role && role !== session.role) {
      return NextResponse.json(
        { error: 'Você não pode alterar seu próprio nível de acesso' },
        { status: 400 }
      );
    }

    // Verificar se email já existe (se estiver sendo alterado)
    if (email && email.toLowerCase().trim() !== usuarioExiste.email) {
      const emailExiste = await prisma.usuario.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (emailExiste) {
        return NextResponse.json(
          { error: 'Este email já está em uso' },
          { status: 400 }
        );
      }
    }

    // Montar dados para atualização
    const updateData: any = {};
    if (nome) updateData.nome = nome.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (role && ['ADMIN', 'GERENTE', 'ATENDENTE', 'VENDEDOR'].includes(role)) {
      updateData.role = role;
    }
    if (typeof ativo === 'boolean') updateData.ativo = ativo;

    // Se senha foi fornecida, fazer hash
    if (senha && senha.length >= 6) {
      updateData.senhaHash = await hashPassword(senha);
    }

    const usuario = await prisma.usuario.update({
      where: { id: usuarioId },
      data: updateData,
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: usuario });
  } catch (error: any) {
    console.error('[USUARIOS PUT] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE - Excluir usuário
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { id } = await params;
    const usuarioId = parseInt(id);

    // Verificar se está tentando excluir o próprio usuário
    if (usuarioId === session.userId) {
      return NextResponse.json(
        { error: 'Você não pode excluir seu próprio usuário' },
        { status: 400 }
      );
    }

    // Verificar se usuário existe e pertence à empresa
    const usuarioExiste = await prisma.usuario.findFirst({
      where: {
        id: usuarioId,
        empresaId: session.empresaId,
      },
    });

    if (!usuarioExiste) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    await prisma.usuario.delete({
      where: { id: usuarioId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[USUARIOS DELETE] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
