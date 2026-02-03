'use client';

import Header from '@/components/Header';
import { Plus, Search, Phone, Car, Eye, MessageCircle, X, Edit, Trash2, User, Mail, MapPin, CreditCard, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';

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
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
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
    // Tenta extrair dados de um endereço existente
    // Formato esperado: "Rua X, 123 - Compl - Bairro - Cidade/UF - CEP: 12345-678"
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

    // Extrai CEP
    const cepMatch = endereco.match(/CEP:\s*(\d{5}-?\d{3})/);
    if (cepMatch) {
      result.cep = cepMatch[1];
    }

    // Remove o CEP da string para processar o resto
    let resto = endereco.replace(/\s*-?\s*CEP:\s*\d{5}-?\d{3}/, '').trim();

    // Extrai Cidade/UF (último item antes do CEP)
    const cidadeUfMatch = resto.match(/([^-]+)\/([A-Z]{2})$/i);
    if (cidadeUfMatch) {
      result.cidade = cidadeUfMatch[1].trim();
      result.uf = cidadeUfMatch[2].toUpperCase();
      resto = resto.replace(/\s*-?\s*[^-]+\/[A-Z]{2}$/i, '').trim();
    }

    // Divide o resto por " - "
    const partes = resto.split(/\s*-\s*/);

    if (partes.length >= 1 && partes[0]) {
      // Primeira parte: Rua e número
      const ruaNumero = partes[0].match(/^(.+?),\s*(\d+\w*)$/);
      if (ruaNumero) {
        result.rua = ruaNumero[1].trim();
        result.numero = ruaNumero[2].trim();
      } else {
        result.rua = partes[0].trim();
      }
    }

    if (partes.length >= 2 && partes[1]) {
      // Segunda parte pode ser complemento ou bairro
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
    // Parse existing address or reset
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

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatCPF = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return cpf;
  };

  return (
    <div className="min-h-screen bg-[#000000]">
      <Header title="Clientes" subtitle="Gerencie seus clientes" />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#22c55e]/20 rounded-lg">
                <User size={20} className="text-[#22c55e]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{clientes.length}</p>
                <p className="text-xs text-[#6B7280]">Total Clientes</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Car size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {clientes.reduce((acc, c) => acc + c.veiculosCount, 0)}
                </p>
                <p className="text-xs text-[#6B7280]">Total Veículos</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-xl p-4 hidden md:block">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <MessageCircle size={20} className="text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">0</p>
                <p className="text-xs text-[#6B7280]">Msgs Enviadas (Hoje)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
            <input
              type="text"
              placeholder="Buscar cliente por nome, telefone ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1F1F1F] border border-[#333333] rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e] transition-colors"
            />
          </div>
          <button
            onClick={() => {
              setForm({ nome: '', telefone: '', email: '', cpf: '', endereco: '' });
              setEnderecoForm({ cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={18} />
            Novo Cliente
          </button>
        </div>

        {/* Lista de Clientes */}
        <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#333333]">
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#6B7280]">Cliente</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#6B7280]">Telefone</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#6B7280]">CPF</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-[#6B7280]">Veículos</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-[#6B7280]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[#6B7280]">
                      <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                      Carregando...
                    </td>
                  </tr>
                ) : clientes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[#6B7280]">
                      Nenhum cliente encontrado
                    </td>
                  </tr>
                ) : (
                  clientes.map((cliente) => (
                    <tr key={cliente.id} className="border-b border-[#333333]/50 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#22c55e] to-[#166534] rounded-xl flex items-center justify-center text-white font-bold">
                            {cliente.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium text-white">{cliente.nome}</span>
                            {cliente.email && (
                              <p className="text-xs text-[#6B7280]">{cliente.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-[#94a3b8]">
                          <Phone size={14} className="text-[#22c55e]" />
                          {formatPhone(cliente.telefone)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#94a3b8]">
                          {cliente.cpf ? formatCPF(cliente.cpf) : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#22c55e]/20 rounded-full">
                          <Car size={14} className="text-[#22c55e]" />
                          <span className="text-[#22c55e] font-medium">{cliente.veiculosCount}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              window.open(`https://wa.me/55${cliente.telefone.replace(/\D/g, '')}`, '_blank');
                            }}
                            className="p-2 hover:bg-[#25D366]/20 rounded-lg text-[#94a3b8] hover:text-[#25D366] transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </button>
                          <button
                            onClick={() => viewDetails(cliente)}
                            className="p-2 hover:bg-blue-500/20 rounded-lg text-[#94a3b8] hover:text-blue-400 transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => openEditModal(cliente)}
                            className="p-2 hover:bg-[#333333] rounded-lg text-[#94a3b8] hover:text-white transition-colors"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCliente(cliente);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 hover:bg-red-500/20 rounded-lg text-[#94a3b8] hover:text-red-400 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Novo Cliente */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl w-full max-w-md animate-fade-in">
            <div className="p-6 border-b border-[#333333] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Novo Cliente</h2>
                <p className="text-sm text-[#6B7280] mt-1">Cadastre um novo cliente</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[#333333] rounded-lg text-[#6B7280] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome completo"
                  className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Telefone *</label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">CPF</label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                />
              </div>
              {/* Endereço */}
              <div className="pt-2 border-t border-[#333333]">
                <label className="block text-sm font-medium text-[#94a3b8] mb-3">Endereço</label>
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
                        className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e] text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={enderecoForm.rua}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, rua: e.target.value })}
                        placeholder={buscandoCep ? 'Buscando...' : 'Rua'}
                        disabled={buscandoCep}
                        className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e] text-sm disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <input
                        type="text"
                        value={enderecoForm.numero}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, numero: e.target.value })}
                        placeholder="Nº"
                        className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e] text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={enderecoForm.complemento}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, complemento: e.target.value })}
                        placeholder="Complemento"
                        className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e] text-sm"
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
                        className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e] text-sm disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={enderecoForm.cidade}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, cidade: e.target.value })}
                        placeholder="Cidade"
                        disabled={buscandoCep}
                        className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e] text-sm disabled:opacity-50"
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
                        className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e] text-sm disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Cliente */}
      {showEditModal && selectedCliente && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl w-full max-w-md animate-fade-in">
            <div className="p-6 border-b border-[#333333] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Editar Cliente</h2>
                <p className="text-sm text-[#6B7280] mt-1">Atualize as informações do cliente</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-[#333333] rounded-lg text-[#6B7280] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Telefone *</label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">CPF</label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e]"
                />
              </div>
              {/* Endereço */}
              <div className="pt-2 border-t border-[#333333]">
                <label className="block text-sm font-medium text-[#94a3b8] mb-3">Endereço</label>
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
                        className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e] text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={enderecoForm.rua}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, rua: e.target.value })}
                        placeholder={buscandoCep ? 'Buscando...' : 'Rua'}
                        disabled={buscandoCep}
                        className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e] text-sm disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <input
                        type="text"
                        value={enderecoForm.numero}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, numero: e.target.value })}
                        placeholder="Nº"
                        className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e] text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={enderecoForm.complemento}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, complemento: e.target.value })}
                        placeholder="Complemento"
                        className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e] text-sm"
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
                        className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e] text-sm disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={enderecoForm.cidade}
                        onChange={(e) => setEnderecoForm({ ...enderecoForm, cidade: e.target.value })}
                        placeholder="Cidade"
                        disabled={buscandoCep}
                        className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e] text-sm disabled:opacity-50"
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
                        className="w-full bg-[#000000] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#22c55e] text-sm disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {showDeleteConfirm && selectedCliente && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl w-full max-w-md animate-fade-in">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-semibold text-white">Confirmar Exclusão</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-500/20 rounded-xl">
                  <Trash2 size={24} className="text-red-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{selectedCliente.nome}</p>
                  <p className="text-sm text-[#6B7280]">{formatPhone(selectedCliente.telefone)}</p>
                </div>
              </div>
              {selectedCliente.veiculosCount > 0 ? (
                <div className="p-4 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400 text-sm">
                  Este cliente possui {selectedCliente.veiculosCount} veículo(s) cadastrado(s).
                  Remova os veículos primeiro para poder excluir o cliente.
                </div>
              ) : (
                <p className="text-[#94a3b8] text-sm">
                  Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
                </p>
              )}
            </div>
            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedCliente(null);
                }}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
              >
                Cancelar
              </button>
              {selectedCliente.veiculosCount === 0 && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-700 rounded-xl text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#333333] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-[#22c55e] to-[#166534] rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                  {selectedCliente.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedCliente.nome}</h2>
                  <p className="text-sm text-[#6B7280]">Cliente #{selectedCliente.id}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-[#333333] rounded-lg text-[#6B7280] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#000000] rounded-xl">
                  <div className="flex items-center gap-2 text-[#6B7280] mb-1">
                    <Phone size={14} />
                    <span className="text-xs">Telefone</span>
                  </div>
                  <p className="text-white">{formatPhone(selectedCliente.telefone)}</p>
                </div>
                <div className="p-4 bg-[#000000] rounded-xl">
                  <div className="flex items-center gap-2 text-[#6B7280] mb-1">
                    <Car size={14} />
                    <span className="text-xs">Veículos</span>
                  </div>
                  <p className="text-white">{selectedCliente.veiculosCount}</p>
                </div>
              </div>
              {selectedCliente.email && (
                <div className="p-4 bg-[#000000] rounded-xl">
                  <div className="flex items-center gap-2 text-[#6B7280] mb-1">
                    <Mail size={14} />
                    <span className="text-xs">Email</span>
                  </div>
                  <p className="text-white">{selectedCliente.email}</p>
                </div>
              )}
              {selectedCliente.cpf && (
                <div className="p-4 bg-[#000000] rounded-xl">
                  <div className="flex items-center gap-2 text-[#6B7280] mb-1">
                    <CreditCard size={14} />
                    <span className="text-xs">CPF</span>
                  </div>
                  <p className="text-white">{formatCPF(selectedCliente.cpf)}</p>
                </div>
              )}
              {selectedCliente.endereco && (
                <div className="p-4 bg-[#000000] rounded-xl">
                  <div className="flex items-center gap-2 text-[#6B7280] mb-1">
                    <MapPin size={14} />
                    <span className="text-xs">Endereço</span>
                  </div>
                  <p className="text-white">{selectedCliente.endereco}</p>
                </div>
              )}

              {/* Veículos */}
              {selectedCliente.veiculos && selectedCliente.veiculos.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-[#94a3b8] mb-3">Veículos</h3>
                  <div className="space-y-2">
                    {selectedCliente.veiculos.map((veiculo) => (
                      <div key={veiculo.id} className="p-4 bg-[#000000] rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Car size={16} className="text-blue-400" />
                          </div>
                          <div>
                            <p className="text-white">{veiculo.marca} {veiculo.modelo}</p>
                            <p className="text-xs text-[#22c55e] font-mono">{veiculo.placa}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              <button
                onClick={() => {
                  window.open(`https://wa.me/55${selectedCliente.telefone.replace(/\D/g, '')}`, '_blank');
                }}
                className="flex items-center gap-2 px-6 py-3 bg-[#25D366] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
              >
                <MessageCircle size={18} />
                WhatsApp
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
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
