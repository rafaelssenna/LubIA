'use client';

import Header from '@/components/Header';
import {
  Plus, Search, X, User, Mail, Shield,
  Edit, Trash2, Loader2, CheckCircle, XCircle,
  Eye, EyeOff
} from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { useToast } from '@/components/Toast';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  role: 'ADMIN' | 'GERENTE' | 'ATENDENTE' | 'VENDEDOR';
  ativo: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const roleConfig: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN: { label: 'Administrador', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  GERENTE: { label: 'Gerente', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ATENDENTE: { label: 'Atendente', color: 'text-green-400', bg: 'bg-green-500/10' },
  VENDEDOR: { label: 'Vendedor', color: 'text-orange-400', bg: 'bg-orange-500/10' },
};

function UsuariosPageContent() {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'GERENTE' | 'ATENDENTE' | 'VENDEDOR'>('ATENDENTE');
  const [ativo, setAtivo] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);

  const fetchUsuarios = async () => {
    try {
      const res = await fetch('/api/usuarios');
      const data = await res.json();

      if (res.status === 403) {
        toast.error('Você não tem permissão para acessar esta página');
        return;
      }

      setUsuarios(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const filteredUsuarios = usuarios.filter(u =>
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openNewModal = () => {
    setEditingUsuario(null);
    setNome('');
    setEmail('');
    setSenha('');
    setRole('ATENDENTE');
    setAtivo(true);
    setShowPassword(false);
    setShowModal(true);
  };

  const openEditModal = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setNome(usuario.nome);
    setEmail(usuario.email);
    setSenha('');
    setRole(usuario.role);
    setAtivo(usuario.ativo);
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!nome.trim() || !email.trim()) {
      toast.warning('Nome e email são obrigatórios');
      return;
    }

    if (!editingUsuario && !senha) {
      toast.warning('Senha é obrigatória para novos usuários');
      return;
    }

    if (senha && senha.length < 6) {
      toast.warning('Senha deve ter no mínimo 6 caracteres');
      return;
    }

    const isEditing = !!editingUsuario;
    setSaving(true);

    try {
      const payload: any = {
        nome,
        email,
        role,
        ativo,
      };

      if (senha) {
        payload.senha = senha;
      }

      const url = isEditing ? `/api/usuarios/${editingUsuario.id}` : '/api/usuarios';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(isEditing ? 'Usuário atualizado!' : 'Usuário criado!');
        setShowModal(false);
        fetchUsuarios();
      } else {
        toast.error(data.error || 'Erro ao salvar usuário');
      }
    } catch (error) {
      toast.error('Erro ao salvar usuário');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUsuario) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/usuarios/${selectedUsuario.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Usuário excluído!');
        setShowDeleteConfirm(false);
        setSelectedUsuario(null);
        fetchUsuarios();
      } else {
        toast.error(data.error || 'Erro ao excluir usuário');
      }
    } catch (error) {
      toast.error('Erro ao excluir usuário');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Nunca';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-500/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-purple-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-muted animate-pulse">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Header
        title="Usuários"
        subtitle="Gerencie os usuários da sua empresa"
      />

      <div className="px-4 lg:px-8 space-y-8">
        {/* Search and Actions */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-[#2E7D32] hover:from-[#2E7D32] hover:to-primary text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02]"
          >
            <Plus className="h-5 w-5" />
            <span>Novo Usuário</span>
          </button>
        </div>

        {/* Users List */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {filteredUsuarios.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-purple-500/10 rounded-2xl w-fit mx-auto mb-4 border border-purple-500/20">
                <User className="h-8 w-8 text-purple-400" />
              </div>
              <p className="text-foreground font-medium">Nenhum usuário encontrado</p>
              <button
                onClick={openNewModal}
                className="mt-4 text-primary hover:text-primary-light transition-colors"
              >
                Criar primeiro usuário
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-900/50 border-b border-border">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Usuário</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Nível</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Último Login</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredUsuarios.map((usuario) => {
                    const roleInfo = roleConfig[usuario.role];

                    return (
                      <tr key={usuario.id} className="hover:bg-zinc-800/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                              <User className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                              <p className="text-foreground font-semibold">{usuario.nome}</p>
                              <p className="text-sm text-muted">{usuario.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${roleInfo.bg} ${roleInfo.color} border-current/20`}>
                            <Shield className="h-3.5 w-3.5" />
                            {roleInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {usuario.ativo ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle className="h-4 w-4" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20">
                              <XCircle className="h-4 w-4" />
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-muted text-sm">
                            {formatDate(usuario.lastLoginAt)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(usuario)}
                              className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUsuario(usuario);
                                setShowDeleteConfirm(true);
                              }}
                              className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-black/50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card">
              <h2 className="text-xl font-bold text-foreground">
                {editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-zinc-800 rounded-lg text-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-muted mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-border rounded-xl text-foreground placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-muted mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900/50 border border-border rounded-xl text-foreground placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-muted mb-2">
                  {editingUsuario ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder={editingUsuario ? '........' : 'Mínimo 6 caracteres'}
                    className="w-full px-4 py-3 pr-10 bg-zinc-900/50 border border-border rounded-xl text-foreground placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-muted mb-3">
                  Nível de Acesso
                </label>
                <div className="space-y-2">
                  {/* VENDEDOR */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      role === 'VENDEDOR'
                        ? 'bg-orange-500/10 border-orange-500/50'
                        : 'bg-zinc-900/50 border-border hover:border-border'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="VENDEDOR"
                      checked={role === 'VENDEDOR'}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="mt-1 w-4 h-4 text-orange-500 bg-zinc-700 border-zinc-600 focus:ring-orange-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Vendedor</span>
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-orange-500/20 text-orange-400">VENDEDOR</span>
                      </div>
                      <p className="text-xs text-muted mt-1">Clientes, Veículos, Orçamentos, WhatsApp</p>
                    </div>
                  </label>

                  {/* ATENDENTE */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      role === 'ATENDENTE'
                        ? 'bg-emerald-500/10 border-emerald-500/50'
                        : 'bg-zinc-900/50 border-border hover:border-border'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="ATENDENTE"
                      checked={role === 'ATENDENTE'}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="mt-1 w-4 h-4 text-emerald-500 bg-zinc-700 border-zinc-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Atendente</span>
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400">ATENDENTE</span>
                      </div>
                      <p className="text-xs text-muted mt-1">Dashboard, Clientes, Veiculos, Ordens, Orcamentos, WhatsApp</p>
                    </div>
                  </label>

                  {/* GERENTE */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      role === 'GERENTE'
                        ? 'bg-blue-500/10 border-blue-500/50'
                        : 'bg-zinc-900/50 border-border hover:border-border'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="GERENTE"
                      checked={role === 'GERENTE'}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="mt-1 w-4 h-4 text-blue-500 bg-zinc-700 border-zinc-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Gerente</span>
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-400">GERENTE</span>
                      </div>
                      <p className="text-xs text-muted mt-1">Tudo exceto Usuários e Configurações</p>
                    </div>
                  </label>

                  {/* ADMIN */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      role === 'ADMIN'
                        ? 'bg-purple-500/10 border-purple-500/50'
                        : 'bg-zinc-900/50 border-border hover:border-border'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="ADMIN"
                      checked={role === 'ADMIN'}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="mt-1 w-4 h-4 text-purple-500 bg-zinc-700 border-zinc-600 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Administrador</span>
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-400">ADMIN</span>
                      </div>
                      <p className="text-xs text-muted mt-1">Acesso total ao sistema</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Ativo */}
              {editingUsuario && (
                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl border border-border">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    className="w-4 h-4 text-emerald-500 bg-zinc-700 border-zinc-600 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="ativo" className="text-sm text-muted">
                    Usuário ativo
                  </label>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-card">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 border border-border rounded-xl text-muted hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-[#2E7D32] hover:from-[#2E7D32] hover:to-primary text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingUsuario ? 'Salvar' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedUsuario && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl shadow-black/50">
            <div className="p-6">
              <div className="w-14 h-14 mx-auto mb-4 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                <Trash2 className="h-7 w-7 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground text-center mb-2">Excluir Usuário</h3>
              <p className="text-muted text-center text-sm mb-1">{selectedUsuario.nome}</p>
              <p className="text-foreground-muted text-center text-sm">
                Tem certeza que deseja excluir este usuario? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedUsuario(null);
                }}
                className="flex-1 px-6 py-3 border border-border text-muted rounded-xl hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-600 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-red-500/25 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-500/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-purple-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-muted animate-pulse">Carregando...</p>
        </div>
      </div>
    }>
      <UsuariosPageContent />
    </Suspense>
  );
}
