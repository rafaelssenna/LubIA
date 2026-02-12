import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface EmpresaConfig {
  nomeOficina?: string | null;
  cnpj?: string | null;
  telefone?: string | null;
  endereco?: string | null;
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
  const margin = 14;

  // Usar dados da empresa ou fallback
  const config = {
    nome: empresaConfig?.nomeOficina || DEFAULT_CONFIG.nome,
    subtitulo: DEFAULT_CONFIG.subtitulo,
    cnpj: empresaConfig?.cnpj || DEFAULT_CONFIG.cnpj,
    telefone: empresaConfig?.telefone || DEFAULT_CONFIG.telefone,
    endereco: empresaConfig?.endereco || DEFAULT_CONFIG.endereco,
  };

  // ============ HEADER ============
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Logo/Nome da oficina
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(config.nome, margin, 18);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(config.subtitulo, margin, 26);

  // Dados da oficina no header (só mostra se tiver valor)
  doc.setFontSize(8);
  if (config.cnpj) {
    doc.text(`CNPJ: ${config.cnpj}`, margin, 34);
  }
  if (config.telefone) {
    doc.text(`Tel: ${config.telefone}`, margin, 40);
  }

  // O.S. Number (lado direito)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDEM DE SERVIÇO', pageWidth - margin, 14, { align: 'right' });

  doc.setFontSize(20);
  doc.text(`#${ordem.numero.slice(-8).toUpperCase()}`, pageWidth - margin, 26, { align: 'right' });

  // Status badge
  const statusText = statusLabels[ordem.status] || ordem.status;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Status: ${statusText}`, pageWidth - margin, 36, { align: 'right' });

  // Data de emissão
  doc.setFontSize(8);
  doc.text(`Emitida: ${formatDateTime(ordem.createdAt)}`, pageWidth - margin, 42, { align: 'right' });

  let yPos = 55;

  // ============ DADOS DO CLIENTE ============
  doc.setTextColor(34, 197, 94);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', margin, yPos);

  yPos += 3;
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 8;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Nome (pode ser longo, então usa linha inteira)
  doc.setFont('helvetica', 'bold');
  doc.text('Nome:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  const nomeCliente = truncateText(ordem.veiculo.cliente.nome, 70);
  doc.text(nomeCliente, margin + 18, yPos);

  yPos += 7;

  // Telefone na linha de baixo
  doc.setFont('helvetica', 'bold');
  doc.text('Telefone:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(formatPhone(ordem.veiculo.cliente.telefone), margin + 25, yPos);

  // Email ao lado do telefone (se existir)
  if (ordem.veiculo.cliente.email) {
    doc.setFont('helvetica', 'bold');
    doc.text('Email:', pageWidth / 2, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(ordem.veiculo.cliente.email, pageWidth / 2 + 18, yPos);
  }

  yPos += 10;

  // ============ DADOS DO VEÍCULO ============
  doc.setTextColor(34, 197, 94);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO VEÍCULO', margin, yPos);

  yPos += 3;
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 8;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);

  // Placa com destaque
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(margin, yPos - 5, 50, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(ordem.veiculo.placa, margin + 25, yPos + 4, { align: 'center' });

  // Veículo info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Veículo:', margin + 60, yPos);
  doc.setFont('helvetica', 'normal');
  const veiculoInfo = `${ordem.veiculo.marca} ${ordem.veiculo.modelo}${ordem.veiculo.ano ? ` (${ordem.veiculo.ano})` : ''}`;
  doc.text(veiculoInfo, margin + 60 + 22, yPos);

  // KM se disponível
  if (ordem.kmEntrada) {
    doc.setFont('helvetica', 'bold');
    doc.text('KM:', margin + 60, yPos + 8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${ordem.kmEntrada.toLocaleString('pt-BR')} km`, margin + 60 + 12, yPos + 8);
  }

  yPos += 22;

  // ============ DATAS ============
  if (ordem.dataInicio || ordem.dataConclusao) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos - 2, pageWidth - margin * 2, 16, 2, 2, 'F');

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);

    let xOffset = margin + 5;
    if (ordem.dataInicio) {
      doc.setFont('helvetica', 'bold');
      doc.text('Iniciada:', xOffset, yPos + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDateTime(ordem.dataInicio), xOffset + 22, yPos + 8);
      xOffset += 75;
    }
    if (ordem.dataConclusao) {
      doc.setFont('helvetica', 'bold');
      doc.text('Concluída:', xOffset, yPos + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDateTime(ordem.dataConclusao), xOffset + 26, yPos + 8);
    }

    yPos += 22;
  }

  // ============ SERVIÇOS EXTRAS ============
  if (ordem.servicosExtras && ordem.servicosExtras.length > 0) {
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVIÇOS EXTRAS (MÃO DE OBRA)', margin, yPos);

    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Descrição do Serviço', 'Valor']],
      body: ordem.servicosExtras.map(item => [
        item.descricao,
        formatCurrency(item.valor),
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [34, 197, 94],
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
        fillColor: [248, 250, 252],
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // ============ PRODUTOS ============
  if (ordem.itensProduto && ordem.itensProduto.length > 0) {
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('PEÇAS E PRODUTOS', margin, yPos);

    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Descrição do Produto', 'Qtd', 'Valor Unit.', 'Subtotal']],
      body: ordem.itensProduto.map(item => [
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
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // ============ OBSERVAÇÕES ============
  if (ordem.observacoes) {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES', margin, yPos);

    yPos += 5;
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(251, 191, 36);
    doc.setLineWidth(0.3);

    const splitText = doc.splitTextToSize(ordem.observacoes, pageWidth - margin * 2 - 10);
    const obsHeight = splitText.length * 5 + 8;
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, obsHeight, 2, 2, 'FD');

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(splitText, margin + 5, yPos + 6);

    yPos += obsHeight + 8;
  }

  // ============ TOTAL ============
  // Se não tem serviços nem produtos, adiciona mensagem
  const hasItems = (ordem.servicosExtras && ordem.servicosExtras.length > 0) ||
                   (ordem.itensProduto && ordem.itensProduto.length > 0);

  if (!hasItems && ordem.total > 0) {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('(Serviços e valores a serem definidos)', margin, yPos);
    yPos += 10;
  }

  yPos += 5;

  // Box do total (alinhado à direita)
  const totalBoxWidth = 90;
  const totalBoxX = pageWidth - margin - totalBoxWidth;

  doc.setFillColor(34, 197, 94);
  doc.roundedRect(totalBoxX, yPos, totalBoxWidth, 28, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL A PAGAR', totalBoxX + totalBoxWidth / 2, yPos + 10, { align: 'center' });

  doc.setFontSize(18);
  doc.text(formatCurrency(ordem.total), totalBoxX + totalBoxWidth / 2, yPos + 22, { align: 'center' });

  yPos += 40;

  // ============ ASSINATURA ============
  // Posicionar assinatura logo após o total, mas garantir espaço para footer
  const signatureY = Math.min(yPos, pageHeight - 55);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Declaro que os serviços acima foram executados conforme solicitado.', margin, signatureY);

  // Linha de assinatura cliente
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margin, signatureY + 20, margin + 70, signatureY + 20);
  doc.setFontSize(9);
  doc.text('Assinatura do Cliente', margin + 35, signatureY + 27, { align: 'center' });

  // Data (no meio)
  doc.line(pageWidth / 2 - 30, signatureY + 20, pageWidth / 2 + 30, signatureY + 20);
  doc.text('Data: ____/____/____', pageWidth / 2, signatureY + 27, { align: 'center' });

  // Linha de assinatura oficina
  doc.line(pageWidth - margin - 70, signatureY + 20, pageWidth - margin, signatureY + 20);
  doc.text('Carimbo/Assinatura', pageWidth - margin - 35, signatureY + 27, { align: 'center' });

  // ============ FOOTER ============
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
