/**
 * Módulo central NF-e — Integração com SEFAZ via NFeWizard-io
 *
 * Encapsula toda a lógica de emissão, cancelamento, inutilização e consulta de NF-e.
 * O certificado digital A1 é lido do banco (CertificadoDigital) e salvo em arquivo temporário
 * para uso pela lib.
 */

// NFeWizard é importado dinamicamente para evitar problemas com native bindings no build
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import os from 'os';

// =============================================
// TIPOS
// =============================================

export interface DadosEmitente {
  cnpj: string;
  inscricaoEstadual: string;
  razaoSocial: string;
  nomeFantasia?: string;
  endereco: string; // JSON ou string simples
  uf: string;
  regimeTributario: number; // 1=SN, 2=SN Excesso, 3=Normal
  ambiente: number; // 1=Produção, 2=Homologação
  serie: number;
  tokenCSC?: string;
  idCSC?: number;
}

export interface DadosDestinatario {
  cpf?: string;
  cnpj?: string;
  nome?: string;
  endereco?: string;
  uf?: string;
}

export interface ItemNFe {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: number;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  desconto?: number;
}

export interface DadosNFe {
  emitente: DadosEmitente;
  destinatario?: DadosDestinatario;
  itens: ItemNFe[];
  valorTotal: number;
  valorProdutos: number;
  valorServicos?: number;
  valorDesconto?: number;
  numero: number;
  formaPagamento?: string;
  valorPagamento?: number;
}

export interface ResultadoNFe {
  success: boolean;
  chaveAcesso?: string;
  protocolo?: string;
  xmlEnvio?: string;
  xmlRetorno?: string;
  danfePdf?: string; // base64 do PDF DANFE
  motivo?: string;
  cStat?: number;
}

export interface ResultadoCancelamento {
  success: boolean;
  protocolo?: string;
  motivo?: string;
}

export interface ResultadoInutilizacao {
  success: boolean;
  protocolo?: string;
  motivo?: string;
}

// =============================================
// MAPA UF → CÓDIGO IBGE
// =============================================

const UF_CODES: Record<string, number> = {
  AC: 12, AL: 27, AM: 13, AP: 16, BA: 29, CE: 23, DF: 53,
  ES: 32, GO: 52, MA: 21, MG: 31, MS: 50, MT: 51, PA: 15,
  PB: 25, PE: 26, PI: 22, PR: 41, RJ: 33, RN: 24, RO: 11,
  RR: 14, RS: 43, SC: 42, SE: 28, SP: 35, TO: 17,
};

// Mapeamento forma de pagamento do sistema → tPag SEFAZ
const FORMA_PAGAMENTO_MAP: Record<string, string> = {
  DINHEIRO: '01',
  CARTAO_DEBITO: '04',
  CARTAO_CREDITO: '03',
  PIX: '17',
  BOLETO: '15',
  TRANSFERENCIA: '18',
  CHEQUE: '02',
};

// =============================================
// FUNÇÕES AUXILIARES
// =============================================

/**
 * Salva o certificado (.pfx) do banco em arquivo temporário e retorna o caminho.
 * O arquivo é excluído após o uso pela função chamadora.
 */
async function salvarCertificadoTemp(empresaId: number): Promise<{ path: string; senha: string }> {
  const cert = await prisma.certificadoDigital.findUnique({
    where: { empresaId },
  });

  if (!cert) {
    throw new Error('Certificado digital não encontrado. Faça o upload nas configurações.');
  }

  if (new Date(cert.validade) < new Date()) {
    throw new Error('Certificado digital expirado. Faça o upload de um novo certificado.');
  }

  const tempDir = path.join(os.tmpdir(), 'lubia-nfe');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const certPath = path.join(tempDir, `cert-${empresaId}-${Date.now()}.pfx`);
  fs.writeFileSync(certPath, Buffer.from(cert.arquivo));

  return { path: certPath, senha: cert.senha };
}

/**
 * Remove o arquivo temporário do certificado.
 */
function limparCertificadoTemp(certPath: string) {
  try {
    if (fs.existsSync(certPath)) {
      fs.unlinkSync(certPath);
    }
  } catch {
    // Ignora erros de limpeza
  }
}

/**
 * Cria e configura uma instância do NFeWizard.
 */
