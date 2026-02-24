import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const UAZAPI_URL = process.env.UAZAPI_URL || 'https://hia-clientes.uazapi.com';

// Verificar se é uma requisição válida do cron
function isValidCronRequest(request: NextRequest): boolean {
  // Em produção na Vercel, aceitar requisições do cron scheduler
  // O Vercel automaticamente protege rotas de cron contra acesso externo
  // quando configuradas no vercel.json

  // Verificar header que a Vercel adiciona em cron jobs
  const userAgent = request.headers.get('user-agent') || '';
  if (userAgent.includes('vercel-cron')) {
    return true;
  }

  // Permitir em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Permitir se tiver CRON_SECRET configurado (opcional)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }

  // Em produção na Vercel, permitir (a Vercel protege automaticamente)
  if (process.env.VERCEL) {
    return true;
  }

  return false;
}

// Tipo para veículo com lembrete
interface VeiculoLembrete {
  lembreteId: number;
  modelo: string;
  marca: string;
  kmLembrete: number | null;
}

// Tipo para grupo de lembretes por cliente
interface GrupoCliente {
  clienteNome: string;
  telefone: string;
  veiculos: VeiculoLembrete[];
  lembreteIds: number[];
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

// Gerar mensagem humanizada
function gerarMensagem(grupo: GrupoCliente): string {
  const primeiroNome = grupo.clienteNome.split(' ')[0];
  const veiculos = grupo.veiculos;

  const saudacoes = [
    `Oi ${primeiroNome}! Tudo bem?`,
    `E aí ${primeiroNome}, tudo certo?`,
    `Oi ${primeiroNome}! Como você está?`,
  ];
  const saudacao = saudacoes[Math.floor(Math.random() * saudacoes.length)];

  if (veiculos.length === 1) {
    const v = veiculos[0];
    const kmInfo = v.kmLembrete ? ` nos ${v.kmLembrete.toLocaleString('pt-BR')} km` : '';

    return `${saudacao}

Passando pra te dar um toque: vi aqui que o ${v.modelo} está chegando na hora da troca de óleo${kmInfo}.

A troca no prazo certo ajuda a proteger o motor e evitar dor de cabeça lá na frente.

Quer que eu reserve um horário pra dar uma olhada? Consigo encaixar ainda essa semana!`;
  }

  const listaVeiculos = veiculos.map(v => {
    const kmInfo = v.kmLembrete ? `${v.kmLembrete.toLocaleString('pt-BR')} km` : 'em breve';
    return `🔧 ${v.modelo} — próxima troca nos ${kmInfo}`;
  }).join('\n');

  return `${saudacao}

Passando pra te dar um toque: vi aqui que seus veículos estão chegando na hora da troca de óleo:

${listaVeiculos}

A troca no prazo certo ajuda a proteger o motor e evitar dor de cabeça lá na frente.

Quer que eu reserve um horário pra gente dar uma olhada neles? Consigo encaixar ainda essa semana!`;
}

// Calcular média de km/mês
function calcularMediaKmMes(ordens: { kmEntrada: number | null; createdAt: Date }[]): number {
  const ordensComKm = ordens
    .filter(o => o.kmEntrada !== null)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (ordensComKm.length < 2) {
    return 1000;
  }

  const primeiraOrdem = ordensComKm[0];
  const ultimaOrdem = ordensComKm[ordensComKm.length - 1];

  const kmTotal = ultimaOrdem.kmEntrada! - primeiraOrdem.kmEntrada!;
  const diasTotal = Math.max(1,
    (new Date(ultimaOrdem.createdAt).getTime() - new Date(primeiraOrdem.createdAt).getTime())
    / (1000 * 60 * 60 * 24)
  );

  const kmPorMes = (kmTotal / diasTotal) * 30;
  return Math.max(500, Math.min(5000, kmPorMes));
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
      const kmAntecedencia = 500;

      // Data limite: não criar novo lembrete se já enviou um nos últimos 30 dias
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

      const veiculos = await prisma.veiculo.findMany({
        where: {
          empresaId,
          kmAtual: { not: null },
        },
        include: {
          cliente: true,
          ordens: {
            where: {
              status: { in: ['CONCLUIDO', 'ENTREGUE'] },
            },
            orderBy: { createdAt: 'desc' },
            include: {
              itens: {
                include: { servico: true },
              },
            },
          },
          lembretes: {
            where: {
              tipo: 'TROCA_OLEO',
              OR: [
                // Lembrete pendente (não enviado)
                { enviado: false },
                // OU lembrete enviado nos últimos 30 dias (evita repetição)
                {
                  enviado: true,
                  dataEnvio: { gte: trintaDiasAtras },
                },
              ],
            },
          },
        },
      });

      for (const veiculo of veiculos) {
        // Pular se já tem lembrete pendente OU enviado recentemente
        if (veiculo.lembretes.length > 0) {
          const temPendente = veiculo.lembretes.some(l => !l.enviado);
          const temRecente = veiculo.lembretes.some(l => l.enviado);
          console.log(`[CRON LEMBRETES] Pulando veículo ${veiculo.id} - ${temPendente ? 'tem lembrete pendente' : 'já enviou nos últimos 30 dias'}`);
          continue;
        }

        const kmAtual = veiculo.kmAtual!;
        const kmInicial = veiculo.kmInicial || kmAtual; // Fallback para veículos antigos
        const ultimaOrdem = veiculo.ordens[0];

        let proximaTroca: number;
        if (ultimaOrdem?.kmEntrada) {
          const temTrocaOleo = ultimaOrdem.itens.some(
            item => item.servico.categoria === 'TROCA_OLEO'
          );
          proximaTroca = temTrocaOleo
            ? ultimaOrdem.kmEntrada + 5000
            : kmInicial + 5000;
        } else {
          // Sem histórico, usar km inicial do cadastro + 5000
          proximaTroca = kmInicial + 5000;
        }

        const kmRestantes = proximaTroca - kmAtual;

        if (kmRestantes <= kmAntecedencia && kmRestantes > -1000) {
          await prisma.lembrete.create({
            data: {
              veiculoId: veiculo.id,
              tipo: 'TROCA_OLEO',
              dataLembrete: new Date(),
              kmLembrete: proximaTroca,
              mensagem: null,
              empresaId,
            },
          });
          resultadoGeral.lembretesGerados++;
        }
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
        });
        grupo.lembreteIds.push(lembrete.id);
      }

      // Enviar mensagens
      for (const [telefone, grupo] of gruposPorCliente) {
        const mensagem = gerarMensagem(grupo);

        try {
          const enviado = await sendWhatsAppMessage(
            token,
            telefone,
            mensagem,
            empresaId,
            grupo.clienteNome
          );

          if (enviado) {
            // Marcar como enviado imediatamente após sucesso
            try {
              await prisma.lembrete.updateMany({
                where: { id: { in: grupo.lembreteIds } },
                data: {
                  enviado: true,
                  dataEnvio: new Date(),
                },
              });
              resultadoGeral.mensagensEnviadas++;
              console.log(`[CRON LEMBRETES] Mensagem enviada para ${telefone} (${grupo.lembreteIds.length} lembretes)`);
            } catch (dbError: any) {
              // CRÍTICO: Mensagem foi enviada mas DB falhou - logar para investigar
              console.error(`[CRON LEMBRETES] CRÍTICO: Mensagem enviada para ${telefone} mas DB falhou:`, dbError?.message);
              resultadoGeral.mensagensEnviadas++; // Contamos como enviada
            }
          } else {
            console.log(`[CRON LEMBRETES] Falha ao enviar para ${telefone}`);
            resultadoGeral.falhas++;
          }
        } catch (sendError: any) {
          console.error(`[CRON LEMBRETES] Erro ao processar ${telefone}:`, sendError?.message);
          resultadoGeral.falhas++;
        }

        // Delay entre envios para não sobrecarregar
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
