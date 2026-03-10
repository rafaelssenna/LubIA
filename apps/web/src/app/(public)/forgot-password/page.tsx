'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft, KeyRound, Lock, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

type Step = 'email' | 'code' | 'password';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 1: Enviar código
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao enviar código');
        return;
      }

      setStep('code');
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verificar código
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeStr = code.join('');
    if (codeStr.length !== 6) {
      setError('Digite o código completo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: codeStr }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Código inválido');
        return;
      }

      setStep('password');
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Nova senha
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.join(''), newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao alterar senha');
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  // Handler para inputs do código
  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Botão de tema */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-all"
        title={theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
      >
        {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-primary" />}
      </button>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Image
              src={theme === 'light' ? '/logo.tema.claro.png' : '/logo.png'}
              alt="LoopIA"
              width={400}
              height={120}
              className={`w-auto object-contain ${theme === 'light' ? 'h-[210px]' : 'h-[84px]'}`}
            />
          </div>
          <p className="text-muted text-xl">Sistema de Gestão de Oficinas</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8">
          {success ? (
            // Sucesso final
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Senha Alterada!</h2>
              <p className="text-muted mb-4">
                Sua senha foi alterada com sucesso. Redirecionando para o login...
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors"
              >
                <ArrowLeft size={16} />
                Ir para o login
              </Link>
            </div>
          ) : step === 'email' ? (
            // Step 1: Email
            <>
              <h2 className="text-2xl font-bold text-foreground mb-2">Esqueceu sua senha?</h2>
              <p className="text-muted mb-6">
                Digite seu email e enviaremos um código de 6 dígitos para redefinir sua senha.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400">
                  <AlertCircle size={18} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Email</label>
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity mt-6"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Mail size={20} />}
                  {loading ? 'Enviando...' : 'Enviar Código'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="inline-flex items-center gap-2 text-muted hover:text-primary transition-colors">
                  <ArrowLeft size={16} />
                  Voltar para o login
                </Link>
              </div>
            </>
          ) : step === 'code' ? (
            // Step 2: Código
            <>
              <h2 className="text-2xl font-bold text-foreground mb-2">Digite o código</h2>
              <p className="text-muted mb-6">
                Enviamos um código de 6 dígitos para <strong className="text-foreground">{email}</strong>
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400">
                  <AlertCircle size={18} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div className="flex gap-2 justify-center" onPaste={handleCodePaste}>
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeInput(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      className="w-12 h-14 text-center text-2xl font-bold bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || code.join('').length !== 6}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <KeyRound size={20} />}
                  {loading ? 'Verificando...' : 'Verificar Código'}
                </button>
              </form>

              <div className="mt-6 text-center space-y-2">
                <button
                  onClick={() => { setStep('email'); setError(''); setCode(['', '', '', '', '', '']); }}
                  className="inline-flex items-center gap-2 text-muted hover:text-primary transition-colors"
                >
                  <ArrowLeft size={16} />
                  Usar outro email
                </button>
              </div>
            </>
          ) : (
            // Step 3: Nova senha
            <>
              <h2 className="text-2xl font-bold text-foreground mb-2">Nova senha</h2>
              <p className="text-muted mb-6">
                Crie uma nova senha para sua conta.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400">
                  <AlertCircle size={18} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Nova senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-12 text-foreground focus:outline-none focus:border-primary transition-colors"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Confirmar senha</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors"
                    placeholder="Repita a nova senha"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity mt-6"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Lock size={20} />}
                  {loading ? 'Alterando...' : 'Alterar Senha'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-[#666666] text-sm mt-6">
          Powered by LoopIA
        </p>
      </div>
    </div>
  );
}
