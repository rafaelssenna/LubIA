import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { gerarLembretesParaEmpresa, gerarMensagemHumanizada, GrupoCliente } from '@/lib/lembretes';

const UAZAPI_URL = process.env.UAZAPI_URL || 'https://hia-clientes.uazapi.com';

// Verificar se é uma requisição válida do cron
function isValidCronRequest(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  if (userAgent.includes('vercel-cron')) return true;
  if (process.env.NODE_ENV === 'development') return true;

  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (process.env.VERCEL) return true;

  return false;
}

// Salvar mensagem no histórico
async function saveOutgoingMessage(
  telefone: string,
  conteudo: string,
  empresaId: number,
  clienteNome?: string
): Promise<void> {
  try {
    let conversa = await prisma.conversa.findFirst({
      where: { telefone, empresaId },
    });

    if (conversa) {
      await prisma.conversa.update({
        where: { id: conversa.id },
        data: {
          ultimaMensagem: conteudo.substring(0, 200),
          ultimaData: new Date(),
        },
      });
    } else {
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
          telefone,
          nome: cliente?.nome || clienteNome || null,
          clienteId: cliente?.id || null,
          ultimaMensagem: conteudo.substring(0, 200),
          ultimaData: new Date(),
          naoLidas: 0,
          empresaId,
        },
      });
    }

    await prisma.mensagem.create({
      data: {
        empresaId,
        conversaId: conversa.id,
        tipo: 'TEXTO',
        conteudo,
        enviada: true,
        lida: true,
        dataEnvio: new Date(),
      },
    });
  } catch (error: any) {
    console.error('[CRON] Erro ao salvar mensagem:', error?.message);
  }
}

// Enviar mensagem via WhatsApp
async function sendWhatsAppMessage(
  token: string,
  phone: string,
  message: string,
  empresaId: number,
  clienteNome?: string
): Promise<boolean> {
  try {
    const cleanNumber = phone.replace(/\D/g, '');
    const formattedNumber = cleanNumber.length === 10 || cleanNumber.length === 11
      ? `55${cleanNumber}`
      : cleanNumber;

    const response = await fetch(`${UAZAPI_URL}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body: JSON.stringify({
        number: formattedNumber,
        text: message,
      }),
    });

    if (!response.ok) {
      console.error('[CRON] Erro ao enviar para:', formattedNumber);
      return false;
    }

    await saveOutgoingMessage(formattedNumber, message, empresaId, clienteNome);
    return true;
  } catch (error: any) {
    console.error('[CRON] Erro:', error?.message);
    return false;
  }
}

// GET - Executado pelo Vercel Cron às 8h
export async function GET(request: NextRequest) {
  console.log('[CRON LEMBRETES] Iniciando execução:', new Date().toISOString());

  if (!isValidCronRequest(request)) {
    console.error('[CRON LEMBRETES] Não autorizado');
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    // Buscar todas as empresas com WhatsApp configurado e conectado
    const empresas = await prisma.configuracao.findMany({
      where: {
        whatsappConnected: true,
        uazapiToken: { not: null },
      },
      include: {
        empresa: true,
      },
    });

    console.log(`[CRON LEMBRETES] ${empresas.length} empresas com WhatsApp ativo`);

    const resultadoGeral = {
      empresasProcessadas: 0,
      lembretesGerados: 0,
      mensagensEnviadas: 0,
      falhas: 0,
    };

    for (const config of empresas) {
      const empresaId = config.empresaId;
      const token = config.uazapiToken!;

      console.log(`[CRON LEMBRETES] Processando empresa ${empresaId}: ${config.empresa?.nome || 'N/A'}`);

      // ============================================
      // ETAPA 1: GERAR LEMBRETES AUTOMÁTICOS
      // ============================================
      try {
        const gerados = await gerarLembretesParaEmpresa(empresaId);
        resultadoGeral.lembretesGerados += gerados.length;
        console.log(`[CRON LEMBRETES] Empresa ${empresaId}: ${gerados.length} lembretes gerados`);
      } catch (err: any) {
        console.error(`[CRON LEMBRETES] Erro ao gerar pra empresa ${empresaId}:`, err?.message);
      }

      // ============================================
      // ETAPA 2: ENVIAR LEMBRETES PENDENTES
      // ============================================
      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999);

      const lembretesPendentes = await prisma.lembrete.findMany({
        where: {
          empresaId,
          enviado: false,
          dataLembrete: { lte: hoje },
        },
        include: {
          veiculo: {
            include: {
              cliente: true,
            },
          },
        },
        orderBy: { dataLembrete: 'asc' },
      });

      // Agrupar por cliente
      const gruposPorCliente = new Map<string, GrupoCliente>();

      for (const lembrete of lembretesPendentes) {
        const cliente = lembrete.veiculo.cliente;
        if (!cliente || !cliente.telefone) continue;

        const telefone = cliente.telefone;

        if (!gruposPorCliente.has(telefone)) {
          gruposPorCliente.set(telefone, {
            clienteNome: cliente.nome,
            telefone,
            veiculos: [],
            lembreteIds: [],
          });
        }

        const grupo = gruposPorCliente.get(telefone)!;
        grupo.veiculos.push({
          lembreteId: lembrete.id,
          modelo: lembrete.veiculo.modelo,
          marca: lembrete.veiculo.marca,
          kmLembrete: lembrete.kmLembrete,
          servicoNome: lembrete.mensagem || lembrete.tipo,
        });
        grupo.lembreteIds.push(lembrete.id);
      }

      // Enviar mensagens
      for (const [telefone, grupo] of gruposPorCliente) {
        const mensagem = gerarMensagemHumanizada(grupo);

        try {
          const enviado = await sendWhatsAppMessage(
            token, telefone, mensagem, empresaId, grupo.clienteNome
          );

          if (enviado) {
            try {
              await prisma.lembrete.updateMany({
                where: { id: { in: grupo.lembreteIds } },
                data: { enviado: true, dataEnvio: new Date() },
              });
              resultadoGeral.mensagensEnviadas++;
              console.log(`[CRON LEMBRETES] Enviado para ${telefone} (${grupo.lembreteIds.length} lembretes)`);
            } catch (dbError: any) {
              console.error(`[CRON LEMBRETES] CRÍTICO: Enviado para ${telefone} mas DB falhou:`, dbError?.message);
              resultadoGeral.mensagensEnviadas++;
            }
          } else {
            resultadoGeral.falhas++;
          }
        } catch (sendError: any) {
          console.error(`[CRON LEMBRETES] Erro ao processar ${telefone}:`, sendError?.message);
          resultadoGeral.falhas++;
        }

        // Delay entre envios
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      resultadoGeral.empresasProcessadas++;
    }

    console.log('[CRON LEMBRETES] Concluído:', resultadoGeral);

    return NextResponse.json({
      success: true,
      ...resultadoGeral,
      executadoEm: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[CRON LEMBRETES] Erro:', error?.message);
    return NextResponse.json({
      error: 'Erro ao processar lembretes',
      details: error?.message,
    }, { status: 500 });
  }
}
