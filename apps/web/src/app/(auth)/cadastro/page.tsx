'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { UserPlus, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

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

export default function CadastroPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [cnpjEmpresa, setCnpjEmpresa] = useState('');
  const [telefoneEmpresa, setTelefoneEmpresa] = useState('');
  const [enderecoEmpresa, setEnderecoEmpresa] = useState('');
  const [loading, setLoading] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [error, setError] = useState('');

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
        if (data.razao_social && !nomeEmpresa) {
          setNomeEmpresa(data.nome_fantasia || data.razao_social);
        }
        if (data.ddd_telefone_1 && !telefoneEmpresa) {
          const tel = data.ddd_telefone_1.replace(/\D/g, '');
          setTelefoneEmpresa(formatTelefone(tel));
        }
        if (data.logradouro && !enderecoEmpresa) {
          const end = `${data.logradouro}, ${data.numero || 'S/N'}${data.complemento ? ` - ${data.complemento}` : ''}, ${data.bairro} - ${data.municipio}/${data.uf}`;
          setEnderecoEmpresa(end);
        }
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
    setCnpjEmpresa(formatted);
    // Buscar quando CNPJ estiver completo (14 dígitos)
    if (formatted.replace(/\D/g, '').length === 14) {
      buscarDadosCnpj(formatted);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validar senhas
    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    if (!cnpjEmpresa || cnpjEmpresa.replace(/\D/g, '').length !== 14) {
      setError('CNPJ da empresa é obrigatório (14 dígitos)');
      setLoading(false);
      return;
    }

    if (!telefoneEmpresa || telefoneEmpresa.replace(/\D/g, '').length < 10) {
      setError('Telefone da empresa é obrigatório (mínimo 10 dígitos)');
      setLoading(false);
      return;
    }

    if (!enderecoEmpresa.trim()) {
      setError('Endereço da empresa é obrigatório');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha, nomeEmpresa, cnpjEmpresa, telefoneEmpresa, enderecoEmpresa }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao criar conta');
        return;
      }

      // Cadastro bem sucedido - redireciona para checkout do Stripe
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        // Fallback caso não tenha URL (não deveria acontecer)
        router.push('/assinatura');
        router.refresh();
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Image
              src={theme === 'light' ? '/logo.tema.claro.png' : '/logo.png'}
              alt="LoopIA"
              width={400}
              height={120}
              className={`w-auto object-contain ${theme === 'light' ? 'h-[210px]' : 'h-[84px]'}`}
            />
          </div>
          <p className="text-muted">Sistema de Gestão de Oficinas</p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Criar Conta</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Nome da Oficina/Empresa
              </label>
              <input
                type="text"
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
                required
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="Ex: Auto Center Silva"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                CNPJ da Empresa
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cnpjEmpresa}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  required
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors"
                  placeholder="00.000.000/0000-00"
                />
                {buscandoCnpj && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="animate-spin text-primary" size={20} />
                  </div>
                )}
              </div>
              <p className="text-xs text-[#666666] mt-1">
                Os dados da empresa serão preenchidos automaticamente
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Telefone da Empresa (WhatsApp)
              </label>
              <input
                type="tel"
                value={telefoneEmpresa}
                onChange={(e) => setTelefoneEmpresa(formatTelefone(e.target.value))}
                required
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="(31) 99999-9999"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Endereço da Empresa
              </label>
              <input
                type="text"
                value={enderecoEmpresa}
                onChange={(e) => setEnderecoEmpresa(e.target.value)}
                required
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="Rua, número, bairro, cidade"
              />
            </div>

            <div className="border-t border-border pt-4 mt-4">
              <p className="text-sm text-muted mb-4">Dados do administrador</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Seu Nome
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Confirmar Senha
              </label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="Repita a senha"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity mt-6"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <UserPlus size={20} />
              )}
              {loading ? 'Criando conta...' : 'Criar Conta e Assinar'}
            </button>

            <p className="text-xs text-center text-muted mt-3">
              7 dias grátis para testar. Cancele quando quiser.
            </p>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-muted hover:text-primary transition-colors"
            >
              <ArrowLeft size={16} />
              Já tenho uma conta
            </Link>
          </div>
        </div>

        <p className="text-center text-[#666666] text-sm mt-6">
          Powered by LoopIA
        </p>
      </div>
    </div>
  );
}
