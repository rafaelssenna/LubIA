'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Loader2, AlertCircle, UserPlus, Car } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao fazer login');
        return;
      }

      router.push('/');
      router.refresh();
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
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-[#43A047] to-[#1B5E20] rounded-2xl flex items-center justify-center">
              <span className="text-2xl font-bold text-white">L</span>
            </div>
            <h1 className="text-3xl font-bold text-[#E8E8E8]">Loop<span className="text-[#43A047]">IA</span></h1>
          </div>
          <p className="text-[#9E9E9E]">Sistema de Gestão de Oficinas</p>
        </div>

        {/* Form */}
        <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-[#E8E8E8] mb-6">Entrar</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#9E9E9E] mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] focus:outline-none focus:border-[#43A047] transition-colors"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#9E9E9E] mb-2">
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-[#E8E8E8] focus:outline-none focus:border-[#43A047] transition-colors"
                placeholder="********"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#43A047] to-[#1B5E20] rounded-xl text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity mt-6"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <LogIn size={20} />
              )}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/cadastro"
              className="inline-flex items-center gap-2 text-[#9E9E9E] hover:text-[#43A047] transition-colors"
            >
              <UserPlus size={16} />
              Criar uma conta
            </Link>
          </div>
        </div>

        {/* Link para clientes */}
        <Link
          href="/consulta"
          className="mt-6 block bg-[#1E1E1E] border border-[#333333] rounded-2xl p-4 hover:border-[#43A047]/50 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
              <Car size={24} className="text-blue-400" />
            </div>
            <div>
              <p className="text-[#E8E8E8] font-medium">Sou cliente</p>
              <p className="text-sm text-[#9E9E9E]">Ver status do meu veiculo</p>
            </div>
          </div>
        </Link>

        <p className="text-center text-[#666666] text-sm mt-6">
          Powered by LoopIA
        </p>
      </div>
    </div>
  );
}
