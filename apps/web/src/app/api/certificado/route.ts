import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET - Status do certificado digital
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const cert = await prisma.certificadoDigital.findUnique({
      where: { empresaId: session.empresaId },
    });

    if (!cert) {
      return NextResponse.json({
        data: { exists: false },
      });
    }

    return NextResponse.json({
      data: {
        exists: true,
        validade: cert.validade,
        expirado: new Date(cert.validade) < new Date(),
        criadoEm: cert.criadoEm,
      },
    });
  } catch (error: any) {
    console.error('[CERTIFICADO GET] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar certificado' }, { status: 500 });
  }
}

// POST - Upload do certificado digital A1
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const arquivo = formData.get('arquivo') as File | null;
    const senha = formData.get('senha') as string | null;

    if (!arquivo) {
      return NextResponse.json({ error: 'Arquivo do certificado (.pfx) é obrigatório' }, { status: 400 });
    }

    if (!senha) {
      return NextResponse.json({ error: 'Senha do certificado é obrigatória' }, { status: 400 });
    }

    // Verificar extensão
    if (!arquivo.name.endsWith('.pfx') && !arquivo.name.endsWith('.p12')) {
      return NextResponse.json({ error: 'Formato inválido. Envie um arquivo .pfx ou .p12' }, { status: 400 });
    }

    // Converter File para Buffer
    const arrayBuffer = await arquivo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Certificado A1 tem validade de 1 ano
    // A validação real da senha ocorre quando o NFeWizard tenta usar o certificado
    const validade = new Date();
    validade.setFullYear(validade.getFullYear() + 1);

    // Upsert — substitui se já existir
    await prisma.certificadoDigital.upsert({
      where: { empresaId: session.empresaId },
      create: {
        empresaId: session.empresaId,
        arquivo: buffer,
        senha,
        validade,
      },
      update: {
        arquivo: buffer,
        senha,
        validade,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        validade,
        expirado: validade < new Date(),
      },
    });
  } catch (error: any) {
    console.error('[CERTIFICADO POST] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao salvar certificado' }, { status: 500 });
  }
}
