'use client';

import Header from '@/components/Header';
import { useToast } from '@/components/Toast';
import {
  Settings,
  Building2,
  MessageCircle,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  QrCode,
  Loader2,
  Unplug,
  Smartphone,
  Bot,
  Power,
  Wrench,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Store,
  HelpCircle,
  Info,
  Upload,
  Image,
  X,
  Palette,
  FileText,
  Shield,
  Upload as UploadIcon,
  Code,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface Config {
  nomeOficina: string | null;
  cnpj: string | null;
  telefone: string | null;
  endereco: string | null;
  whatsappConfigured: boolean;
  whatsappConnected: boolean;
  whatsappNumber: string | null;
  whatsappName: string | null;
  // Chatbot
  chatbotEnabled: boolean;
  chatbotNome: string | null;
  chatbotHorário: string | null;
  chatbotBoasVindas: string | null;
  informacoesNegocio: string | null;
  chatbotFaq: string | null;
  logo: string | null;
  pdfCorOS: string;
  pdfCorOrcamento: string;
  // NF-e
  nfeAmbiente: number;
  nfeSerie: number;
  nfeUltimoNumero: number;
  inscricaoEstadual: string | null;
  regimeTributario: number;
  nfeIdCSC: string | null;
  nfeTokenCSC: string | null;
  ufEmpresa: string | null;
}

interface FaqItem {
  pergunta: string;
  resposta: string;
}

interface WhatsAppStatus {
  connected: boolean;
  configured: boolean;
  status?: string;
  profileName?: string;
  profilePicUrl?: string;
  number?: string;
  isBusiness?: boolean;
}

interface Servico {
  id: number;
  nome: string;
  categoria: string;
  precoBase: string;
  intervaloKm: number | null;
  intervaloDias: number | null;
  ativo: boolean;
}

interface Filial {
  id: number;
  nome: string;
  cnpj: string;
  ativo: boolean;
}

interface DiaHorário {
  ativo: boolean;
  abertura: string;
  fechamento: string;
}

interface HorárioSemana {
  seg: DiaHorário;
  ter: DiaHorário;
  qua: DiaHorário;
  qui: DiaHorário;
  sex: DiaHorário;
  sab: DiaHorário;
  dom: DiaHorário;
}

const DIAS_SEMANA = [
  { key: 'seg', label: 'Segunda' },
  { key: 'ter', label: 'Terça' },
  { key: 'qua', label: 'Quarta' },
  { key: 'qui', label: 'Quinta' },
  { key: 'sex', label: 'Sexta' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
] as const;

const HORARIOS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
];

const horarioPadrao: HorárioSemana = {
  seg: { ativo: true, abertura: '08:00', fechamento: '18:00' },
  ter: { ativo: true, abertura: '08:00', fechamento: '18:00' },
  qua: { ativo: true, abertura: '08:00', fechamento: '18:00' },
  qui: { ativo: true, abertura: '08:00', fechamento: '18:00' },
  sex: { ativo: true, abertura: '08:00', fechamento: '18:00' },
  sab: { ativo: true, abertura: '08:00', fechamento: '12:00' },
  dom: { ativo: false, abertura: '08:00', fechamento: '12:00' },
};

// Converter horário estruturado para string legível
function horarioParaString(horario: HorárioSemana): string {
  const grupos: { dias: string[]; abertura: string; fechamento: string }[] = [];

  for (const dia of DIAS_SEMANA) {
    const h = horario[dia.key];
    if (!h.ativo) continue;

    const ultimoGrupo = grupos[grupos.length - 1];
    if (ultimoGrupo && ultimoGrupo.abertura === h.abertura && ultimoGrupo.fechamento === h.fechamento) {
      ultimoGrupo.dias.push(dia.label);
    } else {
      grupos.push({ dias: [dia.label], abertura: h.abertura, fechamento: h.fechamento });
    }
  }

  return grupos.map(g => {
    const diasStr = g.dias.length > 2
      ? `${g.dias[0]} a ${g.dias[g.dias.length - 1]}`
      : g.dias.join(' e ');
    return `${diasStr} ${g.abertura.replace(':', 'h')}-${g.fechamento.replace(':', 'h')}`;
  }).join(', ');
}

// Tentar converter string para horário estruturado (fallback para padrão)
function stringParaHorário(str: string): HorárioSemana {
  // Por simplicidade, sempre retorna o padrão - a string é só para exibição
  return { ...horarioPadrao };
}

// Formatar CNPJ enquanto digita: 00.000.000/0000-00
function formatCnpj(value: string): string {
  const cleaned = value.replace(/\D/g, '').slice(0, 14);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
  if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
  if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
}

// Formatar telefone enquanto digita: (00) 00000-0000
function formatTelefone(value: string): string {
  const cleaned = value.replace(/\D/g, '').slice(0, 11);
  if (cleaned.length <= 2) return cleaned.length ? `(${cleaned}` : '';
  if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
}

export default function ConfiguraçõesPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);

  // WhatsApp states
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Form states
  const [nomeOficina, setNomeOficina] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereço] = useState('');
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [pdfCorOS, setPdfCorOS] = useState('#22c55e');
  const [pdfCorOrcamento, setPdfCorOrcamento] = useState('#e85d04');

  // NF-e states
  const [nfeDesbloqueado, setNfeDesbloqueado] = useState(false);
  const [nfeSenhaInput, setNfeSenhaInput] = useState('');
  const [nfeAmbiente, setNfeAmbiente] = useState(2);
  const [nfeSerie, setNfeSerie] = useState(1);
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [regimeTributario, setRegimeTributario] = useState(1);
  const [nfeIdCSC, setNfeIdCSC] = useState('');
  const [nfeTokenCSC, setNfeTokenCSC] = useState('');
  const [ufEmpresa, setUfEmpresa] = useState('');
  const [certStatus, setCertStatus] = useState<{ exists: boolean; validade?: string; expirado?: boolean } | null>(null);
  const [uploadingCert, setUploadingCert] = useState(false);
  const certInputRef = useRef<HTMLInputElement>(null);
  const [certSenha, setCertSenha] = useState('');

  // Redimensionar imagem para logo (max 400x400, JPEG 0.8)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem (PNG, JPG ou WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 400;
        let { width, height } = img;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/png');
          setLogo(base64);
          toast.success('Logo carregada!');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Limpar input para permitir re-upload do mesmo arquivo
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  // Buscar dados da empresa pelo CNPJ na Receita Federal
  const buscarDadosCnpj = async (cnpjValue: string) => {
    const cnpjLimpo = cnpjValue.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) return;

    setBuscandoCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (res.ok) {
        const data = await res.json();
        // Preencher campos automaticamente
        if (data.razao_social && !nomeOficina) {
          setNomeOficina(data.nome_fantasia || data.razao_social);
        }
        if (data.ddd_telefone_1 && !telefone) {
          const tel = data.ddd_telefone_1.replace(/\D/g, '');
          setTelefone(formatTelefone(tel));
        }
        if (data.logradouro && !endereco) {
          const end = `${data.logradouro}, ${data.numero || 'S/N'}${data.complemento ? ` - ${data.complemento}` : ''}, ${data.bairro} - ${data.municipio}/${data.uf}`;
          setEndereço(end);
        }
        toast.success('Dados da empresa carregados!');
      }
    } catch {
      // Silencioso - não mostrar erro se API falhar
    } finally {
      setBuscandoCnpj(false);
    }
  };

  // Handler do CNPJ com busca automática
  const handleCnpjChange = (value: string) => {
    const formatted = formatCnpj(value);
    setCnpj(formatted);
    // Buscar quando CNPJ estiver completo (14 dígitos)
    if (formatted.replace(/\D/g, '').length === 14) {
      buscarDadosCnpj(formatted);
    }
  };

  // Chatbot states
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [chatbotNome, setChatbotNome] = useState('LoopIA');
  const [chatbotHorário, setChatbotHorário] = useState<HorárioSemana>(horarioPadrao);
  const [chatbotBoasVindas, setChatbotBoasVindas] = useState('Olá! Sou a LoopIA, assistente virtual da oficina. Como posso ajudar?');
  const [informacoesNegocio, setInformacoesNegocio] = useState('');
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);

  // Serviços do banco
  const [servicos, setServiços] = useState<Servico[]>([]);
  const [showServicoModal, setShowServicoModal] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [servicoForm, setServicoForm] = useState({ nome: '', categoria: 'TROCA_OLEO', precoBase: '', intervaloKm: '', intervaloDias: '' });
  const [savingServico, setSavingServico] = useState(false);

  // Filiais
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [showFilialModal, setShowFilialModal] = useState(false);
  const [editingFilial, setEditingFilial] = useState<Filial | null>(null);
  const [filialForm, setFilialForm] = useState({ nome: '', cnpj: '' });
  const [savingFilial, setSavingFilial] = useState(false);

  // Atualizar dia específico do horário
  const updateHorárioDia = (dia: keyof HorárioSemana, campo: keyof DiaHorário, valor: boolean | string) => {
    setChatbotHorário(prev => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor },
    }));
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/whatsapp/config');
      const data = await res.json();
      if (data.data) {
        setConfig(data.data);
        setNomeOficina(data.data.nomeOficina || '');
        setCnpj(data.data.cnpj || '');
        setTelefone(data.data.telefone || '');
        setEndereço(data.data.endereco || '');
        // Chatbot
        setChatbotEnabled(data.data.chatbotEnabled ?? true);
        setChatbotNome(data.data.chatbotNome || 'LoopIA');
        // Tentar carregar horário salvo como JSON, senão usar padrão
        try {
          const horarioSalvo = data.data.chatbotHorário;
          if (horarioSalvo && horarioSalvo.startsWith('{')) {
            setChatbotHorário(JSON.parse(horarioSalvo));
          } else {
            setChatbotHorário(horarioPadrao);
          }
        } catch {
          setChatbotHorário(horarioPadrao);
        }
        setChatbotBoasVindas(data.data.chatbotBoasVindas || 'Olá! Sou a LoopIA, assistente virtual da oficina.');
        setInformacoesNegocio(data.data.informacoesNegocio || '');
        setLogo(data.data.logo || null);
        setPdfCorOS(data.data.pdfCorOS || '#22c55e');
        setPdfCorOrcamento(data.data.pdfCorOrcamento || '#e85d04');
        // NF-e
        setNfeAmbiente(data.data.nfeAmbiente ?? 2);
        setNfeSerie(data.data.nfeSerie ?? 1);
        setInscricaoEstadual(data.data.inscricaoEstadual || '');
        setRegimeTributario(data.data.regimeTributario ?? 1);
        setNfeIdCSC(data.data.nfeIdCSC || '');
        setNfeTokenCSC(data.data.nfeTokenCSC || '');
        setUfEmpresa(data.data.ufEmpresa || '');
        // Carregar FAQ
        try {
          if (data.data.chatbotFaq) {
            const parsed = JSON.parse(data.data.chatbotFaq);
            if (Array.isArray(parsed)) setFaqItems(parsed);
          }
        } catch {}
      }
    } catch (error) {
      console.error('Erro ao buscar config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServiços = async () => {
    try {
      const res = await fetch('/api/servicos');
      const data = await res.json();
      if (data.data) {
        setServiços(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar servicos:', error);
    }
  };

  const handleSaveServico = async () => {
    if (!servicoForm.nome) {
      toast.error('Preencha o nome do serviço');
      return;
    }

    setSavingServico(true);
    try {
      const url = editingServico ? `/api/servicos/${editingServico.id}` : '/api/servicos';
      const method = editingServico ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: servicoForm.nome,
          precoBase: servicoForm.precoBase ? parseFloat(servicoForm.precoBase) : 0,
          categoria: servicoForm.categoria || 'OUTROS',
          intervaloKm: servicoForm.intervaloKm ? parseInt(servicoForm.intervaloKm) : null,
          intervaloDias: servicoForm.intervaloDias ? parseInt(servicoForm.intervaloDias) : null,
          ativo: true,
        }),
      });

      if (res.ok) {
        toast.success(editingServico ? 'Serviço atualizado!' : 'Serviço cadastrado!');
        setShowServicoModal(false);
        setEditingServico(null);
        setServicoForm({ nome: '', categoria: 'TROCA_OLEO', precoBase: '', intervaloKm: '', intervaloDias: '' });
        fetchServiços();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao salvar serviço');
      }
    } catch (error) {
      toast.error('Erro ao salvar serviço');
    } finally {
      setSavingServico(false);
    }
  };

  const handleDeleteServico = async (servico: Servico) => {
    if (!confirm(`Deseja realmente excluir o serviço "${servico.nome}"?`)) return;

    try {
      const res = await fetch(`/api/servicos/${servico.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Serviço excluído!');
        fetchServiços();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao excluir serviço');
      }
    } catch (error) {
      toast.error('Erro ao excluir serviço');
    }
  };

  const openEditServico = (servico: Servico) => {
    setEditingServico(servico);
    setServicoForm({
      nome: servico.nome,
      categoria: servico.categoria || 'TROCA_OLEO',
      precoBase: servico.precoBase ? String(servico.precoBase) : '',
      intervaloKm: servico.intervaloKm ? String(servico.intervaloKm) : '',
      intervaloDias: servico.intervaloDias ? String(servico.intervaloDias) : '',
    });
    setShowServicoModal(true);
  };

  const fetchFiliais = async () => {
    try {
      const res = await fetch('/api/filiais?ativo=todos');
      const data = await res.json();
      if (data.data) {
        setFiliais(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar filiais:', error);
    }
  };

  const handleSaveFilial = async () => {
    if (!filialForm.nome || !filialForm.cnpj) {
      toast.error('Preencha nome e CNPJ');
      return;
    }

    setSavingFilial(true);
    try {
      const url = editingFilial ? `/api/filiais/${editingFilial.id}` : '/api/filiais';
      const method = editingFilial ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filialForm),
      });

      if (res.ok) {
        toast.success(editingFilial ? 'Filial atualizada!' : 'Filial cadastrada!');
        setShowFilialModal(false);
        setEditingFilial(null);
        setFilialForm({ nome: '', cnpj: '' });
        fetchFiliais();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao salvar filial');
      }
    } catch (error) {
      toast.error('Erro ao salvar filial');
    } finally {
      setSavingFilial(false);
    }
  };

  const handleDeleteFilial = async (filial: Filial) => {
    if (!confirm(`Deseja realmente excluir a filial "${filial.nome}"?`)) return;

    try {
      const res = await fetch(`/api/filiais/${filial.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Filial excluída!');
        fetchFiliais();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao excluir filial');
      }
    } catch (error) {
      toast.error('Erro ao excluir filial');
    }
  };

  const openEditFilial = (filial: Filial) => {
    setEditingFilial(filial);
    setFilialForm({ nome: filial.nome, cnpj: filial.cnpj });
    setShowFilialModal(true);
  };

  const checkWhatsAppStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      console.log('[STATUS CHECK]', data);
      setWhatsappStatus(data);

      if (data.connected) {
        // Conectou! Limpar QR code e parar polling
        setQrCode(null);
        setPairCode(null);
        toast.success('WhatsApp conectado com sucesso!');
      } else if (data.qrcode && qrCode) {
        // QR code atualizado durante polling
        setQrCode(data.qrcode);
        if (data.paircode) setPairCode(data.paircode);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Certificado Digital
  const fetchCertStatus = async () => {
    try {
      const res = await fetch('/api/certificado');
      const data = await res.json();
      if (data.data) setCertStatus(data.data);
    } catch {}
  };

  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!certSenha) {
      toast.error('Informe a senha do certificado antes de enviar');
      return;
    }

    setUploadingCert(true);
    try {
      const formData = new FormData();
      formData.append('arquivo', file);
      formData.append('senha', certSenha);

      const res = await fetch('/api/certificado', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Certificado digital salvo com sucesso!');
        setCertSenha('');
        fetchCertStatus();
      } else {
        toast.error(data.error || 'Erro ao salvar certificado');
      }
    } catch {
      toast.error('Erro ao enviar certificado');
    } finally {
      setUploadingCert(false);
      if (certInputRef.current) certInputRef.current.value = '';
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchServiços();
    fetchFiliais();
    checkWhatsAppStatus();
    fetchCertStatus();
  }, []);

  // Polling para atualizar status quando conectando
  useEffect(() => {
    if (qrCode && !whatsappStatus?.connected) {
      const interval = setInterval(() => {
        checkWhatsAppStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [qrCode, whatsappStatus?.connected]);

  const handleSaveConfig = async () => {
    // Validar campos obrigatórios
    if (!cnpj.trim()) {
      toast.error('CNPJ é obrigatório');
      return;
    }
    if (!telefone.trim()) {
      toast.error('Telefone é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeOficina,
          cnpj,
          telefone,
          endereco,
          chatbotEnabled,
          chatbotNome,
          chatbotHorário: JSON.stringify(chatbotHorário),
          chatbotBoasVindas,
          informacoesNegocio,
          chatbotFaq: JSON.stringify(faqItems.filter(f => f.pergunta.trim() && f.resposta.trim())),
          logo,
          pdfCorOS,
          pdfCorOrcamento,
          // NF-e
          nfeAmbiente,
          nfeSerie,
          inscricaoEstadual,
          regimeTributario,
          nfeIdCSC,
          nfeTokenCSC,
          ufEmpresa,
        }),
      });

      if (res.ok) {
        toast.success('Configurações salvas com sucesso!');
        fetchConfig();
      } else {
        toast.error('Erro ao salvar configurações');
      }
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch('/api/whatsapp/connect');
      const data = await res.json();
      console.log('[CONNECT]', data);

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.qrcode) {
        setQrCode(data.qrcode);
        setPairCode(data.paircode);
      } else if (data.status === 'connected') {
        toast.success('WhatsApp já está conectado!');
        checkWhatsAppStatus();
      } else if (data.status === 'connecting' || data.status === 'disconnected') {
        // Instância existe mas precisa reconectar - buscar status para obter QR
        toast.info('Obtendo QR Code...');
        // Fazer polling até obter QR code
        const pollForQR = async () => {
          const statusRes = await fetch('/api/whatsapp/status');
          const statusData = await statusRes.json();
          if (statusData.qrcode) {
            setQrCode(statusData.qrcode);
            if (statusData.paircode) setPairCode(statusData.paircode);
          } else if (statusData.connected) {
            toast.success('WhatsApp conectado!');
            setWhatsappStatus(statusData);
          } else {
            // Tentar novamente após 2 segundos
            setTimeout(pollForQR, 2000);
          }
        };
        pollForQR();
      }
    } catch (error) {
      toast.error('Erro ao conectar WhatsApp');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        toast.success('WhatsApp desconectado');
        setWhatsappStatus({ connected: false, configured: false });
        setQrCode(null);
        setPairCode(null);
      }
    } catch (error) {
      toast.error('Erro ao desconectar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="text-muted animate-pulse">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Header title="Configurações" subtitle="Configure o sistema" />

      <div className="px-3 sm:px-4 lg:px-8 space-y-8 max-w-4xl mx-auto">
        {/* Dados da Oficina */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-border flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Building2 size={22} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Dados da Oficina</h2>
              <p className="text-sm text-muted">Informações que aparecem nas O.S. e documentos</p>
            </div>
          </div>

          <div className="p-3 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Nome da Oficina</label>
              <input
                type="text"
                value={nomeOficina}
                onChange={(e) => setNomeOficina(e.target.value)}
                placeholder="Ex: Auto Center Silva"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                CNPJ <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                {buscandoCnpj && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 size={18} className="animate-spin text-primary" />
                  </div>
                )}
              </div>
              <p className="text-xs text-foreground-muted mt-1">Digite o CNPJ para preencher automaticamente</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Telefone <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                placeholder="(00) 00000-0000"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Endereço</label>
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereço(e.target.value)}
                placeholder="Rua, número, bairro"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Upload Logo */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
                <Image size={14} />
                Logo da Empresa
              </label>
              <div className="flex items-start gap-4">
                {logo ? (
                  <div className="relative group">
                    <img
                      src={logo}
                      alt="Logo"
                      className="w-24 h-24 object-contain bg-background border border-border rounded-xl p-2"
                    />
                    <button
                      onClick={() => setLogo(null)}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remover logo"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="w-24 h-24 flex flex-col items-center justify-center gap-2 bg-background border-2 border-dashed border-border rounded-xl text-muted hover:border-blue-500/50 hover:text-blue-400 transition-all cursor-pointer"
                  >
                    <Upload size={20} />
                    <span className="text-xs">Enviar</span>
                  </button>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                {logo && (
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="px-3 py-2 bg-background border border-border rounded-xl text-sm text-muted hover:text-foreground hover:border-blue-500/50 transition-all"
                  >
                    Trocar
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-foreground-muted">
                PNG, JPG ou WebP. Será redimensionada automaticamente.
              </p>
            </div>

            {/* Cores dos PDFs */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted mb-3 flex items-center gap-2">
                <Palette size={16} />
                Cores dos documentos PDF
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={pdfCorOS}
                    onChange={(e) => setPdfCorOS(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                    title="Cor da O.S."
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">Ordem de Serviço</p>
                    <p className="text-xs text-muted">{pdfCorOS}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={pdfCorOrcamento}
                    onChange={(e) => setPdfCorOrcamento(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                    title="Cor do Orçamento"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">Orçamento</p>
                    <p className="text-xs text-muted">{pdfCorOrcamento}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview dos PDFs */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted mb-2">Preview nos documentos</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Preview O.S. */}
                <div className="rounded-xl overflow-hidden border border-border">
                  <div className="p-4 flex items-center gap-3" style={{ backgroundColor: pdfCorOS }}>
                    {logo && (
                      <img src={logo} alt="Logo" className="w-10 h-10 object-contain bg-white/20 rounded-lg p-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{nomeOficina || 'Nome da Oficina'}</p>
                      <p className="text-white/70 text-[10px]">Centro Automotivo</p>
                      {cnpj && <p className="text-white/60 text-[9px]">CNPJ: {cnpj}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white/90 text-[10px] font-bold">ORDEM DE SERVIÇO</p>
                      <p className="text-white font-bold text-sm">#ABC12345</p>
                    </div>
                  </div>
                  <div className="bg-background p-3">
                    <div className="flex gap-4 text-[10px] text-muted">
                      <span>Cliente: João Silva</span>
                      <span>Veículo: Gol 2020</span>
                    </div>
                  </div>
                </div>

                {/* Preview Orçamento */}
                <div className="rounded-xl overflow-hidden border border-border">
                  <div className="p-4 flex items-center gap-3" style={{ backgroundColor: pdfCorOrcamento }}>
                    {logo && (
                      <img src={logo} alt="Logo" className="w-10 h-10 object-contain bg-white/20 rounded-lg p-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{nomeOficina || 'Nome da Oficina'}</p>
                      <p className="text-white/70 text-[10px]">Centro Automotivo</p>
                      {cnpj && <p className="text-white/60 text-[9px]">CNPJ: {cnpj}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white/90 text-[10px] font-bold">ORÇAMENTO</p>
                      <p className="text-white font-bold text-sm">ORC-001</p>
                    </div>
                  </div>
                  <div className="bg-background p-3">
                    <div className="flex gap-4 text-[10px] text-muted">
                      <span>Cliente: Maria Santos</span>
                      <span>Veículo: HB20 2022</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Botao Salvar */}
            <div className="md:col-span-2 flex justify-end pt-2">
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary rounded-xl text-white font-semibold transition-all duration-300 shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>

        {/* Nota Fiscal Eletrônica */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden relative">
          <div className="p-4 sm:p-6 border-b border-border flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <FileText size={22} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Nota Fiscal Eletrônica</h2>
              <p className="text-sm text-muted">Certificado digital, regime tributário e configurações da NF-e</p>
            </div>
          </div>

          {/* Overlay - Em desenvolvimento */}
          {!nfeDesbloqueado && (
            <div className="absolute inset-0 z-10 bg-card/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4 rounded-2xl">
              <div className="p-4 bg-amber-500/10 rounded-full border border-amber-500/20">
                <Code size={32} className="text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Em Desenvolvimento</h3>
              <p className="text-sm text-muted text-center max-w-sm px-4">
                O módulo de Nota Fiscal Eletrônica está em fase de desenvolvimento e será liberado em breve.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="password"
                  value={nfeSenhaInput}
                  onChange={(e) => setNfeSenhaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && nfeSenhaInput === 'helsen2026') {
                      setNfeDesbloqueado(true);
                      setNfeSenhaInput('');
                    }
                  }}
                  placeholder="Senha de acesso"
                  className="px-4 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm placeholder-muted focus:outline-none focus:ring-2 focus:ring-amber-500/50 w-48"
                />
                <button
                  onClick={() => {
                    if (nfeSenhaInput === 'helsen2026') {
                      setNfeDesbloqueado(true);
                      setNfeSenhaInput('');
                    } else {
                      toast.error('Senha incorreta');
                    }
                  }}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Desbloquear
                </button>
              </div>
            </div>
          )}

          <div className="p-3 sm:p-6 space-y-6">
            {/* Certificado Digital */}
            <div className="bg-background rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={18} className="text-emerald-400" />
                <h3 className="font-semibold text-foreground">Certificado Digital A1</h3>
              </div>

              {certStatus?.exists ? (
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${certStatus.expirado ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                  {certStatus.expirado ? (
                    <XCircle size={20} className="text-red-400" />
                  ) : (
                    <CheckCircle size={20} className="text-emerald-400" />
                  )}
                  <div>
                    <p className={`font-medium ${certStatus.expirado ? 'text-red-400' : 'text-emerald-400'}`}>
                      {certStatus.expirado ? 'Certificado expirado' : 'Certificado válido'}
                    </p>
                    <p className="text-xs text-muted">
                      Validade: {new Date(certStatus.validade!).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <Info size={20} className="text-amber-400" />
                  <p className="text-sm text-amber-400">Nenhum certificado cadastrado</p>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Senha do certificado</label>
                  <input
                    type="password"
                    value={certSenha}
                    onChange={(e) => setCertSenha(e.target.value)}
                    placeholder="Senha do .pfx"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm placeholder-muted focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex items-end">
                  <input
                    ref={certInputRef}
                    type="file"
                    accept=".pfx,.p12"
                    onChange={handleCertUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => {
                      if (!certSenha) {
                        toast.error('Informe a senha do certificado primeiro');
                        return;
                      }
                      certInputRef.current?.click();
                    }}
                    disabled={uploadingCert}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {uploadingCert ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <UploadIcon size={16} />
                    )}
                    {uploadingCert ? 'Enviando...' : 'Enviar certificado (.pfx)'}
                  </button>
                </div>
              </div>
            </div>

            {/* Campos NF-e */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Inscrição Estadual</label>
                <input
                  type="text"
                  value={inscricaoEstadual}
                  onChange={(e) => setInscricaoEstadual(e.target.value)}
                  placeholder="000.000.000.000"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">UF da Empresa</label>
                <select
                  value={ufEmpresa}
                  onChange={(e) => setUfEmpresa(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Selecione...</option>
                  {['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Regime Tributário</label>
                <select
                  value={regimeTributario}
                  onChange={(e) => setRegimeTributario(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                >
                  <option value={1}>Simples Nacional</option>
                  <option value={2}>Simples Nacional - Excesso</option>
                  <option value={3}>Regime Normal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Ambiente</label>
                <select
                  value={nfeAmbiente}
                  onChange={(e) => setNfeAmbiente(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                >
                  <option value={2}>Homologação (Testes)</option>
                  <option value={1}>Produção</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Série NF-e</label>
                <input
                  type="number"
                  value={nfeSerie}
                  onChange={(e) => setNfeSerie(parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">CSC ID (NFC-e)</label>
                <input
                  type="text"
                  value={nfeIdCSC}
                  onChange={(e) => setNfeIdCSC(e.target.value)}
                  placeholder="Opcional"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">Token CSC (NFC-e)</label>
                <input
                  type="text"
                  value={nfeTokenCSC}
                  onChange={(e) => setNfeTokenCSC(e.target.value)}
                  placeholder="Opcional"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {nfeAmbiente === 1 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <Info size={18} className="text-amber-400 shrink-0" />
                <p className="text-sm text-amber-400">
                  Ambiente de <strong>Produção</strong> ativo. As NF-e emitidas terão valor fiscal.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Filiais/Fornecedores */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <Store size={22} className="text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Filiais / Fornecedores</h2>
                <p className="text-sm text-muted">Cadastre as filiais para associar aos produtos</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingFilial(null);
                setFilialForm({ nome: '', cnpj: '' });
                setShowFilialModal(true);
              }}
              className="flex items-center gap-2 px-4 py-3 min-h-[44px] bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400 font-medium hover:bg-purple-500/20 hover:border-purple-500/50 transition-all"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Nova Filial</span>
              <span className="sm:hidden">Nova</span>
            </button>
          </div>

          <div className="p-3 sm:p-6">
            {filiais.length > 0 ? (
              <div className="space-y-3">
                {filiais.map((filial) => (
                  <div
                    key={filial.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl border transition-all gap-3 ${
                      filial.ativo
                        ? 'bg-background border-border hover:border-purple-500/30'
                        : 'bg-background border-border opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                        <Store size={18} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{filial.nome}</p>
                        <p className="text-sm text-muted font-mono">{filial.cnpj}</p>
                      </div>
                      {!filial.ativo && (
                        <span className="px-2.5 py-1 bg-red-500/10 text-red-400 text-xs rounded-lg border border-red-500/20">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditFilial(filial)}
                        className="p-2 hover:bg-blue-500/10 rounded-lg text-foreground-muted hover:text-blue-400 transition-all"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteFilial(filial)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-foreground-muted hover:text-red-400 transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-4 bg-purple-500/10 rounded-2xl w-fit mx-auto mb-4 border border-purple-500/20">
                  <Store size={28} className="text-purple-400" />
                </div>
                <p className="text-foreground font-medium">Nenhuma filial cadastrada</p>
                <p className="text-sm text-muted mt-1">
                  Cadastre filiais para associar aos produtos no estoque
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Filial */}
        {showFilialModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl shadow-black/50 max-h-[90vh] overflow-y-auto">
              <div className="p-3 sm:p-6 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">
                  {editingFilial ? 'Editar Filial' : 'Nova Filial'}
                </h2>
              </div>
              <div className="p-3 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Nome da Filial</label>
                  <input
                    type="text"
                    value={filialForm.nome}
                    onChange={(e) => setFilialForm({ ...filialForm, nome: e.target.value })}
                    placeholder="Ex: Filial Centro"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">CNPJ</label>
                  <input
                    type="text"
                    value={filialForm.cnpj}
                    onChange={(e) => setFilialForm({ ...filialForm, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>
              </div>
              <div className="p-3 sm:p-6 border-t border-border flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowFilialModal(false);
                    setEditingFilial(null);
                    setFilialForm({ nome: '', cnpj: '' });
                  }}
                  className="px-6 py-3 min-h-[44px] border border-border rounded-xl text-muted hover:bg-card-hover transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveFilial}
                  disabled={savingFilial}
                  className="px-6 py-3 min-h-[44px] bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-500 rounded-xl text-white font-semibold transition-all duration-300 shadow-lg shadow-purple-500/25 disabled:opacity-50"
                >
                  {savingFilial ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : editingFilial ? (
                    'Salvar'
                  ) : (
                    'Cadastrar'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Servico */}
        {showServicoModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl shadow-black/50 max-h-[90vh] overflow-y-auto">
              <div className="p-3 sm:p-6 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">
                  {editingServico ? 'Editar Serviço' : 'Novo Serviço'}
                </h2>
              </div>
              <div className="p-3 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Nome do Serviço *</label>
                  <input
                    type="text"
                    value={servicoForm.nome}
                    onChange={(e) => setServicoForm({ ...servicoForm, nome: e.target.value })}
                    placeholder="Ex: Troca de Óleo"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Categoria</label>
                  <select
                    value={servicoForm.categoria}
                    onChange={(e) => setServicoForm({ ...servicoForm, categoria: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  >
                    <option value="TROCA_OLEO">Trocas de Óleo</option>
                    <option value="FILTROS">Filtros</option>
                    <option value="PNEUS">Pneus</option>
                    <option value="REVISOES">Revisões</option>
                    <option value="FREIOS">Freios</option>
                    <option value="SUSPENSAO">Suspensão</option>
                    <option value="ELETRICA">Elétrica</option>
                    <option value="AR_CONDICIONADO">Ar Condicionado</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={servicoForm.precoBase}
                    onChange={(e) => setServicoForm({ ...servicoForm, precoBase: e.target.value })}
                    placeholder="Ex: 180.00"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Intervalo para a próxima</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="number"
                        value={servicoForm.intervaloKm}
                        onChange={(e) => setServicoForm({ ...servicoForm, intervaloKm: e.target.value })}
                        placeholder="Ex: 10000"
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      />
                      <span className="text-xs text-muted mt-1 block">KM</span>
                    </div>
                    <div>
                      <input
                        type="number"
                        value={servicoForm.intervaloDias}
                        onChange={(e) => setServicoForm({ ...servicoForm, intervaloDias: e.target.value })}
                        placeholder="Ex: 180"
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      />
                      <span className="text-xs text-muted mt-1 block">Dias</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-3 sm:p-6 border-t border-border flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowServicoModal(false);
                    setEditingServico(null);
                    setServicoForm({ nome: '', categoria: 'TROCA_OLEO', precoBase: '', intervaloKm: '', intervaloDias: '' });
                  }}
                  className="px-6 py-3 min-h-[44px] border border-border rounded-xl text-muted hover:bg-card-hover transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveServico}
                  disabled={savingServico}
                  className="px-6 py-3 min-h-[44px] bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-500 rounded-xl text-white font-semibold transition-all duration-300 shadow-lg shadow-purple-500/25 disabled:opacity-50"
                >
                  {savingServico ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : editingServico ? (
                    'Salvar'
                  ) : (
                    'Cadastrar'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Integração WhatsApp */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#25D366]/10 rounded-xl border border-[#25D366]/20">
                <MessageCircle size={22} className="text-[#25D366]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Integração WhatsApp</h2>
                <p className="text-sm text-muted">Envie lembretes e mensagens automáticas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {whatsappStatus?.connected ? (
                <span className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 text-sm font-medium rounded-xl border border-emerald-500/20">
                  <CheckCircle size={16} />
                  Conectado
                </span>
              ) : (
                <span className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 text-sm font-medium rounded-xl border border-red-500/20">
                  <XCircle size={16} />
                  Desconectado
                </span>
              )}
            </div>
          </div>

          <div className="p-3 sm:p-6 space-y-6">
            {/* Status e Conexao */}
            {whatsappStatus?.connected ? (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 sm:p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#25D366]/20 rounded-2xl flex items-center justify-center border border-[#25D366]/30">
                      <Smartphone size={26} className="text-[#25D366]" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{whatsappStatus.profileName || 'WhatsApp Conectado'}</p>
                      <p className="text-sm text-muted">{whatsappStatus.number}</p>
                      {whatsappStatus.isBusiness && (
                        <span className="text-xs text-[#25D366]">WhatsApp Business</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-medium hover:bg-red-500/20 transition-all"
                  >
                    <Unplug size={18} />
                    Desconectar
                  </button>
                </div>
              </div>
            ) : qrCode ? (
              <div className="bg-background border border-border rounded-xl p-6 text-center">
                <p className="text-foreground font-semibold mb-4">Escaneie o QR Code com o WhatsApp</p>
                <div className="inline-block p-4 bg-white rounded-xl mb-4">
                  <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                </div>
                {pairCode && (
                  <div className="mb-4">
                    <p className="text-sm text-muted mb-2">Ou use o código de pareamento:</p>
                    <p className="text-2xl font-mono text-primary tracking-widest">{pairCode}</p>
                  </div>
                )}
                <p className="text-sm text-foreground-muted">
                  Aguardando conexão... <Loader2 className="inline animate-spin ml-2" size={16} />
                </p>
                <button
                  onClick={() => { setQrCode(null); setPairCode(null); }}
                  className="mt-4 text-sm text-muted hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-4 bg-[#25D366]/10 rounded-2xl w-fit mx-auto mb-4 border border-[#25D366]/20">
                  <MessageCircle size={32} className="text-[#25D366]" />
                </div>
                <p className="text-foreground font-semibold mb-2">Conecte seu WhatsApp</p>
                <p className="text-sm text-muted mb-6 max-w-md mx-auto">
                  Ao conectar, você poderá enviar mensagens automáticas de lembretes e acompanhamento para seus clientes.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#128C7E] hover:to-[#25D366] rounded-xl text-white font-semibold transition-all duration-300 shadow-lg shadow-[#25D366]/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {connecting ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <QrCode size={20} />
                    )}
                    {connecting ? 'Gerando QR Code...' : 'Conectar WhatsApp'}
                  </button>
                  <button
                    onClick={checkWhatsAppStatus}
                    disabled={checkingStatus}
                    className="p-3 bg-background border border-border rounded-xl text-muted hover:text-foreground hover:border-[#25D366]/50 transition-all"
                    title="Verificar status"
                  >
                    <RefreshCw size={20} className={checkingStatus ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chatbot LoopIA */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <Bot size={22} className="text-purple-400" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">Chatbot LoopIA</h2>
                <p className="text-sm text-muted">Assistente virtual com inteligência artificial</p>
              </div>
            </div>
            <button
              onClick={() => setChatbotEnabled(!chatbotEnabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${
                chatbotEnabled ? 'bg-gradient-to-r from-primary to-primary-dark' : 'bg-background-tertiary'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-lg ${
                  chatbotEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {chatbotEnabled && (
            <div className="p-3 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Nome do Assistente</label>
                <input
                  type="text"
                  value={chatbotNome}
                  onChange={(e) => setChatbotNome(e.target.value)}
                  placeholder="LoopIA"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              {/* Horário de Funcionamento */}
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Horário de Funcionamento</label>
                <div className="bg-background border border-border rounded-xl p-4 space-y-2">
                  {DIAS_SEMANA.map((dia) => (
                    <div
                      key={dia.key}
                      className={`flex flex-wrap items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg transition-all ${
                        chatbotHorário[dia.key].ativo ? 'bg-background-secondary' : 'bg-transparent opacity-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => updateHorárioDia(dia.key, 'ativo', !chatbotHorário[dia.key].ativo)}
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                          chatbotHorário[dia.key].ativo
                            ? 'bg-primary border-primary'
                            : 'bg-transparent border-border'
                        }`}
                      >
                        {chatbotHorário[dia.key].ativo && (
                          <CheckCircle size={14} className="text-white" />
                        )}
                      </button>
                      <span className="w-20 text-sm text-foreground">{dia.label}</span>
                      {chatbotHorário[dia.key].ativo && (
                        <>
                          <select
                            value={chatbotHorário[dia.key].abertura}
                            onChange={(e) => updateHorárioDia(dia.key, 'abertura', e.target.value)}
                            className="bg-background-secondary border border-border rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none focus:border-purple-500"
                          >
                            {HORARIOS.map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                          <span className="text-foreground-muted">às</span>
                          <select
                            value={chatbotHorário[dia.key].fechamento}
                            onChange={(e) => updateHorárioDia(dia.key, 'fechamento', e.target.value)}
                            className="bg-background-secondary border border-border rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none focus:border-purple-500"
                          >
                            {HORARIOS.map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </>
                      )}
                      {!chatbotHorário[dia.key].ativo && (
                        <span className="text-sm text-foreground-muted">Fechado</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">
                  Resumo: {horarioParaString(chatbotHorário) || 'Nenhum dia selecionado'}
                </p>
              </div>

              {/* Serviços do Sistema */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label className="block text-sm font-medium text-muted">
                    Serviços que a LoopIA conhece
                  </label>
                  <button
                    onClick={() => {
                      setEditingServico(null);
                      setServicoForm({ nome: '', categoria: 'TROCA_OLEO', precoBase: '', intervaloKm: '', intervaloDias: '' });
                      setShowServicoModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400 text-xs font-medium hover:bg-purple-500/20 transition-all"
                  >
                    <Plus size={14} />
                    Novo Serviço
                  </button>
                </div>
                <div className="bg-background border border-border rounded-xl p-4">
                  {servicos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {servicos.map((servico) => (
                        <div
                          key={servico.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                            servico.ativo
                              ? 'bg-background-secondary border-border/50 hover:border-purple-500/30'
                              : 'bg-background-secondary border-border/30 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Wrench size={14} className="text-purple-400 shrink-0" />
                            <span className="text-sm text-foreground truncate">{servico.nome}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => openEditServico(servico)}
                              className="p-1.5 hover:bg-blue-500/10 rounded-lg text-foreground-muted hover:text-blue-400 transition-all"
                              title="Editar"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteServico(servico)}
                              className="p-1.5 hover:bg-red-500/10 rounded-lg text-foreground-muted hover:text-red-400 transition-all"
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Wrench size={24} className="text-muted mx-auto mb-2" />
                      <p className="text-sm text-muted">Nenhum serviço cadastrado</p>
                      <p className="text-xs text-foreground-muted mt-1">
                        Clique em "Novo Serviço" para adicionar
                      </p>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-foreground-muted flex items-center gap-1">
                  <DollarSign size={12} />
                  A LoopIA usa automaticamente os serviços e preços cadastrados aqui
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted mb-2">Mensagem de Boas-Vindas</label>
                <textarea
                  value={chatbotBoasVindas}
                  onChange={(e) => setChatbotBoasVindas(e.target.value)}
                  placeholder="Olá! Sou a LoopIA, assistente virtual da oficina..."
                  rows={2}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                />
              </div>

              {/* Informações do Negócio */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
                  <Info size={14} />
                  Informações do Negócio
                </label>
                <textarea
                  value={informacoesNegocio}
                  onChange={(e) => setInformacoesNegocio(e.target.value)}
                  placeholder={"Ex: Trabalhamos com todas as marcas de veículos.\nAceitamos cartão, Pix e dinheiro.\nEstacionamento gratuito para clientes.\nTemos sala de espera com Wi-Fi e café."}
                  rows={4}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                />
                <p className="mt-1.5 text-xs text-foreground-muted">
                  Informações gerais sobre a oficina que a IA usará nas conversas (formas de pagamento, diferenciais, etc.)
                </p>
              </div>

              {/* FAQ - Perguntas Frequentes */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-muted">
                    <HelpCircle size={14} />
                    Perguntas Frequentes (FAQ)
                  </label>
                  <button
                    onClick={() => setFaqItems([...faqItems, { pergunta: '', resposta: '' }])}
                    className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400 text-xs font-medium hover:bg-purple-500/20 transition-all"
                  >
                    <Plus size={14} />
                    Adicionar
                  </button>
                </div>
                <div className="space-y-3">
                  {faqItems.length > 0 ? (
                    faqItems.map((item, index) => (
                      <div key={index} className="bg-background border border-border rounded-xl p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-muted mb-1">Pergunta</label>
                              <input
                                type="text"
                                value={item.pergunta}
                                onChange={(e) => {
                                  const updated = [...faqItems];
                                  updated[index] = { ...updated[index], pergunta: e.target.value };
                                  setFaqItems(updated);
                                }}
                                placeholder="Ex: Vocês trabalham com qual marca de óleo?"
                                className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:border-purple-500/50 transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted mb-1">Resposta</label>
                              <textarea
                                value={item.resposta}
                                onChange={(e) => {
                                  const updated = [...faqItems];
                                  updated[index] = { ...updated[index], resposta: e.target.value };
                                  setFaqItems(updated);
                                }}
                                placeholder="Ex: Trabalhamos com Mobil, Shell, Castrol e outras marcas premium."
                                rows={2}
                                className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:border-purple-500/50 transition-all resize-none"
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const updated = faqItems.filter((_, i) => i !== index);
                              setFaqItems(updated);
                            }}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-foreground-muted hover:text-red-400 transition-all mt-5"
                            title="Remover"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-background border border-border rounded-xl p-6 text-center">
                      <HelpCircle size={24} className="text-muted mx-auto mb-2" />
                      <p className="text-sm text-muted">Nenhuma pergunta cadastrada</p>
                      <p className="text-xs text-foreground-muted mt-1">
                        Adicione perguntas frequentes para a IA responder automaticamente
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Bot size={20} className="text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-foreground font-medium">Como funciona</p>
                    <p className="text-xs text-muted mt-1">
                      A LoopIA responde automaticamente as mensagens recebidas no WhatsApp usando inteligência artificial (Gemini).
                      Ela conhece os serviços, informações do negócio e FAQ cadastrados aqui.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!chatbotEnabled && (
            <div className="p-3 sm:p-6 text-center">
              <div className="p-4 bg-background-secondary rounded-2xl w-fit mx-auto mb-4">
                <Power size={28} className="text-muted" />
              </div>
              <p className="text-foreground font-medium">Chatbot desativado</p>
              <p className="text-sm text-muted mt-1">Ative para responder mensagens automaticamente</p>
            </div>
          )}
        </div>

        {/* Botao Salvar */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-6 sm:px-8 py-3 min-h-[44px] bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary rounded-xl text-white font-semibold transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-primary/40 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Save size={20} />
            )}
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>

        {/* Versão */}
        <div className="bg-card border border-border rounded-2xl p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-3 bg-background-secondary rounded-xl border border-border/50">
                <Settings size={24} className="text-foreground-muted" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Sobre o LubIA</h3>
                <p className="text-sm text-muted">Versão 1.0.0 - Sistema de Gestão Inteligente para Oficinas</p>
              </div>
            </div>
            <span className="px-4 py-2 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-xl border border-emerald-500/20">
              Atualizado
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
