import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET - Obter configuração
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    let config = await prisma.configuracao.findFirst({
      where: { empresaId: session.empresaId },
    });

    // Criar registro se não existir
    if (!config) {
      config = await prisma.configuracao.create({
        data: { empresaId: session.empresaId },
      });
    }

    return NextResponse.json({
      data: {
        nomeOficina: config.nomeOficina,
        cnpj: config.cnpj,
        telefone: config.telefone,
        endereco: config.endereco,
        whatsappConfigured: !!config.uazapiToken,
        whatsappConnected: config.whatsappConnected,
        whatsappNumber: config.whatsappNumber,
        whatsappName: config.whatsappName,
        lembreteAntecedencia: config.lembreteAntecedencia,
        // Chatbot
        chatbotEnabled: config.chatbotEnabled,
        chatbotNome: config.chatbotNome,
        chatbotHorario: config.chatbotHorario,
        chatbotServicos: config.chatbotServicos,
        chatbotBoasVindas: config.chatbotBoasVindas,
      },
    });
  } catch (error: any) {
    console.error('[CONFIG GET] Erro:', error?.message);
    return NextResponse.json({
      error: 'Erro ao buscar configuracao',
    }, { status: 500 });
  }
}

// PUT - Atualizar configuração
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Garantir que existe o registro para esta empresa
    let existing = await prisma.configuracao.findFirst({
      where: { empresaId: session.empresaId },
    });

    if (!existing) {
      existing = await prisma.configuracao.create({
        data: { empresaId: session.empresaId },
      });
    }

    const updateData: any = {};

    // Campos da oficina
    if (body.nomeOficina !== undefined) updateData.nomeOficina = body.nomeOficina;
    if (body.cnpj !== undefined) updateData.cnpj = body.cnpj;
    if (body.telefone !== undefined) updateData.telefone = body.telefone;
    if (body.endereco !== undefined) updateData.endereco = body.endereco;

    // Configurações gerais
    if (body.lembreteAntecedencia !== undefined) {
      updateData.lembreteAntecedencia = parseInt(body.lembreteAntecedencia);
    }

    // Chatbot
    if (body.chatbotEnabled !== undefined) updateData.chatbotEnabled = body.chatbotEnabled;
    if (body.chatbotNome !== undefined) updateData.chatbotNome = body.chatbotNome;
    if (body.chatbotHorario !== undefined) updateData.chatbotHorario = body.chatbotHorario;
    if (body.chatbotServicos !== undefined) updateData.chatbotServicos = body.chatbotServicos;
    if (body.chatbotBoasVindas !== undefined) updateData.chatbotBoasVindas = body.chatbotBoasVindas;

    const config = await prisma.configuracao.update({
      where: { id: existing.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        nomeOficina: config.nomeOficina,
        whatsappConnected: config.whatsappConnected,
      },
    });
  } catch (error: any) {
    console.error('[CONFIG PUT] Erro:', error?.message);
    return NextResponse.json({
      error: 'Erro ao atualizar configuracao',
    }, { status: 500 });
  }
}
