import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth';

// POST - Cadastrar nova empresa e usuário
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, email, senha, nomeEmpresa, telefoneEmpresa } = body;

    // Validações básicas
    if (!nome || !email || !senha || !nomeEmpresa || !telefoneEmpresa) {
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

    // Gerar slug único para a empresa
    let slug = nomeEmpresa
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Verificar se slug já existe e adicionar número se necessário
    let slugBase = slug;
    let counter = 1;
    while (await prisma.empresa.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${counter}`;
      counter++;
    }

    // Criar empresa e usuário em transação
    const result = await prisma.$transaction(async (tx) => {
      // 1. Criar empresa
      const empresa = await tx.empresa.create({
        data: {
          nome: nomeEmpresa,
          slug,
          ativo: true,
        },
      });

      // 2. Criar usuário
      const senhaHash = await hashPassword(senha);
      const usuario = await tx.usuario.create({
        data: {
          email,
          senhaHash,
          nome,
          empresaId: empresa.id,
          ativo: true,
        },
      });

      // 3. Criar configuração padrão
      await tx.configuracao.create({
        data: {
          empresaId: empresa.id,
          nomeOficina: nomeEmpresa,
          telefone: telefoneEmpresa,
          chatbotEnabled: true,
          chatbotNome: 'LoopIA',
          chatbotHorario: JSON.stringify({
            seg: { ativo: true, abertura: '08:00', fechamento: '18:00' },
            ter: { ativo: true, abertura: '08:00', fechamento: '18:00' },
            qua: { ativo: true, abertura: '08:00', fechamento: '18:00' },
            qui: { ativo: true, abertura: '08:00', fechamento: '18:00' },
            sex: { ativo: true, abertura: '08:00', fechamento: '18:00' },
            sab: { ativo: true, abertura: '08:00', fechamento: '12:00' },
            dom: { ativo: false, abertura: '08:00', fechamento: '12:00' },
          }),
        },
      });

      // 4. Criar serviços padrão
      await tx.servico.createMany({
        data: [
          {
            empresaId: empresa.id,
            nome: 'Troca de Óleo 5W30',
            descricao: 'Troca de óleo do motor com óleo semi-sintético 5W30',
            categoria: 'TROCA_OLEO',
            precoBase: 180.00,
            duracaoMin: 60,
          },
          {
            empresaId: empresa.id,
            nome: 'Troca de Óleo Sintético',
            descricao: 'Troca de óleo do motor com óleo 100% sintético',
            categoria: 'TROCA_OLEO',
            precoBase: 280.00,
            duracaoMin: 60,
          },
          {
            empresaId: empresa.id,
            nome: 'Alinhamento e Balanceamento',
            descricao: 'Alinhamento das rodas dianteiras e traseiras + balanceamento das 4 rodas',
            categoria: 'PNEUS',
            precoBase: 140.00,
            duracaoMin: 90,
          },
          {
            empresaId: empresa.id,
            nome: 'Troca de Filtros',
            descricao: 'Substituição do filtro de óleo, ar e combustível',
            categoria: 'FILTROS',
            precoBase: 150.00,
            duracaoMin: 45,
          },
        ],
      });

      return { empresa, usuario };
    });

    // Criar token e fazer login automático
    const token = await createSession({
      userId: result.usuario.id,
      empresaId: result.empresa.id,
      email: result.usuario.email,
      nome: result.usuario.nome,
      empresaNome: result.empresa.nome,
    });

    await setSessionCookie(token);

    // Atualizar lastLoginAt
    await prisma.usuario.update({
      where: { id: result.usuario.id },
      data: { lastLoginAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: result.usuario.id,
        nome: result.usuario.nome,
        email: result.usuario.email,
      },
      empresa: {
        id: result.empresa.id,
        nome: result.empresa.nome,
      },
    });
  } catch (error: any) {
    console.error('[REGISTER] Erro:', error?.message);
    return NextResponse.json(
      { error: 'Erro ao criar conta. Tente novamente.' },
      { status: 500 }
    );
  }
}
