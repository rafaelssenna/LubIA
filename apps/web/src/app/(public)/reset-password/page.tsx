'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, Loader2, AlertCircle, CheckCircle, ArrowLeft, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { theme, toggleTheme } = useTheme();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [userName, setUserName] = useState('');

  // Validar token ao carregar
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Link inválido');
        setValidating(false);
        return;
      }

      try {
        const res = await fetch(`/api/auth/reset-password?token=${token}`);
        const data = await res.json();

        if (data.valid) {
          setTokenValid(true);
          setUserName(data.userName);
        } else {
          setError(data.error || 'Link inválido ou expirado');
        }
      } catch {
        setError('Erro ao validar link');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao redefinir senha');
        return;
      }

      setSuccess(true);
      // Redirecionar para login após 3 segundos
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
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
          {validating ? (
            // Loading State
            <div className="text-center py-8">
              <Loader2 size={40} className="text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted">Validando link...</p>
            </div>
          ) : success ? (
            // Success State
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Senha Alterada!</h2>
              <p className="text-muted mb-6">
                Sua senha foi redefinida com sucesso. Você será redirecionado para o login...
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors"
              >
                <ArrowLeft size={16} />
                Ir para o login
              </Link>
            </div>
          ) : !tokenValid ? (
            // Invalid Token State
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Link Inválido</h2>
              <p className="text-muted mb-6">{error}</p>
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
              >
                Solicitar Novo Link
              </Link>
            </div>
          ) : (
            // Form State
            <>
              <h2 className="text-2xl font-bold text-foreground mb-2">Redefinir Senha</h2>
              <p className="text-muted mb-6">
                Olá <strong className="text-foreground">{userName}</strong>, digite sua nova senha.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400">
                  <AlertCircle size={18} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-12 text-foreground focus:outline-none focus:border-primary transition-colors"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Confirmar Senha
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
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
                    <Lock size={20} />
                  )}
                  {loading ? 'Salvando...' : 'Redefinir Senha'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-muted hover:text-primary transition-colors"
                >
                  <ArrowLeft size={16} />
                  Voltar para o login
                </Link>
              </div>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={40} className="text-primary animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
