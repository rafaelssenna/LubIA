import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface EmpresaConfig {
  nomeOficina?: string | null;
  cnpj?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  logo?: string | null;
  pdfCorOS?: string | null;
  pdfCorOrcamento?: string | null;
}

// Converter hex (#rrggbb) para [r, g, b]
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

interface OrdemPDF {
  id: number;
  numero: string;
  status: string;
  dataAgendada: string | null;
  dataInicio: string | null;
  dataConclusao: string | null;
  kmEntrada: number | null;
  observacoes: string | null;
  total: number;
  createdAt: string;
  veiculo: {
    placa: string;
    marca: string;
    modelo: string;
    ano: number | null;
    cliente: {
      nome: string;
      telefone: string;
      email?: string | null;
    };
  };
  servicosExtras: {
    descricao: string;
    valor: number;
  }[];
  itensProduto: {
    produtoNome: string;
    ncm?: string | null;
    cfop?: string | null;
    quantidade: number;
    precoUnitario: number;
    subtotal: number;
  }[];
}

// Configuração padrão (fallback)
const DEFAULT_CONFIG = {
  nome: 'Oficina',
  subtitulo: 'Centro Automotivo',
  cnpj: '',
  telefone: '',
  endereco: '',
};

const statusLabels: Record<string, string> = {
  AGENDADO: 'Agendado',
  AGUARDANDO_PECAS: 'Aguardando Peças',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
  ENTREGUE: 'Entregue',
};

const formatDateTime = (date: string | null) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('pt-BR');
};

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Formatar telefone para exibição
const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    // Com código do país: 5531971206977
    return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    // Com código do país (fixo): 553171206977
    return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
  }
  return phone;
};

// Truncar texto longo
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

