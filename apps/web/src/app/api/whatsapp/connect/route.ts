import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const UAZAPI_URL = process.env.UAZAPI_URL || 'https://hia-clientes.uazapi.com';
const UAZAPI_ADMIN_TOKEN = process.env.UAZAPI_ADMIN_TOKEN;

// GET - Obter QR Code para conexão (cria instância se necessário)
export async function GET() {
  try {
    // Garantir que existe registro de configuração
    let config = await prisma.configuracao.findUnique({
      where: { id: 1 },
    });

    if (!config) {
      config = await prisma.configuracao.create({
        data: { id: 1 },
      });
    }

    // Se não tem token, criar nova instância
    if (!config.uazapiToken) {
      if (!UAZAPI_ADMIN_TOKEN) {
        return NextResponse.json({
          error: 'Admin token não configurado no servidor',
        }, { status: 500 });
      }

      // Criar nova instância via API admin
      const initResponse = await fetch(`${UAZAPI_URL}/instance/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'admintoken': UAZAPI_ADMIN_TOKEN,
        },
        body: JSON.stringify({
          name: config.nomeOficina || 'LubIA Oficina',
        }),
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json().catch(() => ({}));
        console.error('[WHATSAPP CONNECT] Erro ao criar instância:', errorData);
        return NextResponse.json({
          error: 'Erro ao criar instância WhatsApp',
          details: errorData,
        }, { status: 500 });
      }

      const instanceData = await initResponse.json();
      console.log('[WHATSAPP CONNECT] Instância criada:', instanceData.id);

      // Salvar token e ID da instância
      config = await prisma.configuracao.update({
        where: { id: 1 },
        data: {
          uazapiInstanceId: instanceData.id,
          uazapiToken: instanceData.token,
        },
      });
    }

    // Chamar UazAPI para obter QR Code
    const response = await fetch(`${UAZAPI_URL}/instance/connect`, {
      method: 'GET',
      headers: {
        'token': config.uazapiToken!,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[WHATSAPP CONNECT] Erro ao obter QR:', errorData);

      // Se token inválido, limpar e pedir para reconectar
      if (response.status === 401) {
        await prisma.configuracao.update({
          where: { id: 1 },
          data: {
            uazapiToken: null,
            uazapiInstanceId: null,
            whatsappConnected: false,
          },
        });
        return NextResponse.json({
          error: 'Sessão expirada. Tente conectar novamente.',
        }, { status: 401 });
      }

      return NextResponse.json({
        error: errorData.error || 'Erro ao obter QR Code',
      }, { status: response.status });
    }

    const data = await response.json();

    // Se já está conectado
    if (data.status === 'connected') {
      await prisma.configuracao.update({
        where: { id: 1 },
        data: {
          whatsappConnected: true,
          whatsappNumber: data.owner || null,
          whatsappName: data.profileName || null,
        },
      });

      return NextResponse.json({
        status: 'connected',
        profileName: data.profileName,
        number: data.owner,
      });
    }

    return NextResponse.json({
      qrcode: data.qrcode,
      paircode: data.paircode,
      status: data.status,
    });
  } catch (error: any) {
    console.error('[WHATSAPP CONNECT] Erro:', error?.message);
    return NextResponse.json({
      error: 'Erro ao conectar WhatsApp',
      details: error?.message,
    }, { status: 500 });
  }
}
