import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET - Detalhes de uma NF-e
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const nfeId = parseInt(id);

    const nota = await prisma.notaFiscal.findFirst({
      where: { id: nfeId, empresaId: session.empresaId },
      include: {
        ordemServico: {
          select: {
            numero: true,
            total: true,
            veiculo: {
              select: {
                placa: true,
                modelo: true,
                cliente: {
                  select: { nome: true, cpf: true },
                },
              },
            },
          },
        },
        vendaRapida: {
          select: {
            numero: true,
            total: true,
            nomeCliente: true,
          },
        },
      },
    });

    if (!nota) {
      return NextResponse.json({ error: 'Nota fiscal não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ data: nota });
  } catch (error: any) {
    console.error('[NFE ID GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar nota fiscal' }, { status: 500 });
  }
}
