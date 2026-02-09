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
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface Config {
  nomeOficina: string | null;
  cnpj: string | null;
  telefone: string | null;
  endereco: string | null;
  whatsappConfigured: boolean;
  whatsappConnected: boolean;
  whatsappNumber: string | null;
  whatsappName: string | null;
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

export default function ConfiguracoesPage() {
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
  const [endereco, setEndereco] = useState('');

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/whatsapp/config');
      const data = await res.json();
      if (data.data) {
        setConfig(data.data);
        setNomeOficina(data.data.nomeOficina || '');
        setCnpj(data.data.cnpj || '');
        setTelefone(data.data.telefone || '');
        setEndereco(data.data.endereco || '');
      }
    } catch (error) {
      console.error('Erro ao buscar config:', error);
    } finally {
      setLoading(false);
    }
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

  useEffect(() => {
    fetchConfig();
    checkWhatsAppStatus();
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
        }),
      });

      if (res.ok) {
        toast.success('Configuracoes salvas com sucesso!');
        fetchConfig();
      } else {
        toast.error('Erro ao salvar configuracoes');
      }
    } catch (error) {
      toast.error('Erro ao salvar configuracoes');
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch('/api/whatsapp/connect');
      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.qrcode) {
        setQrCode(data.qrcode);
        setPairCode(data.paircode);
      } else if (data.status === 'connected') {
        toast.success('WhatsApp ja esta conectado!');
        checkWhatsAppStatus();
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
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#43A047]" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212]">
      <Header title="Configuracoes" subtitle="Configure o sistema" />

      <div className="p-6 space-y-6 animate-fade-in max-w-4xl mx-auto">
        {/* Dados da Oficina */}
        <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#333333] flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl">
              <Building2 size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#E8E8E8]">Dados da Oficina</h2>
              <p className="text-sm text-[#6B7280]">Informacoes que aparecem nas O.S. e documentos</p>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#9E9E9E] mb-2">Nome da Oficina</label>
              <input
                type="text"
                value={nomeOficina}
                onChange={(e) => setNomeOficina(e.target.value)}
                placeholder="Ex: Auto Center Silva"
                className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] placeholder-gray-500 focus:outline-none focus:border-[#43A047]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#9E9E9E] mb-2">CNPJ</label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] placeholder-gray-500 focus:outline-none focus:border-[#43A047]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#9E9E9E] mb-2">Telefone</label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] placeholder-gray-500 focus:outline-none focus:border-[#43A047]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#9E9E9E] mb-2">Endereco</label>
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, numero, bairro"
                className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] placeholder-gray-500 focus:outline-none focus:border-[#43A047]"
              />
            </div>
          </div>
        </div>

        {/* Integracao WhatsApp */}
        <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#333333] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#25D366]/10 rounded-xl">
                <MessageCircle size={20} className="text-[#25D366]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#E8E8E8]">Integracao WhatsApp</h2>
                <p className="text-sm text-[#6B7280]">Envie lembretes e mensagens automaticas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {whatsappStatus?.connected ? (
                <span className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-[#43A047] text-sm rounded-full ring-1 ring-[#43A047]/20">
                  <CheckCircle size={16} />
                  Conectado
                </span>
              ) : (
                <span className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 text-sm rounded-full ring-1 ring-red-500/20">
                  <XCircle size={16} />
                  Desconectado
                </span>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Status e Conexao */}
            {whatsappStatus?.connected ? (
              <div className="bg-green-500/5 border border-[#43A047]/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#25D366]/20 rounded-full flex items-center justify-center">
                      <Smartphone size={24} className="text-[#25D366]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#E8E8E8]">{whatsappStatus.profileName || 'WhatsApp Conectado'}</p>
                      <p className="text-sm text-[#9E9E9E]">{whatsappStatus.number}</p>
                      {whatsappStatus.isBusiness && (
                        <span className="text-xs text-[#25D366]">WhatsApp Business</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <Unplug size={18} />
                    Desconectar
                  </button>
                </div>
              </div>
            ) : qrCode ? (
              <div className="bg-[#121212] border border-[#333333] rounded-xl p-6 text-center">
                <p className="text-[#E8E8E8] font-medium mb-4">Escaneie o QR Code com o WhatsApp</p>
                <div className="inline-block p-4 bg-white rounded-xl mb-4">
                  <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                </div>
                {pairCode && (
                  <div className="mb-4">
                    <p className="text-sm text-[#9E9E9E] mb-2">Ou use o codigo de pareamento:</p>
                    <p className="text-2xl font-mono text-[#43A047] tracking-widest">{pairCode}</p>
                  </div>
                )}
                <p className="text-sm text-[#6B7280]">
                  Aguardando conexao... <Loader2 className="inline animate-spin ml-2" size={16} />
                </p>
                <button
                  onClick={() => { setQrCode(null); setPairCode(null); }}
                  className="mt-4 text-sm text-[#9E9E9E] hover:text-[#E8E8E8]"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#25D366]/10 rounded-full flex items-center justify-center">
                  <MessageCircle size={32} className="text-[#25D366]" />
                </div>
                <p className="text-[#E8E8E8] font-medium mb-2">Conecte seu WhatsApp</p>
                <p className="text-sm text-[#6B7280] mb-6 max-w-md mx-auto">
                  Ao conectar, voce podera enviar mensagens automaticas de lembretes e acompanhamento para seus clientes.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="flex items-center gap-2 px-6 py-3 bg-[#25D366] rounded-xl text-white font-medium hover:bg-[#25D366]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    className="p-3 bg-[#121212] border border-[#333333] rounded-xl text-[#9E9E9E] hover:text-[#E8E8E8] hover:border-[#43A047]/40 transition-colors"
                    title="Verificar status"
                  >
                    <RefreshCw size={20} className={checkingStatus ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botao Salvar */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#43A047] to-[#1B5E20] rounded-xl text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Save size={20} />
            )}
            {saving ? 'Salvando...' : 'Salvar Configuracoes'}
          </button>
        </div>

        {/* Versao */}
        <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#2A2A2A] rounded-xl">
                <Settings size={24} className="text-[#6B7280]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#E8E8E8]">Sobre o LubIA</h3>
                <p className="text-sm text-[#6B7280]">Versao 1.0.0 - Sistema de Gestao Inteligente para Oficinas</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-500/10 text-[#43A047] text-xs font-medium rounded-full ring-1 ring-[#43A047]/20">
              Atualizado
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
