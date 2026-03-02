import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

// Gera slug único a partir do nome da empresa
function generateSlug(nome: string): string {
  const base = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30);

  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

// POST - Cria conta diretamente (sem Stripe, trial de 7 dias)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, email, senha, nomeEmpresa, cnpjEmpresa, telefoneEmpresa, enderecoEmpresa } = body;

    // Validações básicas
    if (!nome || !email || !senha || !nomeEmpresa || !cnpjEmpresa || !telefoneEmpresa || !enderecoEmpresa) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    if (senha.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Verificar se email já existe
    const existingUser = await prisma.usuario.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado' },
        { status: 400 }
      );
    }

    // Verificar se CNPJ já existe
    const existingEmpresa = await prisma.empresa.findFirst({
      where: { cnpj: cnpjEmpresa.replace(/\D/g, '') },
    });

    if (existingEmpresa) {
      return NextResponse.json(
        { error: 'Este CNPJ já está cadastrado' },
        { status: 400 }
      );
    }

    const senhaHash = await hashPassword(senha);

    // Trial de 7 dias
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    // Criar tudo em uma transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar empresa com trial
      const empresa = await tx.empresa.create({
        data: {
          nome: nomeEmpresa,
          slug: generateSlug(nomeEmpresa),
          cnpj: cnpjEmpresa.replace(/\D/g, '') || null,
          telefone: telefoneEmpresa.replace(/\D/g, '') || null,
          endereco: enderecoEmpresa || null,
          subscriptionStatus: 'TRIAL',
          trialEndsAt,
        },
      });

      // Criar usuário admin
      const usuario = await tx.usuario.create({
        data: {
          nome,
          email,
          senhaHash,
          role: 'ADMIN',
          empresaId: empresa.id,
        },
      });

      // Criar configuração padrão
      await tx.configuracao.create({
        data: {
          empresaId: empresa.id,
          nomeOficina: nomeEmpresa,
          cnpj: cnpjEmpresa.replace(/\D/g, '') || null,
          telefone: telefoneEmpresa.replace(/\D/g, '') || null,
          endereco: enderecoEmpresa || null,
          lembreteAntecedencia: 7,
        },
      });

      // Criar serviços padrão
      await tx.servico.createMany({
        data: [
          { nome: 'Troca de Óleo', precoBase: 0, categoria: 'TROCA_OLEO', empresaId: empresa.id },
          { nome: 'Filtro de Óleo', precoBase: 0, categoria: 'FILTROS', empresaId: empresa.id },
          { nome: 'Filtro de Ar', precoBase: 0, categoria: 'FILTROS', empresaId: empresa.id },
          { nome: 'Filtro de Combustível', precoBase: 0, categoria: 'FILTROS', empresaId: empresa.id },
          { nome: 'Filtro de Cabine', precoBase: 0, categoria: 'FILTROS', empresaId: empresa.id },
        ],
      });

      return { empresa, usuario };
    });

    console.log('[REGISTER] Conta criada com sucesso:', {
      empresaId: result.empresa.id,
      usuarioId: result.usuario.id,
      email,
      trialEndsAt: trialEndsAt.toISOString(),
    });

    return NextResponse.json({
      success: true,
      redirect: '/login?registered=true',
    });
  } catch (error: any) {
    console.error('[REGISTER] Erro:', error?.message);
    return NextResponse.json(
      { error: error?.message || 'Erro ao criar conta. Tente novamente.' },
      { status: 500 }
    );
  }
}
