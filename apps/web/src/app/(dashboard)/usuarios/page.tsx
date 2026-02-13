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
        <Loader2 className="h-8 w-8 animate-spin text-[#E85D04]" />
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Usuários"
        subtitle="Gerencie os usuários da sua empresa"
      />

      {/* Search and Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#232323] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04] focus:border-transparent"
          />
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#E85D04] hover:bg-[#E85D04]/90 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* Users List */}
      <div className="bg-[#232323] rounded-lg overflow-hidden">
        {filteredUsuarios.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">Nenhum usuário encontrado</p>
            <button
              onClick={openNewModal}
              className="mt-4 text-[#E85D04] hover:underline"
            >
              Criar primeiro usuário
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1a1a1a]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Usuário</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Nível</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Último Login</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredUsuarios.map((usuario) => {
                  const roleInfo = roleConfig[usuario.role];

                  return (
                    <tr key={usuario.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-700 rounded-full">
                            <User className="h-4 w-4 text-zinc-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{usuario.nome}</p>
                            <p className="text-xs text-zinc-400">{usuario.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleInfo.bg} ${roleInfo.color}`}>
                          <Shield className="h-3 w-3" />
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {usuario.ativo ? (
                          <span className="inline-flex items-center gap-1.5 text-green-400 text-sm">
                            <CheckCircle className="h-4 w-4" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-red-400 text-sm">
                            <XCircle className="h-4 w-4" />
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-zinc-400 text-sm">
                          {formatDate(usuario.lastLoginAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(usuario)}
                            className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-zinc-700 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUsuario(usuario);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white">
                {editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full px-4 py-2 bg-[#232323] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04]"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full pl-10 pr-4 py-2 bg-[#232323] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04]"
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  {editingUsuario ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder={editingUsuario ? '••••••••' : 'Mínimo 6 caracteres'}
                    className="w-full px-4 py-2 pr-10 bg-[#232323] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D04]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Nível de Acesso
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-4 py-2 bg-[#232323] border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#E85D04]"
                >
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="ATENDENTE">Atendente</option>
                  <option value="GERENTE">Gerente</option>
                  <option value="ADMIN">Administrador</option>
                </select>
                <p className="mt-1 text-xs text-zinc-500">
                  {role === 'ADMIN' && 'Acesso total, cria usuários, configura empresa'}
                  {role === 'GERENTE' && 'Relatórios, ordens, orçamentos, estoque, lembretes'}
                  {role === 'ATENDENTE' && 'Dashboard, O.S., orçamentos, WhatsApp'}
                  {role === 'VENDEDOR' && 'Apenas clientes, veículos, orçamentos, WhatsApp'}
                </p>
              </div>

              {/* Ativo */}
              {editingUsuario && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    className="w-4 h-4 text-[#E85D04] bg-zinc-700 border-zinc-600 rounded focus:ring-[#E85D04]"
                  />
                  <label htmlFor="ativo" className="text-sm text-zinc-300">
                    Usuário ativo
                  </label>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-between">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-[#E85D04] hover:bg-[#E85D04]/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Excluir Usuário</h3>
                <p className="text-sm text-zinc-400">{selectedUsuario.nome}</p>
              </div>
            </div>
            <p className="text-zinc-300 mb-6">
              Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedUsuario(null);
                }}
                className="flex-1 px-4 py-2 border border-zinc-700 text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsuariosPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#E85D04]" />
      </div>
    }>
      <UsuariosPageContent />
    </Suspense>
  );
}
