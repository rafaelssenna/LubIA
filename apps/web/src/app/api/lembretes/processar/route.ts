import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { gerarMensagemHumanizada, GrupoCliente } from '@/lib/lembretes';

const UAZAPI_URL = process.env.UAZAPI_URL || 'https://hia-clientes.uazapi.com';

// Salvar mensagem no histórico de conversas
async function saveOutgoingMessage(
  telefone: string,
  conteudo: string,
  clienteNome?: string,
  empresaId?: number
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
          empresaId: empresaId!,
        },
      });
    }

    await prisma.mensagem.create({
      data: {
        empresaId: empresaId!,
        conversaId: conversa.id,
        tipo: 'TEXTO',
        conteudo,
        enviada: true,
        lida: true,
        dataEnvio: new Date(),
      },
    });

    console.log('[LEMBRETES] Mensagem salva no histórico para:', telefone);
  } catch (error: any) {
    console.error('[LEMBRETES] Erro ao salvar mensagem no histórico:', error?.message);
  }
}

// Enviar mensagem via WhatsApp
async function sendWhatsAppMessage(
  token: string,
  phone: string,
  message: string,
  clienteNome?: string,
  empresaId?: number
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
      console.error('[LEMBRETES] Erro ao enviar para:', formattedNumber);
      return false;
    }

    await saveOutgoingMessage(formattedNumber, message, clienteNome, empresaId);
    console.log('[LEMBRETES] Mensagem enviada para:', formattedNumber);
    return true;
  } catch (error: any) {
    console.error('[LEMBRETES] Erro:', error?.message);
    return false;
  }
}

// POST - Processar e enviar lembretes pendentes
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const config = await prisma.configuracao.findFirst({
      where: { empresaId: session.empresaId },
    });

    if (!config?.uazapiToken) {
      return NextResponse.json({ error: 'WhatsApp não configurado' }, { status: 400 });
    }

    if (!config.whatsappConnected) {
      return NextResponse.json({ error: 'WhatsApp não está conectado' }, { status: 400 });
    }

    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    // Buscar lembretes pendentes da empresa
    const lembretesPendentes = await prisma.lembrete.findMany({
      where: {
        empresaId: session.empresaId,
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

    console.log(`[LEMBRETES] Encontrados ${lembretesPendentes.length} lembretes pendentes`);

    // Agrupar lembretes por cliente (telefone)
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

    const resultados = {
      totalLembretes: lembretesPendentes.length,
      totalClientes: gruposPorCliente.size,
      enviados: 0,
      falhas: 0,
      detalhes: [] as { cliente: string; veiculos: number; status: string }[],
    };

    // Processar cada grupo (um envio por cliente)
    for (const [telefone, grupo] of gruposPorCliente) {
      const mensagem = gerarMensagemHumanizada(grupo);

      const enviado = await sendWhatsAppMessage(
        config.uazapiToken,
        telefone,
        mensagem,
        grupo.clienteNome,
        session.empresaId
      );

      if (enviado) {
        await prisma.lembrete.updateMany({
          where: { id: { in: grupo.lembreteIds } },
          data: { enviado: true, dataEnvio: new Date() },
        });

        resultados.enviados += grupo.lembreteIds.length;
        resultados.detalhes.push({
          cliente: grupo.clienteNome,
          veiculos: grupo.veiculos.length,
          status: 'enviado',
        });
      } else {
        resultados.falhas += grupo.lembreteIds.length;
        resultados.detalhes.push({
          cliente: grupo.clienteNome,
          veiculos: grupo.veiculos.length,
          status: 'erro_envio',
        });
      }

      // Delay entre envios
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log(`[LEMBRETES] Concluído: ${resultados.enviados} enviados para ${gruposPorCliente.size} clientes`);

    return NextResponse.json({
      success: true,
      ...resultados,
    });
  } catch (error: any) {
    console.error('[LEMBRETES] Erro ao processar:', error?.message);
    return NextResponse.json({
      error: 'Erro ao processar lembretes',
      details: error?.message,
    }, { status: 500 });
  }
}

// GET - Verificar lembretes pendentes (sem enviar)
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    const pendentes = await prisma.lembrete.count({
      where: {
        empresaId: session.empresaId,
        enviado: false,
        dataLembrete: { lte: hoje },
      },
    });

    const proximos7dias = await prisma.lembrete.count({
      where: {
        empresaId: session.empresaId,
        enviado: false,
        dataLembrete: {
          gt: hoje,
          lte: new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    return NextResponse.json({
      pendentesHoje: pendentes,
      proximosDias: proximos7dias,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao verificar lembretes' }, { status: 500 });
  }
}
