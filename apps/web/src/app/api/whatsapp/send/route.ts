import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const UAZAPI_URL = process.env.UAZAPI_URL || 'https://hia-clientes.uazapi.com';

// Função para salvar mensagem enviada
async function saveOutgoingMessage(
  telefone: string,
  conteudo: string,
  tipo: 'TEXTO' | 'IMAGEM' | 'DOCUMENTO' = 'TEXTO',
  messageId?: string
): Promise<void> {
  try {
    // Buscar ou criar conversa
    let conversa = await prisma.conversa.findUnique({
      where: { telefone },
    });

    if (conversa) {
      // Atualizar conversa existente
      await prisma.conversa.update({
        where: { id: conversa.id },
        data: {
          ultimaMensagem: conteudo.substring(0, 200),
          ultimaData: new Date(),
          naoLidas: 0, // Zerar não lidas ao enviar
        },
      });
    } else {
      // Tentar vincular a cliente existente
      const telefoneLimpo = telefone.replace(/\D/g, '');
      const cliente = await prisma.cliente.findFirst({
        where: {
          OR: [
            { telefone: { contains: telefoneLimpo } },
            { telefone: { contains: telefoneLimpo.slice(-11) } },
          ],
        },
      });

      conversa = await prisma.conversa.create({
        data: {
          telefone,
          nome: cliente?.nome || null,
          clienteId: cliente?.id || null,
          ultimaMensagem: conteudo.substring(0, 200),
          ultimaData: new Date(),
          naoLidas: 0,
        },
      });
    }

    // Salvar mensagem
    await prisma.mensagem.create({
      data: {
        conversaId: conversa.id,
        messageId: messageId || null,
        tipo,
        conteudo,
        enviada: true,
        lida: true,
        dataEnvio: new Date(),
      },
    });
  } catch (error: any) {
    console.error('[WHATSAPP SEND] Erro ao salvar mensagem:', error?.message);
  }
}

// POST - Enviar mensagem WhatsApp
export async function POST(request: NextRequest) {
  try {
    const config = await prisma.configuracao.findUnique({
      where: { id: 1 },
    });

    if (!config?.uazapiToken) {
      return NextResponse.json({
        error: 'WhatsApp nao configurado',
      }, { status: 400 });
    }

    if (!config.whatsappConnected) {
      return NextResponse.json({
        error: 'WhatsApp nao esta conectado',
      }, { status: 400 });
    }

    const body = await request.json();
    const { number, text, type, file, docName, caption } = body;

    if (!number) {
      return NextResponse.json({
        error: 'Numero de telefone e obrigatorio',
      }, { status: 400 });
    }

    // Formatar número (remover caracteres não numéricos)
    const formattedNumber = number.replace(/\D/g, '');

    let endpoint = '/send/text';
    let payload: any = {
      number: formattedNumber,
      delay: 1000,
      readchat: true,
    };

    if (type === 'media' && file) {
      // Enviar mídia (imagem, documento, etc)
      endpoint = '/send/media';
      payload = {
        ...payload,
        type: file.includes('.pdf') ? 'document' : 'image',
        file: file,
        docName: docName || 'documento.pdf',
        text: caption || '',
      };
    } else {
      // Enviar texto simples
      payload.text = text;
      payload.linkPreview = true;
    }

    const response = await fetch(`${UAZAPI_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': config.uazapiToken,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[WHATSAPP SEND] Erro da API:', errorData);
      return NextResponse.json({
        error: errorData.error || 'Erro ao enviar mensagem',
        details: errorData,
      }, { status: response.status });
    }

    const data = await response.json();
    const messageId = data.key?.id || data.id;

    // Salvar mensagem enviada no banco
    const conteudo = type === 'media' ? (caption || `[${file.includes('.pdf') ? 'Documento' : 'Mídia'}]`) : text;
    const tipoMsg = type === 'media' ? (file.includes('.pdf') ? 'DOCUMENTO' : 'IMAGEM') : 'TEXTO';
    await saveOutgoingMessage(formattedNumber, conteudo, tipoMsg as any, messageId);

    return NextResponse.json({
      success: true,
      messageId,
      status: data.status,
    });
  } catch (error: any) {
    console.error('[WHATSAPP SEND] Erro:', error?.message);
    return NextResponse.json({
      error: 'Erro ao enviar mensagem',
      details: error?.message,
    }, { status: 500 });
  }
}
