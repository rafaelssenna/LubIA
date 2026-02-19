'use client';

import Header from '@/components/Header';
import { Plus, Search, Phone, Car, Eye, MessageCircle, X, Edit, Trash2, User, Mail, MapPin, CreditCard, Loader2, Users, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { capitalize, formatCpfCnpj, formatPhone, formatPlate } from '@/utils/format';

interface Veiculo {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
}

interface Cliente {
  id: number;
  nome: string;
  telefone: string;
  email: string | null;
  cpf: string | null;
  endereco: string | null;
  veiculosCount: number;
  veiculos?: Veiculo[];
}

export default function ClientesPage() {
  const toast = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    cpf: '',
    endereco: '',
  });

  const [enderecoForm, setEnderecoForm] = useState({
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  });

  const [buscandoCep, setBuscandoCep] = useState(false);

  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);
    try {
      const res = await fetch(`/api/cep/${cepLimpo}`);
      const data = await res.json();
      if (res.ok) {
        setEnderecoForm(prev => ({
          ...prev,
          rua: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          uf: data.uf || '',
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setBuscandoCep(false);
    }
  };

  const montarEndereco = () => {
    const partes = [];
    if (enderecoForm.rua) {
      let rua = enderecoForm.rua;
      if (enderecoForm.numero) rua += `, ${enderecoForm.numero}`;
      if (enderecoForm.complemento) rua += ` - ${enderecoForm.complemento}`;
      partes.push(rua);
    }
    if (enderecoForm.bairro) partes.push(enderecoForm.bairro);
    if (enderecoForm.cidade && enderecoForm.uf) {
      partes.push(`${enderecoForm.cidade}/${enderecoForm.uf}`);
    }
    if (enderecoForm.cep) partes.push(`CEP: ${enderecoForm.cep}`);
    return partes.join(' - ');
  };

  const parseEndereco = (endereco: string) => {
    const result = {
      cep: '',
      rua: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
    };

    if (!endereco) return result;

    const cepMatch = endereco.match(/CEP:\s*(\d{5}-?\d{3})/);
    if (cepMatch) {
      result.cep = cepMatch[1];
    }

    let resto = endereco.replace(/\s*-?\s*CEP:\s*\d{5}-?\d{3}/, '').trim();

    const cidadeUfMatch = resto.match(/([^-]+)\/([A-Z]{2})$/i);
    if (cidadeUfMatch) {
      result.cidade = cidadeUfMatch[1].trim();
      result.uf = cidadeUfMatch[2].toUpperCase();
      resto = resto.replace(/\s*-?\s*[^-]+\/[A-Z]{2}$/i, '').trim();
    }

    const partes = resto.split(/\s*-\s*/);

    if (partes.length >= 1 && partes[0]) {
      const ruaNumero = partes[0].match(/^(.+?),\s*(\d+\w*)$/);
      if (ruaNumero) {
        result.rua = ruaNumero[1].trim();
        result.numero = ruaNumero[2].trim();
      } else {
        result.rua = partes[0].trim();
      }
    }

    if (partes.length >= 2 && partes[1]) {
      if (partes.length >= 3 && partes[2]) {
        result.complemento = partes[1].trim();
        result.bairro = partes[2].trim();
      } else {
        result.bairro = partes[1].trim();
      }
    }

    return result;
  };

  const fetchClientes = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('busca', searchTerm);

      const res = await fetch(`/api/clientes?${params}`);
      const data = await res.json();
      setClientes(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, [searchTerm]);

  const handleSubmit = async () => {
    if (!form.nome || !form.telefone) {
      toast.warning('Nome e telefone são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const enderecoCompleto = montarEndereco();
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, endereco: enderecoCompleto }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowModal(false);
        setForm({ nome: '', telefone: '', email: '', cpf: '', endereco: '' });
        setEnderecoForm({ cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' });
        toast.success('Cliente cadastrado com sucesso!');
        fetchClientes();
      } else {
        toast.error(data.error || 'Erro ao cadastrar cliente');
      }
    } catch (error) {
      console.error('Erro ao cadastrar cliente:', error);
      toast.error('Erro ao cadastrar cliente');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setForm({
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email || '',
      cpf: cliente.cpf || '',
      endereco: cliente.endereco || '',
    });
    setEnderecoForm(parseEndereco(cliente.endereco || ''));
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedCliente) return;

    setSaving(true);
    try {
      const enderecoCompleto = montarEndereco() || form.endereco;
      const res = await fetch(`/api/clientes/${selectedCliente.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, endereco: enderecoCompleto }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowEditModal(false);
        setSelectedCliente(null);
        setForm({ nome: '', telefone: '', email: '', cpf: '', endereco: '' });
        setEnderecoForm({ cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' });
        toast.success('Cliente atualizado com sucesso!');
        fetchClientes();
      } else {
        toast.error(data.error || 'Erro ao atualizar cliente');
      }
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      toast.error('Erro ao atualizar cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCliente) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/clientes/${selectedCliente.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        setShowDeleteConfirm(false);
        setSelectedCliente(null);
        toast.success('Cliente excluído com sucesso!');
        fetchClientes();
      } else {
        toast.error(data.error || 'Erro ao excluir cliente');
      }
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast.error('Erro ao excluir cliente');
    } finally {
      setSaving(false);
    }
  };

  const viewDetails = async (cliente: Cliente) => {
    try {
      const res = await fetch(`/api/clientes/${cliente.id}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedCliente(data.data);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-500/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-zinc-400 animate-pulse">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Header title="Clientes" subtitle="Gerencie seus clientes" />

      <div className="px-4 lg:px-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-8">
          {/* Total Clientes */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-2xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
                <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">Total</span>
              </div>
              <p className="text-4xl font-bold text-white mb-1">{clientes.length}</p>
              <p className="text-sm text-zinc-400">clientes cadastrados</p>
            </div>
          </div>

          {/* Total Veiculos */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <Car className="h-6 w-6 text-purple-400" />
                </div>
                <span className="text-xs font-medium text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">Veiculos</span>
              </div>
              <p className="text-4xl font-bold text-white mb-1">
                {clientes.reduce((acc, c) => acc + c.veiculosCount, 0)}
              </p>
              <p className="text-sm text-zinc-400">veiculos registrados</p>
            </div>
          </div>

          {/* Mensagens */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-2xl p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hidden xl:block">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl">
                  <MessageCircle className="h-6 w-6 text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">WhatsApp</span>
              </div>
              <p className="text-4xl font-bold text-white mb-1">0</p>
              <p className="text-sm text-zinc-400">mensagens enviadas hoje</p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Buscar cliente por nome, telefone ou CPF/CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-card border border-zinc-800/50 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
            />
          </div>
          <button
            onClick={() => {
              setForm({ nome: '', telefone: '', email: '', cpf: '', endereco: '' });
              setEnderecoForm({ cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' });
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-[#2E7D32] hover:from-[#2E7D32] hover:to-primary text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02]"
          >
            <Plus size={18} />
            Novo Cliente
          </button>
        </div>

        {/* Lista de Clientes */}
        <div className="bg-card rounded-2xl border border-zinc-800/50 overflow-hidden">
          {clientes.length === 0 ? (
            <div className="p-12 text-center">
              <div className="p-4 bg-zinc-800/50 rounded-full w-fit mx-auto mb-4">
                <Users className="h-8 w-8 text-zinc-600" />
              </div>
              <p className="text-zinc-400">Nenhum cliente encontrado</p>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 mt-4 text-primary hover:text-primary-light transition-colors"
              >
                Cadastrar cliente
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {clientes.map((cliente) => (
                <div
                  key={cliente.id}
                  className="p-4 hover:bg-zinc-800/30 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/25">
                      {capitalize(cliente.nome).charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{capitalize(cliente.nome)}</p>
                      <div className="flex items-center gap-3 text-sm text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Phone size={12} className="text-emerald-400" />
                          {formatPhone(cliente.telefone)}
                        </span>
                        {cliente.cpf && (
                          <span className="hidden sm:inline">{formatCpfCnpj(cliente.cpf)}</span>
                        )}
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <Car size={14} className="text-purple-400" />
                      <span className="text-purple-400 font-medium">{cliente.veiculosCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          window.open(`https://wa.me/55${cliente.telefone.replace(/\D/g, '')}`, '_blank');
                        }}
                        className="p-2 hover:bg-emerald-500/10 rounded-lg text-zinc-500 hover:text-emerald-400 transition-all duration-200"
                        title="WhatsApp"
                      >
                        <MessageCircle size={18} />
                      </button>
                      <button
                        onClick={() => viewDetails(cliente)}
                        className="p-2 hover:bg-blue-500/10 rounded-lg text-zinc-500 hover:text-blue-400 transition-all duration-200"
                        title="Ver detalhes"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => openEditModal(cliente)}
                        className="p-2 hover:bg-zinc-700/50 rounded-lg text-zinc-500 hover:text-white transition-all duration-200"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCliente(cliente);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-all duration-200"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Novo Cliente */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl shadow-black/50">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Novo Cliente</h2>
                <p className="text-sm text-zinc-400 mt-1">Cadastre um novo cliente</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all duration-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome completo"
                  maxLength={100}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Telefone *</label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  maxLength={100}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">CPF/CNPJ</label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  placeholder="CPF ou CNPJ"
                  maxLength={18}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
                />
              </div>
              {/* Endereco */}
              <div className="pt-2 border-t border-zinc-800">
                <label className="block text-sm font-medium text-zinc-400 mb-3">Endereco</label>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <input
                        type="text"
                        value={enderecoForm.cep}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                          const formatted = value.length > 5 ? `${value.slice(0, 5)}-${value.slice(5)}` : value;
                          setEnderecoForm({ ...enderecoForm, cep: formatted });
                          if (value.length === 8) buscarCep(value);
                        }}
                        placeholder="CEP"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={enderecoForm.rua}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, rua: e.target.value })}
                        placeholder={buscandoCep ? 'Buscando...' : 'Rua'}
                        disabled={buscandoCep}
                        maxLength={100}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 text-sm disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <input
                        type="text"
                        value={enderecoForm.numero}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, numero: e.target.value })}
                        placeholder="No"
                        maxLength={10}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={enderecoForm.complemento}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, complemento: e.target.value })}
                        placeholder="Complemento"
                        maxLength={50}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <input
                        type="text"
                        value={enderecoForm.bairro}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, bairro: e.target.value })}
                        placeholder="Bairro"
                        disabled={buscandoCep}
                        maxLength={50}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 text-sm disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={enderecoForm.cidade}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, cidade: e.target.value })}
                        placeholder="Cidade"
                        disabled={buscandoCep}
                        maxLength={50}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 text-sm disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={enderecoForm.uf}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, uf: e.target.value.toUpperCase().slice(0, 2) })}
                        placeholder="UF"
                        maxLength={2}
                        disabled={buscandoCep}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 text-sm disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 border border-zinc-700 rounded-xl text-zinc-400 hover:bg-zinc-800 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-primary to-[#2E7D32] rounded-xl text-white font-medium hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Cliente */}
      {showEditModal && selectedCliente && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl shadow-black/50">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Editar Cliente</h2>
                <p className="text-sm text-zinc-400 mt-1">Atualize as informacoes do cliente</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all duration-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  maxLength={100}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Telefone *</label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  maxLength={15}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={100}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">CPF/CNPJ</label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  placeholder="CPF ou CNPJ"
                  maxLength={18}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
                />
              </div>
              {/* Endereco */}
              <div className="pt-2 border-t border-zinc-800">
                <label className="block text-sm font-medium text-zinc-400 mb-3">Endereco</label>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <input
                        type="text"
                        value={enderecoForm.cep}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                          const formatted = value.length > 5 ? `${value.slice(0, 5)}-${value.slice(5)}` : value;
                          setEnderecoForm({ ...enderecoForm, cep: formatted });
                          if (value.length === 8) buscarCep(value);
                        }}
                        placeholder="CEP"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={enderecoForm.rua}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, rua: e.target.value })}
                        placeholder={buscandoCep ? 'Buscando...' : 'Rua'}
                        disabled={buscandoCep}
                        maxLength={100}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 text-sm disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <input
                        type="text"
                        value={enderecoForm.numero}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, numero: e.target.value })}
                        placeholder="No"
                        maxLength={10}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={enderecoForm.complemento}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, complemento: e.target.value })}
                        placeholder="Complemento"
                        maxLength={50}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <input
                        type="text"
                        value={enderecoForm.bairro}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, bairro: e.target.value })}
                        placeholder="Bairro"
                        disabled={buscandoCep}
                        maxLength={50}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 text-sm disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={enderecoForm.cidade}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, cidade: e.target.value })}
                        placeholder="Cidade"
                        disabled={buscandoCep}
                        maxLength={50}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 text-sm disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={enderecoForm.uf}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, uf: e.target.value.toUpperCase().slice(0, 2) })}
                        placeholder="UF"
                        maxLength={2}
                        disabled={buscandoCep}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 text-sm disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-3 border border-zinc-700 rounded-xl text-zinc-400 hover:bg-zinc-800 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-primary to-[#2E7D32] rounded-xl text-white font-medium hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Alteracoes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusao */}
      {showDeleteConfirm && selectedCliente && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl shadow-black/50">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-xl font-semibold text-white">Confirmar Exclusao</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                  <Trash2 size={24} className="text-red-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{selectedCliente.nome}</p>
                  <p className="text-sm text-zinc-400">{formatPhone(selectedCliente.telefone)}</p>
                </div>
              </div>
              {selectedCliente.veiculosCount > 0 ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
                  Este cliente possui {selectedCliente.veiculosCount} veiculo(s) cadastrado(s).
                  Remova os veiculos primeiro para poder excluir o cliente.
                </div>
              ) : (
                <p className="text-zinc-400 text-sm">
                  Tem certeza que deseja excluir este cliente? Esta acao nao pode ser desfeita.
                </p>
              )}
            </div>
            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedCliente(null);
                }}
                className="px-6 py-3 border border-zinc-700 rounded-xl text-zinc-400 hover:bg-zinc-800 transition-all duration-200"
              >
                Cancelar
              </button>
              {selectedCliente.veiculosCount === 0 && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-700 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-red-500/25 transition-all duration-300 disabled:opacity-50"
                >
                  {saving ? 'Excluindo...' : 'Excluir Cliente'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes do Cliente */}
      {showDetailModal && selectedCliente && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/50">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/25">
                  {capitalize(selectedCliente.nome).charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{capitalize(selectedCliente.nome)}</h2>
                  <p className="text-sm text-zinc-400">Cliente #{selectedCliente.id}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all duration-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <Phone size={14} className="text-emerald-400" />
                    <span className="text-xs">Telefone</span>
                  </div>
                  <p className="text-white">{formatPhone(selectedCliente.telefone)}</p>
                </div>
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <Car size={14} className="text-purple-400" />
                    <span className="text-xs">Veiculos</span>
                  </div>
                  <p className="text-white">{selectedCliente.veiculosCount}</p>
                </div>
              </div>
              {selectedCliente.email && (
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <Mail size={14} className="text-blue-400" />
                    <span className="text-xs">Email</span>
                  </div>
                  <p className="text-white">{selectedCliente.email.toLowerCase()}</p>
                </div>
              )}
              {selectedCliente.cpf && (
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <CreditCard size={14} className="text-amber-400" />
                    <span className="text-xs">CPF/CNPJ</span>
                  </div>
                  <p className="text-white">{formatCpfCnpj(selectedCliente.cpf)}</p>
                </div>
              )}
              {selectedCliente.endereco && (
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <MapPin size={14} className="text-red-400" />
                    <span className="text-xs">Endereco</span>
                  </div>
                  <p className="text-white">{selectedCliente.endereco}</p>
                </div>
              )}

              {/* Veiculos */}
              {selectedCliente.veiculos && selectedCliente.veiculos.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">Veiculos</h3>
                  <div className="space-y-2">
                    {selectedCliente.veiculos.map((veiculo) => (
                      <div key={veiculo.id} className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <Car size={16} className="text-purple-400" />
                          </div>
                          <div>
                            <p className="text-white">{capitalize(veiculo.marca)} {capitalize(veiculo.modelo)}</p>
                            <p className="text-xs text-emerald-400 font-mono">{formatPlate(veiculo.placa)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                onClick={() => {
                  window.open(`https://wa.me/55${selectedCliente.telefone.replace(/\D/g, '')}`, '_blank');
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300"
              >
                <MessageCircle size={18} />
                WhatsApp
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-3 border border-zinc-700 rounded-xl text-zinc-400 hover:bg-zinc-800 transition-all duration-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
