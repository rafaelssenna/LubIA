import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  itens: {
    servicoNome: string;
    quantidade: number;
    precoUnitario: number;
    subtotal: number;
  }[];
  itensProduto: {
    produtoNome: string;
    quantidade: number;
    precoUnitario: number;
    subtotal: number;
  }[];
}

const statusLabels: Record<string, string> = {
  AGENDADO: 'Agendado',
  AGUARDANDO_PECAS: 'Aguardando Peças',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
  ENTREGUE: 'Entregue',
};

const formatDate = (date: string | null) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
};

const formatDateTime = (date: string | null) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('pt-BR');
};

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export function generateOrdemPDF(ordem: OrdemPDF) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(34, 197, 94); // Green
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('LubIA', 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Gestão de Oficinas', 14, 28);

  // O.S. Number
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`O.S. #${ordem.numero.slice(-8).toUpperCase()}`, pageWidth - 14, 20, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Status: ${statusLabels[ordem.status] || ordem.status}`, pageWidth - 14, 28, { align: 'right' });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  let yPos = 50;

  // Client and Vehicle Info
  doc.setFillColor(245, 245, 245);
  doc.rect(14, yPos, pageWidth - 28, 35, 'F');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Informações do Cliente e Veículo', 18, yPos + 8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.text(`Cliente: ${ordem.veiculo.cliente.nome}`, 18, yPos + 18);
  doc.text(`Telefone: ${ordem.veiculo.cliente.telefone}`, 18, yPos + 26);

  doc.text(`Veículo: ${ordem.veiculo.marca} ${ordem.veiculo.modelo}${ordem.veiculo.ano ? ` (${ordem.veiculo.ano})` : ''}`, pageWidth / 2 + 5, yPos + 18);
  doc.text(`Placa: ${ordem.veiculo.placa}`, pageWidth / 2 + 5, yPos + 26);

  yPos += 45;

  // Dates Info
  doc.setFillColor(245, 245, 245);
  doc.rect(14, yPos, pageWidth - 28, 25, 'F');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Datas', 18, yPos + 8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.text(`Criada: ${formatDateTime(ordem.createdAt)}`, 18, yPos + 18);
  if (ordem.dataInicio) {
    doc.text(`Iniciada: ${formatDateTime(ordem.dataInicio)}`, pageWidth / 3, yPos + 18);
  }
  if (ordem.dataConclusao) {
    doc.text(`Concluída: ${formatDateTime(ordem.dataConclusao)}`, (pageWidth / 3) * 2, yPos + 18);
  }
  if (ordem.kmEntrada) {
    doc.text(`KM Entrada: ${ordem.kmEntrada.toLocaleString('pt-BR')} km`, 18, yPos + 26);
  }

  yPos += 35;

  // Services Table
  if (ordem.itens && ordem.itens.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Serviços', 14, yPos);

    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Serviço', 'Qtd', 'Valor Unit.', 'Subtotal']],
      body: ordem.itens.map(item => [
        item.servicoNome,
        item.quantidade.toString(),
        formatCurrency(item.precoUnitario),
        formatCurrency(item.subtotal),
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [34, 197, 94],
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Products Table
  if (ordem.itensProduto && ordem.itensProduto.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Produtos', 14, yPos);

    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Produto', 'Qtd', 'Valor Unit.', 'Subtotal']],
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
      },
      styles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Observations
  if (ordem.observacoes) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações', 14, yPos);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(ordem.observacoes, pageWidth - 28);
    doc.text(splitText, 14, yPos + 8);

    yPos += 8 + splitText.length * 5;
  }

  // Total
  yPos += 5;
  doc.setFillColor(34, 197, 94);
  doc.rect(pageWidth - 80, yPos, 66, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', pageWidth - 75, yPos + 8);

  doc.setFontSize(14);
  doc.text(formatCurrency(ordem.total), pageWidth - 75, yPos + 16);

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')} - LubIA`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  return doc;
}

export function downloadOrdemPDF(ordem: OrdemPDF) {
  const doc = generateOrdemPDF(ordem);
  doc.save(`OS_${ordem.numero.slice(-8).toUpperCase()}.pdf`);
}

export function openOrdemPDF(ordem: OrdemPDF) {
  const doc = generateOrdemPDF(ordem);
  window.open(doc.output('bloburl'), '_blank');
}
