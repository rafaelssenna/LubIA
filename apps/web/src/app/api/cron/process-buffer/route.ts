import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateChatResponse } from '@/lib/chatbot';

export const maxDuration = 60;

const UAZAPI_URL = process.env.UAZAPI_URL || 'https://hia-clientes.uazapi.com';

// Cron de segurança: processa buffers órfãos (função morreu durante sleep)
// Roda a cada 1 minuto via Vercel Cron
export async function GET(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  if (
    !userAgent.includes('vercel-cron') &&
    !process.env.VERCEL &&
    process.env.NODE_ENV !== 'development'
  ) {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Buscar buffers que expiraram há mais de 30s e não foram processados
    const orfaos = await prisma.conversa.findMany({
      where: {
        bufferAte: { lt: new Date(Date.now() - 30000) },
        bufferProcessando: false,
        aiPaused: false,
      },
      include: {
        empresa: {
          include: { configuracao: true },
        },
      },
    });

    let processed = 0;

    for (const conversa of orfaos) {
      const token = conversa.empresa?.configuracao?.uazapiToken;
      if (!token) {
        // Limpar buffer mesmo sem token
        await prisma.conversa.update({
          where: { id: conversa.id },
          data: { bufferAte: null, bufferProcessando: false },
        });
        continue;
      }

      // Reivindicar atomicamente
      const claimed = await prisma.conversa.updateMany({
        where: {
          id: conversa.id,
          bufferProcessando: false,
          bufferAte: { lt: new Date(Date.now() - 30000) },
        },
        data: { bufferProcessando: true },
      });

      if (claimed.count === 0) continue;

      // Buscar mensagens não processadas
      const mensagens = await prisma.mensagem.findMany({
        where: {
          conversaId: conversa.id,
          enviada: false,
          processadaPelaIA: false,
        },
        orderBy: { dataEnvio: 'asc' },
      });

      if (mensagens.length > 0) {
        const textoCompleto = mensagens.map(m => m.conteudo).join('\n');

        try {
          const aiResponse = await generateChatResponse(
            textoCompleto,
            conversa.telefone,
            conversa.empresaId,
            conversa.nome || undefined
          );

          // Enviar resposta de texto via WhatsApp
          if (aiResponse.type === 'text' && aiResponse.message) {
            const sendRes = await fetch(`${UAZAPI_URL}/send/text`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'token': token },
              body: JSON.stringify({ number: conversa.telefone, text: aiResponse.message }),
            });

            if (sendRes.ok) {
              // Salvar resposta enviada no histórico
              await prisma.mensagem.create({
                data: {
                  empresaId: conversa.empresaId,
                  conversaId: conversa.id,
                  tipo: 'TEXTO',
                  conteudo: aiResponse.message,
                  enviada: true,
                  processadaPelaIA: true,
                },
              });

              await prisma.conversa.update({
                where: { id: conversa.id },
                data: {
                  ultimaMensagem: aiResponse.message.substring(0, 200),
                  ultimaData: new Date(),
                },
              });
            }
          }

          // Marcar mensagens como processadas
          await prisma.mensagem.updateMany({
            where: { id: { in: mensagens.map(m => m.id) } },
            data: { processadaPelaIA: true },
          });

          processed++;
          console.log('[CRON-BUFFER] Processou buffer órfão para', conversa.telefone, '(' + mensagens.length + ' msgs)');
        } catch (error: any) {
          console.error('[CRON-BUFFER] Erro ao processar conversa', conversa.id, error?.message);
        }
      }

      // Limpar buffer
      await prisma.conversa.update({
        where: { id: conversa.id },
        data: { bufferAte: null, bufferProcessando: false },
      });
    }

    // Limpar buffers travados (stuck > 2 minutos = função morta)
    const stuck = await prisma.conversa.updateMany({
      where: {
        bufferProcessando: true,
        updatedAt: { lt: new Date(Date.now() - 120000) },
      },
      data: { bufferProcessando: false, bufferAte: null },
    });

    return NextResponse.json({
      success: true,
      orphansFound: orfaos.length,
      processed,
      stuckCleared: stuck.count,
    });
  } catch (error: any) {
    console.error('[CRON-BUFFER] Erro:', error?.message);
    return NextResponse.json({ success: false, error: error?.message });
  }
}
