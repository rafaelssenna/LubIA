import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const UAZAPI_URL = process.env.UAZAPI_URL || 'https://hia-clientes.uazapi.com';

// Função para salvar mensagem enviada
async function saveOutgoingMessage(
  telefone: string,
  conteudo: string,
  empresaId: number,
  tipo: 'TEXTO' | 'IMAGEM' | 'DOCUMENTO' = 'TEXTO',
  messageId?: string
): Promise<void> {
  try {
    // Buscar ou criar conversa
    let conversa = await prisma.conversa.findUnique({
      where: { telefone_empresaId: { telefone, empresaId } },
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
          empresaId,
          OR: [
            { telefone: { contains: telefoneLimpo } },
            { telefone: { contains: telefoneLimpo.slice(-11) } },
          ],
        },
      });

      conversa = await prisma.conversa.create({
        data: {
          empresaId,
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
        empresaId,
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
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const config = await prisma.configuracao.findUnique({
      where: { empresaId: session.empresaId },
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
      // Detectar se é PDF (por extensão ou base64)
      const isPdf = file.includes('.pdf') || file.includes('application/pdf');

      // Se for base64, extrair apenas o conteúdo base64 (sem o prefixo data:...)
      let fileData = file;
      let mimetype: string | undefined;
      if (file.startsWith('data:')) {
        const matches = file.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimetype = matches[1];
          fileData = matches[2]; // Apenas o base64 puro
        }
      }

      payload = {
        ...payload,
        type: isPdf ? 'document' : 'image',
        file: fileData,
        docName: docName || (isPdf ? 'documento.pdf' : undefined),
        text: caption || '',
        ...(mimetype && { mimetype }),
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
    const isPdfFile = file && (file.includes('.pdf') || file.includes('application/pdf'));
    const conteudo = type === 'media' ? (caption || `[${isPdfFile ? 'Documento' : 'Mídia'}]`) : text;
    const tipoMsg = type === 'media' ? (isPdfFile ? 'DOCUMENTO' : 'IMAGEM') : 'TEXTO';
    await saveOutgoingMessage(formattedNumber, conteudo, session.empresaId, tipoMsg as any, messageId);

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