async function criarWizard(empresaId: number, config: DadosEmitente): Promise<{ wizard: any; certPath: string }> {
  const cert = await salvarCertificadoTemp(empresaId);

  const { NFeWizard } = await import('nfewizard-io');
  const wizard = new NFeWizard();
  await wizard.NFE_LoadEnvironment({
    config: {
      dfe: {
        pathCertificado: cert.path,
        senhaCertificado: cert.senha,
        UF: config.uf,
        CPFCNPJ: config.cnpj.replace(/\D/g, ''),
        armazenarXMLAutorizacao: false,
        armazenarXMLRetorno: false,
        armazenarXMLConsulta: false,
        armazenarRetornoEmJSON: false,
      },
      nfe: {
        ambiente: config.ambiente,
        versaoDF: '4.00',
        tokenCSC: config.tokenCSC,
        idCSC: config.idCSC,
      },
      lib: {
        useForSchemaValidation: 'validateSchemaJsBased',
        connection: {
          timeout: 30000,
        },
      },
    },
  });

  return { wizard, certPath: cert.path };
}

/**
 * Gera código numérico aleatório de 8 dígitos para a chave de acesso.
 */
function gerarCodigoNumerico(): string {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

/**
 * Parseia endereço do formato string para objeto.
 * Aceita formato: "Rua X, 123 - Bairro - Cidade/UF - CEP 12345-678"
 * ou JSON: {"logradouro":"Rua X","numero":"123","bairro":"Bairro","cidade":"Cidade","uf":"SP","cep":"12345678"}
 */
function parsearEndereco(endereco: string): {
  xLgr: string;
  nro: string;
  xBairro: string;
  cMun: number;
  xMun: string;
  UF: string;
  CEP: string;
} {
  // Tenta JSON primeiro
  try {
    const json = JSON.parse(endereco);
    return {
      xLgr: json.logradouro || json.xLgr || 'Sem endereço',
      nro: json.numero || json.nro || 'S/N',
      xBairro: json.bairro || json.xBairro || 'Centro',
      cMun: json.codigoMunicipio || json.cMun || 9999999,
      xMun: json.cidade || json.xMun || 'Não informada',
      UF: json.uf || json.UF || 'SP',
      CEP: (json.cep || json.CEP || '00000000').replace(/\D/g, ''),
    };
  } catch {
    // Formato string simples — faz o melhor possível
    const partes = endereco.split(',').map(p => p.trim());
    return {
      xLgr: partes[0] || 'Sem endereço',
      nro: partes[1] || 'S/N',
      xBairro: partes[2] || 'Centro',
      cMun: 9999999,
      xMun: partes[3] || 'Não informada',
      UF: 'SP',
      CEP: '00000000',
    };
  }
}

// =============================================
// FUNÇÕES PÚBLICAS
// =============================================

/**
 * Emite NF-e na SEFAZ.
 */
export async function emitirNFe(empresaId: number, dados: DadosNFe): Promise<ResultadoNFe> {
  const { wizard, certPath } = await criarWizard(empresaId, dados.emitente);

  try {
    const cUF = UF_CODES[dados.emitente.uf] || 35;
    const cNF = gerarCodigoNumerico();
    const dhEmi = new Date().toISOString().replace('Z', '-03:00');
    const endEmit = parsearEndereco(dados.emitente.endereco);

    // Montar detalhes dos itens
    const det = dados.itens.map((item, index) => {
      const vProd = (item.quantidade * item.valorUnitario).toFixed(2);
      const vDesc = (item.desconto || 0).toFixed(2);

      return {
        nItem: String(index + 1),
        prod: {
          cProd: item.codigo,
          cEAN: 'SEM GTIN',
          xProd: dados.emitente.ambiente === 2
            ? 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
            : item.descricao,
          NCM: item.ncm.replace(/\D/g, ''),
          CFOP: item.cfop,
          uCom: item.unidade || 'UN',
          qCom: item.quantidade,
          vUnCom: item.valorUnitario.toFixed(10),
          vProd,
          cEANTrib: 'SEM GTIN',
          uTrib: item.unidade || 'UN',
          qTrib: item.quantidade,
          vUnTrib: item.valorUnitario.toFixed(10),
          vDesc: parseFloat(vDesc) > 0 ? vDesc : undefined,
          indTot: 1,
        },
        imposto: montarImpostos(dados.emitente.regimeTributario),
      };
    });

    // Montar totais
    const vProd = dados.valorProdutos.toFixed(2);
    const vDesc = (dados.valorDesconto || 0).toFixed(2);
    const vNF = dados.valorTotal.toFixed(2);

    // Montar pagamento
    const tPag = FORMA_PAGAMENTO_MAP[dados.formaPagamento || 'DINHEIRO'] || '01';

    // CRT: 1=Simples Nacional, 2=SN Excesso, 3=Normal, 4=MEI
    const CRT = dados.emitente.regimeTributario;

    const nfeData = {
      infNFe: {
        versao: '4.00' as const,
        ide: {
          cUF,
          cNF,
          natOp: 'VENDA DE MERCADORIA',
          mod: 55,
          serie: String(dados.emitente.serie),
          nNF: dados.numero,
          dhEmi,
          tpNF: 1, // Saída
          idDest: 1, // Operação interna
          cMunFG: endEmit.cMun,
          tpImp: 1, // Retrato
          tpEmis: 1, // Normal
          tpAmb: dados.emitente.ambiente,
          finNFe: 1, // Normal
          indFinal: 1, // Consumidor final
          indPres: 1, // Presencial
          procEmi: 0, // Aplicativo do contribuinte
        },
        emit: {
          CNPJCPF: dados.emitente.cnpj.replace(/\D/g, ''),
          xNome: dados.emitente.razaoSocial,
          xFant: dados.emitente.nomeFantasia || dados.emitente.razaoSocial,
          enderEmit: {
            ...endEmit,
            cPais: 1058,
            xPais: 'BRASIL',
          },
          IE: dados.emitente.inscricaoEstadual.replace(/\D/g, ''),
          CRT,
        },
        dest: montarDestinatario(dados.destinatario, dados.emitente.ambiente),
        det,
        total: {
          ICMSTot: {
            vBC: '0.00',
            vICMS: '0.00',
            vICMSDeson: '0.00',
            vFCP: '0.00',
            vBCST: '0.00',
            vST: '0.00',
            vFCPST: '0.00',
            vFCPSTRet: '0.00',
            vProd,
            vFrete: '0.00',
            vSeg: '0.00',
            vDesc,
            vII: '0.00',
            vIPI: '0.00',
            vIPIDevol: '0.00',
            vPIS: '0.00',
            vCOFINS: '0.00',
            vOutro: '0.00',
            vNF,
          },
        },
        transp: {
          modFrete: 9, // Sem frete
        },
        pag: {
          detPag: [{
            tPag,
            vPag: vNF,
          }],
        },
        infAdic: {
          infCpl: 'Documento emitido por LubIA - Sistema de Gestao de Oficinas',
        },
      },
    };

    const result = await wizard.NFE_Autorizacao(nfeData as any);

    // Interpretar resultado
    if (result?.success) {
      const xmls = result.xmls?.[0];
      const chNFe = xmls?.protNFe?.infProt?.chNFe;
      const nProt = xmls?.protNFe?.infProt?.nProt;

      // Gerar DANFE PDF
      let danfePdf: string | undefined;
      if (chNFe && xmls) {
        try {
          danfePdf = await gerarDanfePdf(xmls, chNFe);
        } catch (err: any) {
          console.error('[NFE] Erro ao gerar DANFE:', err?.message);
          // Não falha a emissão por causa do DANFE
        }
      }

      return {
        success: true,
        chaveAcesso: chNFe,
        protocolo: nProt,
        xmlEnvio: JSON.stringify(nfeData),
        xmlRetorno: JSON.stringify(result),
        danfePdf,
        motivo: xmls?.protNFe?.infProt?.xMotivo,
        cStat: xmls?.protNFe?.infProt?.cStat,
      };
    }

    // Rejeitada ou erro
    const motivo = typeof result?.xMotivo === 'string'
      ? result.xMotivo
      : JSON.stringify(result?.xMotivo || result);

    return {
      success: false,
      motivo,
      xmlEnvio: JSON.stringify(nfeData),
      xmlRetorno: JSON.stringify(result),
    };
  } finally {
    limparCertificadoTemp(certPath);
  }
}

/**
 * Consulta status de uma NF-e pela chave de acesso.
 */
export async function consultarNFe(empresaId: number, chaveAcesso: string, config: DadosEmitente): Promise<ResultadoNFe> {
  const { wizard, certPath } = await criarWizard(empresaId, config);

  try {
    const result = await wizard.NFE_ConsultaProtocolo(chaveAcesso);

    return {
      success: true,
      chaveAcesso,
      motivo: result?.infProt?.xMotivo || JSON.stringify(result),
      cStat: result?.infProt?.cStat,
      protocolo: result?.infProt?.nProt,
    };
  } finally {
    limparCertificadoTemp(certPath);
  }
}

/**
 * Cancela uma NF-e autorizada na SEFAZ.
 * Prazo máximo: até 24h após a emissão.
 */
export async function cancelarNFe(
  empresaId: number,
  chaveAcesso: string,
  protocolo: string,
  motivo: string,
  config: DadosEmitente,
): Promise<ResultadoCancelamento> {
  if (motivo.length < 15) {
    throw new Error('O motivo do cancelamento deve ter no mínimo 15 caracteres.');
  }

  const { wizard, certPath } = await criarWizard(empresaId, config);

  try {
    const cUF = UF_CODES[config.uf] || 35;
    const dhEvento = new Date().toISOString().replace('Z', '-03:00');

    const result = await wizard.NFE_Cancelamento({
      idLote: Date.now(),
      modelo: '55',
      evento: [{
        tpAmb: config.ambiente,
        cOrgao: cUF,
        CNPJ: config.cnpj.replace(/\D/g, ''),
        chNFe: chaveAcesso,
        dhEvento,
        tpEvento: '110111',
        nSeqEvento: 1,
        verEvento: '1.00',
        detEvento: {
          descEvento: 'Cancelamento',
          nProt: protocolo,
          xJust: motivo,
        },
      }],
    });

    const retEvento = Array.isArray(result) ? result[0] : result;
    const cStat = retEvento?.infEvento?.cStat || retEvento?.cStat;
    const success = cStat === 135 || cStat === 155; // 135=Evento registrado, 155=Cancelamento homologado

    return {
      success,
      protocolo: retEvento?.infEvento?.nProt,
      motivo: retEvento?.infEvento?.xMotivo || JSON.stringify(retEvento),
    };
  } finally {
    limparCertificadoTemp(certPath);
  }
}

/**
 * Inutiliza uma faixa de numeração de NF-e na SEFAZ.
 */
export async function inutilizarNFe(
  empresaId: number,
  numeroInicial: number,
  numeroFinal: number,
  motivo: string,
  config: DadosEmitente,
): Promise<ResultadoInutilizacao> {
  if (motivo.length < 15) {
    throw new Error('O motivo da inutilização deve ter no mínimo 15 caracteres.');
  }

  const { wizard, certPath } = await criarWizard(empresaId, config);

  try {
    const cUF = UF_CODES[config.uf] || 35;
    const ano = new Date().getFullYear().toString().slice(2);

    const result = await wizard.NFE_Inutilizacao({
      cUF,
      CNPJ: config.cnpj.replace(/\D/g, ''),
      ano,
      mod: '55',
      serie: String(config.serie),
      nNFIni: String(numeroInicial),
      nNFFin: String(numeroFinal),
      xJust: motivo,
    });

    const cStat = result?.infInut?.cStat;
    const success = cStat === 102; // 102=Inutilização homologada

    return {
      success,
      protocolo: result?.infInut?.nProt,
      motivo: result?.infInut?.xMotivo || JSON.stringify(result),
    };
  } finally {
    limparCertificadoTemp(certPath);
  }
}

/**
 * Verifica status do serviço SEFAZ.
 */
export async function verificarStatusSefaz(
  empresaId: number,
  config: DadosEmitente,
): Promise<{ online: boolean; motivo: string }> {
  const { wizard, certPath } = await criarWizard(empresaId, config);

  try {
    const result = await wizard.NFE_ConsultaStatusServico();
    const cStat = result?.cStat || result?.retConsStatServ?.cStat;

    return {
      online: cStat === 107, // 107=Serviço em operação
      motivo: result?.xMotivo || result?.retConsStatServ?.xMotivo || JSON.stringify(result),
    };
  } finally {
    limparCertificadoTemp(certPath);
  }
}

// =============================================
// DANFE
// =============================================

/**
 * Gera PDF do DANFE a partir dos dados da NF-e autorizada.
 * Retorna o conteúdo em base64.
 */
async function gerarDanfePdf(nfeData: any, chaveAcesso: string): Promise<string> {
  const { NFeGerarDanfe } = await import('@nfewizard/danfe');

  const tempDir = path.join(os.tmpdir(), 'lubia-danfe');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const outputPath = path.join(tempDir, `danfe-${chaveAcesso}.pdf`);

  try {
    const danfe = new NFeGerarDanfe({
      data: nfeData,
      chave: chaveAcesso,
      outputPath,
    });

    await danfe.generatePDF(false); // false = sem marca d'água

    // Ler arquivo e converter para base64
    const pdfBuffer = fs.readFileSync(outputPath);
    return pdfBuffer.toString('base64');
  } finally {
    // Limpar arquivo temporário
    try {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch {}
  }
}

/**
 * Gera DANFE a partir do XML de retorno armazenado no banco.
 * Usado quando o DANFE não foi gerado na emissão.
 */
export async function gerarDanfeFromXml(xmlRetorno: string, chaveAcesso: string): Promise<string> {
  const data = JSON.parse(xmlRetorno);
  const nfeData = data?.xmls?.[0] || data;
  return gerarDanfePdf(nfeData, chaveAcesso);
}

// =============================================
// FUNÇÕES AUXILIARES INTERNAS
// =============================================

/**
 * Monta bloco de impostos baseado no regime tributário.
 */
function montarImpostos(regimeTributario: number) {
  if (regimeTributario === 1 || regimeTributario === 2) {
    // Simples Nacional — usa CSOSN
    return {
      ICMS: {
        ICMSSN102: {
          Orig: 0, // Nacional
          CSOSN: '102', // Tributada sem permissão de crédito
        },
      },
      PIS: {
        PISOutr: {
          CST: '99',
          vBC: '0.00',
          pPIS: '0.00',
          vPIS: '0.00',
        },
      },
      COFINS: {
        COFINSOutr: {
          CST: '99',
          vBC: '0.00',
          pCOFINS: '0.00',
          vCOFINS: '0.00',
        },
      },
    };
  }

  // Regime Normal — usa CST
  return {
    ICMS: {
      ICMS00: {
        Orig: 0,
        CST: '00',
        modBC: 3,
        vBC: '0.00',
        pICMS: '0.00',
        vICMS: '0.00',
      },
    },
    PIS: {
      PISAliq: {
        CST: '01',
        vBC: '0.00',
        pPIS: '0.00',
        vPIS: '0.00',
      },
    },
    COFINS: {
      COFINSAliq: {
        CST: '01',
        vBC: '0.00',
        pCOFINS: '0.00',
        vCOFINS: '0.00',
      },
    },
  };
}

/**
 * Monta dados do destinatário.
 */
function montarDestinatario(dest?: DadosDestinatario, ambiente?: number) {
  if (!dest || (!dest.cpf && !dest.cnpj)) {
    // Consumidor final sem identificação
    return undefined;
  }

  const resultado: any = {
    indIEDest: 9, // Não contribuinte
  };

  if (dest.cnpj) {
    resultado.CNPJ = dest.cnpj.replace(/\D/g, '');
    resultado.indIEDest = 1; // Contribuinte ICMS
  } else if (dest.cpf) {
    resultado.CPF = dest.cpf.replace(/\D/g, '');
  }

  resultado.xNome = ambiente === 2
    ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
    : (dest.nome || 'CONSUMIDOR FINAL');

  if (dest.endereco) {
    resultado.enderDest = parsearEndereco(dest.endereco);
  }

  return resultado;
}

/**
 * Busca configuração NF-e da empresa a partir do banco.
 */
export async function buscarConfigNFe(empresaId: number): Promise<DadosEmitente> {
  const config = await prisma.configuracao.findFirst({
    where: { empresaId },
  });

  if (!config) {
    throw new Error('Configurações da empresa não encontradas.');
  }

  if (!config.cnpj) {
    throw new Error('CNPJ da empresa não configurado. Acesse Configurações > Dados da Oficina.');
  }

  if (!config.inscricaoEstadual) {
    throw new Error('Inscrição Estadual não configurada. Acesse Configurações > Nota Fiscal.');
  }

  if (!config.ufEmpresa) {
    throw new Error('UF da empresa não configurada. Acesse Configurações > Nota Fiscal.');
  }

  return {
    cnpj: config.cnpj,
    inscricaoEstadual: config.inscricaoEstadual,
    razaoSocial: config.nomeOficina || 'Empresa',
    endereco: config.endereco || '{}',
    uf: config.ufEmpresa,
    regimeTributario: config.regimeTributario,
    ambiente: config.nfeAmbiente,
    serie: config.nfeSerie,
    tokenCSC: config.nfeTokenCSC || undefined,
    idCSC: config.nfeIdCSC ? parseInt(config.nfeIdCSC) : undefined,
  };
}

/**
 * Próximo número de NF-e para a empresa. Incrementa automaticamente.
 */
export async function proximoNumeroNFe(empresaId: number): Promise<number> {
  const config = await prisma.configuracao.findFirst({
    where: { empresaId },
  });

  if (!config) throw new Error('Configurações não encontradas.');

  const novoNumero = config.nfeUltimoNumero + 1;

  await prisma.configuracao.update({
    where: { id: config.id },
    data: { nfeUltimoNumero: novoNumero },
  });

  return novoNumero;
}
