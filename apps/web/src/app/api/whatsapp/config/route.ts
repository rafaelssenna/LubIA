import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obter configuração
export async function GET() {
  try {
    let config = await prisma.configuracao.findUnique({
      where: { id: 1 },
    });

    // Criar registro se não existir
    if (!config) {
      config = await prisma.configuracao.create({
        data: { id: 1 },
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
  try {
    const body = await request.json();

    // Garantir que existe o registro
    const existing = await prisma.configuracao.findUnique({
      where: { id: 1 },
    });

    if (!existing) {
      await prisma.configuracao.create({
        data: { id: 1 },
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

    const config = await prisma.configuracao.update({
      where: { id: 1 },
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
