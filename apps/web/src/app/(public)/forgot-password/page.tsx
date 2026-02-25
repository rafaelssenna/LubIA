'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ForgotPasswordPage() {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
        setError(data.error || 'Erro ao enviar email');
        return;
      }

      setSuccess(true);
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
          {success ? (
            // Success State
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Email Enviado!</h2>
              <p className="text-muted mb-6">
                Se o email <strong className="text-foreground">{email}</strong> estiver cadastrado,
                você receberá um link para redefinir sua senha.
              </p>
              <p className="text-sm text-muted mb-6">
                Verifique também sua pasta de spam.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors"
              >
                <ArrowLeft size={16} />
                Voltar para o login
              </Link>
            </div>
          ) : (
            // Form State
            <>
              <h2 className="text-2xl font-bold text-foreground mb-2">Esqueceu sua senha?</h2>
              <p className="text-muted mb-6">
                Digite seu email e enviaremos um link para redefinir sua senha.
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity mt-6"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Mail size={20} />
                  )}
                  {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
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