export function generateOrdemPDF(ordem: OrdemPDF, empresaConfig?: EmpresaConfig) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const footerSpace = 15;

  // Usar dados da empresa ou fallback
  const config = {
    nome: empresaConfig?.nomeOficina || DEFAULT_CONFIG.nome,
    cnpj: empresaConfig?.cnpj || DEFAULT_CONFIG.cnpj,
    telefone: empresaConfig?.telefone || DEFAULT_CONFIG.telefone,
    endereco: empresaConfig?.endereco || DEFAULT_CONFIG.endereco,
  };

  const osColor = hexToRgb(empresaConfig?.pdfCorOS || '#22c55e');
  const lineColor: [number, number, number] = [180, 180, 180];

  // Helper: verifica se precisa de nova página
  const checkPageBreak = (yPos: number, neededSpace: number): number => {
    if (yPos + neededSpace > pageHeight - footerSpace) {
      doc.addPage();
      return 12;
    }
    return yPos;
  };

  // Helper: desenha uma célula de tabela com borda
  const drawCell = (x: number, y: number, w: number, h: number, label: string, value: string, labelBold = true) => {
    doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, h);
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', labelBold ? 'bold' : 'normal');
    doc.text(label, x + 2, y + 4);
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    const truncated = truncateText(value, Math.floor(w / 2));
    doc.text(truncated, x + 2, y + h - 2);
  };

  // Helper: barra de seção (título com fundo colorido)
  const drawSectionBar = (y: number, title: string): number => {
    doc.setFillColor(osColor[0], osColor[1], osColor[2]);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, y + 4.5, { align: 'center' });
    return y + 6;
  };

  // Helper: desenha footer
  const drawFooter = () => {
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(6);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, pageHeight - 4, { align: 'center' });
  };

  let yPos = margin;

  // ============ HEADER: Logo + Nome da empresa + O.S. info ============
  const hasLogo = !!empresaConfig?.logo;
  let logoDrawW = 0, logoDrawH = 0;

  if (hasLogo && empresaConfig?.logo) {
    try {
      const imgProps = doc.getImageProperties(empresaConfig.logo);
      const maxW = 25, maxH = 18;
      const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
      logoDrawW = imgProps.width * ratio;
      logoDrawH = imgProps.height * ratio;
    } catch {
      logoDrawW = 0;
    }
  }

  // Header box with border
  const headerH = 22;
  doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos, contentWidth, headerH);

  // Logo (left)
  let textStartX = margin + 3;
  if (hasLogo && empresaConfig?.logo && logoDrawW > 0) {
    try {
      const logoFormat = empresaConfig.logo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(empresaConfig.logo, logoFormat, margin + 2, yPos + 2, logoDrawW, logoDrawH);
      textStartX = margin + logoDrawW + 5;
    } catch { /* ignore */ }
  }

  // Company name + info (center-left)
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(config.nome, textStartX, yPos + 8);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  const infoParts = [
    config.cnpj ? `CNPJ: ${config.cnpj}` : '',
    config.telefone ? `Tel: ${formatPhone(config.telefone)}` : '',
  ].filter(Boolean);
  if (infoParts.length > 0) doc.text(infoParts.join('  |  '), textStartX, yPos + 13);
  if (config.endereco) doc.text(config.endereco, textStartX, yPos + 17);

  // O.S. title + number (right side)
  doc.setFillColor(osColor[0], osColor[1], osColor[2]);
  const osBoxW = 55;
  doc.rect(pageWidth - margin - osBoxW, yPos, osBoxW, headerH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Ordem de Serviço', pageWidth - margin - osBoxW / 2, yPos + 8, { align: 'center' });
  doc.setFontSize(7);
  doc.text(`Pág. 1 de 1`, pageWidth - margin - osBoxW / 2, yPos + 13, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`${statusLabels[ordem.status] || ordem.status}`, pageWidth - margin - osBoxW / 2, yPos + 18, { align: 'center' });

  yPos += headerH;

  // ============ SEÇÃO: Ordem de Serviço ============
  yPos = drawSectionBar(yPos, 'Ordem de Serviço');

  // Row 1: Nº | Data
  const row1H = 10;
  const col1W = contentWidth * 0.35;
  const col2W = contentWidth * 0.65;
  drawCell(margin, yPos, col1W, row1H, 'Nº', ordem.numero.slice(-8).toUpperCase());
  drawCell(margin + col1W, yPos, col2W, row1H, 'Data', formatDateTime(ordem.createdAt));
  yPos += row1H;

  // Row 2: Cliente
  drawCell(margin, yPos, contentWidth, row1H, 'Cliente', ordem.veiculo.cliente.nome);
  yPos += row1H;

  // Row 3: Telefone | Email
  drawCell(margin, yPos, col1W, row1H, 'Telefone', formatPhone(ordem.veiculo.cliente.telefone));
  drawCell(margin + col1W, yPos, col2W, row1H, 'Email', ordem.veiculo.cliente.email || '-');
  yPos += row1H;

  // ============ SEÇÃO: Veículo ============
  yPos = drawSectionBar(yPos, 'Veículo');

  // Row 1: Placa | Marca | Modelo
  const vCol1 = contentWidth * 0.25;
  const vCol2 = contentWidth * 0.35;
  const vCol3 = contentWidth * 0.40;
  drawCell(margin, yPos, vCol1, row1H, 'Placa', ordem.veiculo.placa);
  drawCell(margin + vCol1, yPos, vCol2, row1H, 'Marca', ordem.veiculo.marca);
  drawCell(margin + vCol1 + vCol2, yPos, vCol3, row1H, 'Modelo', ordem.veiculo.modelo);
  yPos += row1H;

  // Row 2: Ano | KM
  const vCol4 = contentWidth * 0.25;
  const vCol5 = contentWidth * 0.25;
  const vCol6 = contentWidth * 0.50;
  drawCell(margin, yPos, vCol4, row1H, 'Ano', ordem.veiculo.ano ? String(ordem.veiculo.ano) : '-');
  drawCell(margin + vCol4, yPos, vCol5, row1H, 'KM Entrada', ordem.kmEntrada ? `${ordem.kmEntrada.toLocaleString('pt-BR')} km` : '-');

  // Datas no mesmo row
  const dataInicio = ordem.dataInicio ? formatDateTime(ordem.dataInicio) : '-';
  const dataConclusao = ordem.dataConclusao ? formatDateTime(ordem.dataConclusao) : '-';
  drawCell(margin + vCol4 + vCol5, yPos, vCol6, row1H, 'Início / Conclusão', `${dataInicio}  →  ${dataConclusao}`);
  yPos += row1H;

  // ============ OBSERVAÇÕES (inline, compacto) ============
  if (ordem.observacoes) {
    const obsH = 12;
    drawCell(margin, yPos, contentWidth, obsH, 'Observações', ordem.observacoes);
    yPos += obsH;
  }

  // ============ SEÇÃO: Serviços (Mão de obra) ============
  if (ordem.servicosExtras && ordem.servicosExtras.length > 0) {
    yPos = checkPageBreak(yPos, 25);
    yPos = drawSectionBar(yPos, 'Serviços (Mão de Obra)');

    const totalServicos = ordem.servicosExtras.reduce((acc, s) => acc + s.valor, 0);

    autoTable(doc, {
      startY: yPos,
      head: [['Descrição', 'Valor']],
      body: [
        ...ordem.servicosExtras.map(item => [
          item.descricao,
          formatCurrency(item.valor),
        ]),
        [{ content: 'Subtotal Serviços', styles: { fontStyle: 'bold', halign: 'right' } }, { content: formatCurrency(totalServicos), styles: { fontStyle: 'bold' } }],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [osColor[0], osColor[1], osColor[2]],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 2,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [lineColor[0], lineColor[1], lineColor[2]],
        lineWidth: 0.3,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: margin, right: margin, bottom: footerSpace },
    });

    yPos = (doc as any).lastAutoTable.finalY;
  }

  // ============ SEÇÃO: Peças ============
  if (ordem.itensProduto && ordem.itensProduto.length > 0) {
    yPos = checkPageBreak(yPos, 25);
    yPos = drawSectionBar(yPos, 'Peças');

    const totalPecas = ordem.itensProduto.reduce((acc, p) => acc + p.subtotal, 0);

    autoTable(doc, {
      startY: yPos,
      head: [['Descrição', 'Qtd', 'Preço Unit.', 'Valor']],
      body: [
        ...ordem.itensProduto.map(item => {
          let desc = item.produtoNome;
          const fiscal = [item.ncm && `NCM: ${item.ncm}`, item.cfop && `CFOP: ${item.cfop}`].filter(Boolean).join(' | ');
          if (fiscal) desc += `\n${fiscal}`;
          return [
            desc,
            item.quantidade.toString(),
            formatCurrency(item.precoUnitario),
            formatCurrency(item.subtotal),
          ];
        }),
        [{ content: 'Subtotal Peças', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } }, { content: formatCurrency(totalPecas), styles: { fontStyle: 'bold' } }],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [osColor[0], osColor[1], osColor[2]],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 2,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [lineColor[0], lineColor[1], lineColor[2]],
        lineWidth: 0.3,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 28, halign: 'right' },
      },
      margin: { left: margin, right: margin, bottom: footerSpace },
    });

    yPos = (doc as any).lastAutoTable.finalY;
  }

  // ============ TOTAL GERAL ============
  yPos = checkPageBreak(yPos, 20);

  // Total row (full width, colored)
  doc.setFillColor(osColor[0], osColor[1], osColor[2]);
  doc.rect(margin, yPos, contentWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', margin + 5, yPos + 7);
  doc.setFontSize(12);
  doc.text(formatCurrency(ordem.total), pageWidth - margin - 5, yPos + 7, { align: 'right' });

  yPos += 16;

  // ============ FECHAMENTO E ASSINATURAS ============
  yPos = checkPageBreak(yPos, 40);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data do fechamento da OS: ____/____/____`, margin, yPos);

  yPos += 8;
  doc.setFontSize(8);
  doc.text('Confirmo a realização dos serviços descritos e o uso das peças relacionadas:', pageWidth / 2, yPos, { align: 'center' });

  yPos += 15;

  // Signature lines
  doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
  doc.setLineWidth(0.3);

  const sigWidth = 70;
  const sig1X = margin + 10;
  const sig2X = pageWidth - margin - sigWidth - 10;

  doc.line(sig1X, yPos, sig1X + sigWidth, yPos);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('Cliente', sig1X + sigWidth / 2, yPos + 4, { align: 'center' });

  doc.line(sig2X, yPos, sig2X + sigWidth, yPos);
  doc.text('Responsável / Oficina', sig2X + sigWidth / 2, yPos + 4, { align: 'center' });

  // ============ FOOTER ============
  drawFooter();

  return doc;
}

export function downloadOrdemPDF(ordem: OrdemPDF, empresaConfig?: EmpresaConfig) {
  const doc = generateOrdemPDF(ordem, empresaConfig);
  doc.save(`OS_${ordem.numero.slice(-8).toUpperCase()}.pdf`);
}

export function openOrdemPDF(ordem: OrdemPDF, empresaConfig?: EmpresaConfig) {
  const doc = generateOrdemPDF(ordem, empresaConfig);
  window.open(doc.output('bloburl'), '_blank');
}

// ============ ORÇAMENTO PDF ============

interface OrcamentoPDF {
  id: number;
  numero: string;
  nomeCliente?: string | null;
  telefoneCliente?: string | null;
  status: string;
  observacoes: string | null;
  total: number;
  createdAt: string;
  servicosExtras: {
    descricao: string;
    valor: number;
  }[];
  itensProduto: {
    produtoNome: string;
    ncm?: string | null;
    cfop?: string | null;
    quantidade: number;
    precoUnitario: number;
    subtotal: number;
  }[];
}

const statusOrcamentoLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  RECUSADO: 'Recusado',
  EXPIRADO: 'Expirado',
  CONVERTIDO: 'Convertido em O.S.',
};

export function generateOrcamentoPDF(orcamento: OrcamentoPDF, empresaConfig?: EmpresaConfig) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const footerSpace = 20;

  const checkPageBreak = (yPos: number, neededSpace: number): number => {
    if (yPos + neededSpace > pageHeight - footerSpace) {
      doc.addPage();
      return 20;
    }
    return yPos;
  };

  const drawFooter = () => {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(7);
    const footerParts = [config.endereco, config.telefone].filter(Boolean);
    if (footerParts.length > 0) {
      doc.text(footerParts.join(' | '), pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
  };

  // Usar dados da empresa ou fallback
  const config = {
    nome: empresaConfig?.nomeOficina || DEFAULT_CONFIG.nome,
    subtitulo: DEFAULT_CONFIG.subtitulo,
    cnpj: empresaConfig?.cnpj || DEFAULT_CONFIG.cnpj,
    telefone: empresaConfig?.telefone || DEFAULT_CONFIG.telefone,
    endereco: empresaConfig?.endereco || DEFAULT_CONFIG.endereco,
  };

  // Cor customizada do Orçamento
  const orcColor = hexToRgb(empresaConfig?.pdfCorOrcamento || '#e85d04');

  // ============ HEADER ============
  const orcHasLogo = !!empresaConfig?.logo;

  let orcLogoW = 0, orcLogoH = 0, orcLogoAreaH = 0;
  if (orcHasLogo && empresaConfig?.logo) {
    try {
      const imgProps = doc.getImageProperties(empresaConfig.logo);
      const maxW = 60, maxH = 30;
      const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
      orcLogoW = imgProps.width * ratio;
      orcLogoH = imgProps.height * ratio;
      orcLogoAreaH = orcLogoH + 8;
    } catch {
      orcLogoAreaH = 0;
    }
  }

  const orcTextBarHeight = config.endereco ? 52 : 45;
  const orcHeaderHeight = orcLogoAreaH + orcTextBarHeight;

  // Barra colorida ocupa todo o header (logo + texto)
  doc.setFillColor(orcColor[0], orcColor[1], orcColor[2]);
  doc.rect(0, 0, pageWidth, orcHeaderHeight, 'F');

  // Logo centralizada no topo da barra (proporção real)
  if (orcHasLogo && empresaConfig?.logo && orcLogoW > 0) {
    try {
      const orcLogoFormat = empresaConfig.logo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      const orcLogoX = (pageWidth - orcLogoW) / 2;
      doc.addImage(empresaConfig.logo, orcLogoFormat, orcLogoX, 4, orcLogoW, orcLogoH);
    } catch {
      // Se a imagem falhar, ignora silenciosamente
    }
  }

  // Nome da oficina (abaixo da logo)
  const orcTextTop = orcLogoAreaH;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(config.nome, margin, orcTextTop + 18);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(config.subtitulo, margin, orcTextTop + 26);

  // Dados da oficina no header
  doc.setFontSize(8);
  const orcInfoParts = [
    config.cnpj ? `CNPJ: ${config.cnpj}` : '',
    config.telefone ? `Tel: ${formatPhone(config.telefone)}` : '',
  ].filter(Boolean);
  if (orcInfoParts.length > 0) {
    doc.text(orcInfoParts.join('  |  '), margin, orcTextTop + 34);
  }
  if (config.endereco) {
    doc.text(config.endereco, margin, orcTextTop + 40);
  }

  // Orçamento Number (lado direito)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ORÇAMENTO', pageWidth - margin, orcTextTop + 14, { align: 'right' });

  doc.setFontSize(20);
  doc.text(orcamento.numero, pageWidth - margin, orcTextTop + 26, { align: 'right' });

  // Status badge
  const statusText = statusOrcamentoLabels[orcamento.status] || orcamento.status;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Status: ${statusText}`, pageWidth - margin, orcTextTop + 36, { align: 'right' });

  // Data de emissão
  doc.setFontSize(8);
  doc.text(`Emitido: ${formatDateTime(orcamento.createdAt)}`, pageWidth - margin, orcTextTop + 42, { align: 'right' });

  let yPos = orcHeaderHeight + 10;

  // ============ DADOS DO CLIENTE ============
  if (orcamento.nomeCliente || orcamento.telefoneCliente) {
    doc.setTextColor(orcColor[0], orcColor[1], orcColor[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CLIENTE', margin, yPos);

    yPos += 3;
    doc.setDrawColor(orcColor[0], orcColor[1], orcColor[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 8;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Nome
    if (orcamento.nomeCliente) {
      doc.setFont('helvetica', 'bold');
      doc.text('Nome:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      const nomeCliente = truncateText(orcamento.nomeCliente, 70);
      doc.text(nomeCliente, margin + 18, yPos);
      yPos += 7;
    }

    // Telefone
    if (orcamento.telefoneCliente) {
      doc.setFont('helvetica', 'bold');
      doc.text('WhatsApp:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(formatPhone(orcamento.telefoneCliente), margin + 28, yPos);
      yPos += 7;
    }

    yPos += 5;
  }

  // ============ SERVIÇOS EXTRAS ============
  if (orcamento.servicosExtras && orcamento.servicosExtras.length > 0) {
    yPos = checkPageBreak(yPos, 30);
    doc.setTextColor(orcColor[0], orcColor[1], orcColor[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVIÇOS / MÃO DE OBRA', margin, yPos);

    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Descrição do Serviço', 'Valor']],
      body: orcamento.servicosExtras.map(item => [
        item.descricao,
        formatCurrency(item.valor),
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [orcColor[0], orcColor[1], orcColor[2]],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: {
        fillColor: [255, 250, 245],
      },
      margin: { bottom: footerSpace },
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // ============ PRODUTOS ============
  if (orcamento.itensProduto && orcamento.itensProduto.length > 0) {
    yPos = checkPageBreak(yPos, 30);
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('PEÇAS E PRODUTOS', margin, yPos);

    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Descrição do Produto', 'Qtd', 'Valor Unit.', 'Subtotal']],
      body: orcamento.itensProduto.map(item => [
        item.produtoNome,
        item.quantidade.toString(),
        formatCurrency(item.precoUnitario),
        formatCurrency(item.subtotal),
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 32, halign: 'right' },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { bottom: footerSpace },
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // ============ OBSERVAÇÕES ============
  if (orcamento.observacoes) {
    const splitText = doc.splitTextToSize(orcamento.observacoes, pageWidth - margin * 2 - 10);
    const obsHeight = splitText.length * 5 + 8;
    yPos = checkPageBreak(yPos, obsHeight + 20);

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES', margin, yPos);

    yPos += 5;
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(251, 191, 36);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, obsHeight, 2, 2, 'FD');

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(splitText, margin + 5, yPos + 6);

    yPos += obsHeight + 8;
  }

  // ============ TOTAL + TERMOS ============
  // Garantir espaço para total (28) + termos (15) + footer (20) = 63
  yPos = checkPageBreak(yPos, 65);
  yPos += 5;

  // Box do total (alinhado à direita)
  const totalBoxWidth = 90;
  const totalBoxX = pageWidth - margin - totalBoxWidth;

  doc.setFillColor(orcColor[0], orcColor[1], orcColor[2]);
  doc.roundedRect(totalBoxX, yPos, totalBoxWidth, 28, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR TOTAL', totalBoxX + totalBoxWidth / 2, yPos + 10, { align: 'center' });

  doc.setFontSize(18);
  doc.text(formatCurrency(orcamento.total), totalBoxX + totalBoxWidth / 2, yPos + 22, { align: 'center' });

  yPos += 40;

  // ============ TERMOS ============
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Este orçamento não tem valor fiscal. Valores sujeitos a alteração sem aviso prévio.', margin, yPos);
  doc.text('Orçamento válido mediante aprovação do cliente.', margin, yPos + 5);

  // ============ FOOTER ============
  drawFooter();

  return doc;
}

export function downloadOrcamentoPDF(orcamento: OrcamentoPDF, empresaConfig?: EmpresaConfig) {
  const doc = generateOrcamentoPDF(orcamento, empresaConfig);
  doc.save(`${orcamento.numero}.pdf`);
}

export function openOrcamentoPDF(orcamento: OrcamentoPDF, empresaConfig?: EmpresaConfig) {
  const doc = generateOrcamentoPDF(orcamento, empresaConfig);
  window.open(doc.output('bloburl'), '_blank');
}
