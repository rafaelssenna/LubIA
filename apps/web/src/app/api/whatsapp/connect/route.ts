import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

const UAZAPI_URL = process.env.UAZAPI_URL || 'https://hia-clientes.uazapi.com';
const UAZAPI_ADMIN_TOKEN = process.env.UAZAPI_ADMIN_TOKEN;

// Função para configurar webhook na UazAPI
async function configureWebhook(token: string, webhookUrl: string) {
  try {
    console.log('[WHATSAPP CONNECT] Configurando webhook:', webhookUrl);

    const response = await fetch(`${UAZAPI_URL}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body: JSON.stringify({
        enabled: true,
        url: webhookUrl,
        events: ['messages', 'connection'],
        excludeMessages: ['wasSentByApi', 'isGroupYes'],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[WHATSAPP CONNECT] Erro ao configurar webhook:', errorData);
      return false;
    }

    console.log('[WHATSAPP CONNECT] Webhook configurado com sucesso');
    return true;
  } catch (error: any) {
    console.error('[WHATSAPP CONNECT] Erro ao configurar webhook:', error?.message);
    return false;
  }
}

// GET - Obter QR Code para conexão (cria instância se necessário)
export async function GET() {
  try {
    // Obter URL base para o webhook
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const webhookUrl = `${protocol}://${host}/api/whatsapp/webhook`;

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

    // Configurar webhook (sempre, para garantir que está configurado)
    await configureWebhook(config.uazapiToken!, webhookUrl);

    // Chamar UazAPI para obter QR Code (POST sem phone = QR code)
    const response = await fetch(`${UAZAPI_URL}/instance/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': config.uazapiToken!,
      },
      body: JSON.stringify({}),
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
    console.log('[WHATSAPP CONNECT] Resposta UazAPI:', JSON.stringify(data, null, 2));

    // A resposta tem: connected, loggedIn, jid, instance
    // O QR code está em instance.qrcode
    const instance = data.instance || {};

    // Se já está conectado
    if (data.connected || instance.status === 'connected') {
      console.log('[WHATSAPP CONNECT] Já conectado!', instance.profileName);
      await prisma.configuracao.update({
        where: { id: 1 },
        data: {
          whatsappConnected: true,
          whatsappNumber: instance.owner || null,
          whatsappName: instance.profileName || null,
        },
      });

      return NextResponse.json({
        status: 'connected',
        profileName: instance.profileName,
        number: instance.owner,
      });
    }

    // Se tem QR code na instância
    if (instance.qrcode) {
      console.log('[WHATSAPP CONNECT] QR code encontrado');
      return NextResponse.json({
        qrcode: instance.qrcode,
        paircode: instance.paircode,
        status: instance.status || 'connecting',
      });
    }

    // Se não tem QR code, retornar o status atual
    console.log('[WHATSAPP CONNECT] Sem QR code, status:', instance.status || data);
    return NextResponse.json({
      status: instance.status || 'disconnected',
      message: 'Aguardando QR Code...',
      raw: data, // Para debug
    });
  } catch (error: any) {
    console.error('[WHATSAPP CONNECT] Erro:', error?.message);
    return NextResponse.json({
      error: 'Erro ao conectar WhatsApp',
      details: error?.message,
    }, { status: 500 });
  }
}
