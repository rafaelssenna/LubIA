import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const UAZAPI_URL = process.env.UAZAPI_URL || 'https://hia-clientes.uazapi.com';

// Função para salvar mensagem enviada no histórico de conversas
async function saveOutgoingMessage(
  telefone: string,
  conteudo: string,
  clienteNome?: string
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
          nome: cliente?.nome || clienteNome || null,
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

// Função para enviar mensagem via WhatsApp
async function sendWhatsAppMessage(
  token: string,
  phone: string,
  message: string,
  clienteNome?: string
): Promise<boolean> {
  try {
    // Limpar e formatar número
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

    // Salvar mensagem no histórico de conversas
    await saveOutgoingMessage(formattedNumber, message, clienteNome);

    console.log('[LEMBRETES] Mensagem enviada para:', formattedNumber);
    return true;
  } catch (error: any) {
    console.error('[LEMBRETES] Erro:', error?.message);
    return false;
  }
}

// Gerar mensagem personalizada para o lembrete
function gerarMensagem(
  lembrete: {
    tipo: string;
    kmLembrete: number | null;
    mensagem: string | null;
  },
  veiculo: {
    marca: string;
    modelo: string;
    placa: string;
    kmAtual: number | null;
  },
  cliente: { nome: string },
  oficina: string
): string {
  const primeiroNome = cliente.nome.split(' ')[0];
  const veiculoDesc = `${veiculo.marca} ${veiculo.modelo} (${veiculo.placa})`;

  // Se tem mensagem customizada, usar ela
  if (lembrete.mensagem) {
    return lembrete.mensagem
      .replace('{nome}', primeiroNome)
      .replace('{veiculo}', veiculoDesc)
      .replace('{km}', lembrete.kmLembrete?.toLocaleString('pt-BR') || '');
  }

  // Mensagens padrão por tipo
  const mensagens: Record<string, string> = {
    TROCA_OLEO: `Oi ${primeiroNome}! 🚗\n\nPassando pra lembrar que seu ${veiculoDesc} está chegando na hora da troca de óleo${lembrete.kmLembrete ? ` (${lembrete.kmLembrete.toLocaleString('pt-BR')} km)` : ''}!\n\n${oficina}`,

    REVISAO: `Olá ${primeiroNome}! 👋\n\nSeu ${veiculoDesc} está precisando de uma revisão.\n\n${oficina}`,

    FILTROS: `Oi ${primeiroNome}!\n\nLembrete: está na hora de trocar os filtros do seu ${veiculoDesc}.\n\n${oficina}`,

    PNEUS: `Olá ${primeiroNome}! 🛞\n\nSeu ${veiculoDesc} pode estar precisando de uma olhada nos pneus.\n\n${oficina}`,

    FREIOS: `Oi ${primeiroNome}! 🔴\n\nLembrete importante: verifique os freios do seu ${veiculoDesc}.\n\n${oficina}`,

    OUTRO: `Olá ${primeiroNome}!\n\nTemos um lembrete de manutenção para seu ${veiculoDesc}.\n\n${oficina}`,
  };

  return mensagens[lembrete.tipo] || mensagens.OUTRO;
}

// POST - Processar e enviar lembretes pendentes
export async function POST() {
  try {
    // Buscar configuração
    const config = await prisma.configuracao.findUnique({
      where: { id: 1 },
    });

    if (!config?.uazapiToken) {
      return NextResponse.json({
        error: 'WhatsApp não configurado',
      }, { status: 400 });
    }

    if (!config.whatsappConnected) {
      return NextResponse.json({
        error: 'WhatsApp não está conectado',
      }, { status: 400 });
    }

    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999); // Até o fim do dia

    // Buscar lembretes pendentes que vencem hoje ou antes
    const lembretesPendentes = await prisma.lembrete.findMany({
      where: {
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

    const oficina = config.nomeOficina || 'Sua oficina de confiança';
    const resultados = {
      total: lembretesPendentes.length,
      enviados: 0,
      falhas: 0,
      detalhes: [] as { id: number; cliente: string; status: string }[],
    };

    // Processar cada lembrete
    for (const lembrete of lembretesPendentes) {
      const cliente = lembrete.veiculo.cliente;

      // Verificar se cliente tem telefone
      if (!cliente.telefone) {
        resultados.falhas++;
        resultados.detalhes.push({
          id: lembrete.id,
          cliente: cliente.nome,
          status: 'sem_telefone',
        });
        continue;
      }

      // Gerar mensagem personalizada
      const mensagem = gerarMensagem(
        {
          tipo: lembrete.tipo,
          kmLembrete: lembrete.kmLembrete,
          mensagem: lembrete.mensagem,
        },
        {
          marca: lembrete.veiculo.marca,
          modelo: lembrete.veiculo.modelo,
          placa: lembrete.veiculo.placa,
          kmAtual: lembrete.veiculo.kmAtual,
        },
        { nome: cliente.nome },
        oficina
      );

      // Enviar mensagem
      const enviado = await sendWhatsAppMessage(
        config.uazapiToken,
        cliente.telefone,
        mensagem,
        cliente.nome
      );

      if (enviado) {
        // Marcar como enviado
        await prisma.lembrete.update({
          where: { id: lembrete.id },
          data: {
            enviado: true,
            dataEnvio: new Date(),
          },
        });

        resultados.enviados++;
        resultados.detalhes.push({
          id: lembrete.id,
          cliente: cliente.nome,
          status: 'enviado',
        });
      } else {
        resultados.falhas++;
        resultados.detalhes.push({
          id: lembrete.id,
          cliente: cliente.nome,
          status: 'erro_envio',
        });
      }

      // Pequeno delay entre envios para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[LEMBRETES] Processamento concluído: ${resultados.enviados} enviados, ${resultados.falhas} falhas`);

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
  try {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    const pendentes = await prisma.lembrete.count({
      where: {
        enviado: false,
        dataLembrete: { lte: hoje },
      },
    });

    const proximos7dias = await prisma.lembrete.count({
      where: {
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
    return NextResponse.json({
      error: 'Erro ao verificar lembretes',
    }, { status: 500 });
  }
}
