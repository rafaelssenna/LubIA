'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

export interface PagamentoItem {
  tipo: string;
  valor: number;
  dataPagamentoPrevista?: string;
}

interface MultiPaymentSelectorProps {
  total: number;
  pagamentos: PagamentoItem[];
  onChange: (pagamentos: PagamentoItem[]) => void;
  disabled?: boolean;
}

const FORMAS_PAGAMENTO = [
  { value: 'PIX', label: 'PIX', icon: '📱' },
  { value: 'DINHEIRO', label: 'Dinheiro', icon: '💵' },
  { value: 'CREDITO', label: 'Crédito', icon: '💳' },
  { value: 'DEBITO', label: 'Débito', icon: '💳' },
  { value: 'CREDITO_PESSOAL', label: 'Crédito Pessoal', icon: '📋' },
];

export default function MultiPaymentSelector({
  total,
  pagamentos,
  onChange,
  disabled = false,
}: MultiPaymentSelectorProps) {
  const [localPagamentos, setLocalPagamentos] = useState<PagamentoItem[]>(pagamentos);

  // Sincronizar com prop externa
  useEffect(() => {
    setLocalPagamentos(pagamentos);
  }, [pagamentos]);

  // Calcular soma dos pagamentos
  const somaPagamentos = localPagamentos.reduce((acc, p) => acc + (p.valor || 0), 0);
  const diferenca = total - somaPagamentos;
  const isValid = Math.abs(diferenca) < 0.01; // Tolerância para arredondamento

  // Atualizar pagamento
  const updatePagamento = (index: number, field: keyof PagamentoItem, value: any) => {
    const novos = [...localPagamentos];
    novos[index] = { ...novos[index], [field]: value };
    setLocalPagamentos(novos);
    onChange(novos);
  };

  // Adicionar pagamento
  const addPagamento = () => {
    const restante = diferenca > 0 ? diferenca : 0;
    const novos = [...localPagamentos, { tipo: 'PIX', valor: restante }];
    setLocalPagamentos(novos);
    onChange(novos);
  };

  // Remover pagamento
  const removePagamento = (index: number) => {
    if (localPagamentos.length <= 1) return; // Manter pelo menos um
    const novos = localPagamentos.filter((_, i) => i !== index);
    setLocalPagamentos(novos);
    onChange(novos);
  };

  // Formatar valor para exibição
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Parsear valor de string para número
  const parseValue = (str: string): number => {
    const cleaned = str.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  // Formatar valor para input
  const formatInputValue = (value: number): string => {
    if (value === 0) return '';
    return value.toFixed(2).replace('.', ',');
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm text-muted mb-2">Formas de Pagamento *</label>

      {/* Lista de pagamentos */}
      <div className="space-y-2">
        {localPagamentos.map((pagamento, index) => (
          <div key={index} className="flex flex-col gap-2 p-3 bg-background rounded-xl border border-white/10">
            <div className="flex items-center gap-2">
              {/* Seletor de forma */}
              <select
                value={pagamento.tipo}
                onChange={(e) => updatePagamento(index, 'tipo', e.target.value)}
                disabled={disabled}
                className="flex-1 px-3 py-2 bg-card rounded-lg border border-white/10 text-foreground focus:outline-none focus:border-primary/50"
              >
                {FORMAS_PAGAMENTO.map((forma) => (
                  <option key={forma.value} value={forma.value}>
                    {forma.icon} {forma.label}
                  </option>
                ))}
              </select>

              {/* Valor */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">R$</span>
                <input
                  type="text"
                  value={formatInputValue(pagamento.valor)}
                  onChange={(e) => {
                    const val = parseValue(e.target.value);
                    updatePagamento(index, 'valor', val);
                  }}
                  disabled={disabled}
                  placeholder="0,00"
                  className="w-28 pl-10 pr-3 py-2 bg-card rounded-lg border border-white/10 text-foreground text-right focus:outline-none focus:border-primary/50"
                />
              </div>

              {/* Botão remover */}
              {localPagamentos.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePagamento(index)}
                  disabled={disabled}
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            {/* Data prevista para Crédito Pessoal */}
            {pagamento.tipo === 'CREDITO_PESSOAL' && (
              <div className="flex items-center gap-2 pl-1">
                <span className="text-xs text-amber-400">Data prevista:</span>
                <input
                  type="date"
                  value={pagamento.dataPagamentoPrevista || ''}
                  onChange={(e) => updatePagamento(index, 'dataPagamentoPrevista', e.target.value)}
                  disabled={disabled}
                  className="flex-1 px-3 py-1.5 bg-card rounded-lg border border-amber-500/30 text-foreground text-sm focus:outline-none focus:border-amber-500/50"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Botão adicionar */}
      <button
        type="button"
        onClick={addPagamento}
        disabled={disabled}
        className="w-full p-3 border border-dashed border-white/20 rounded-xl text-muted hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Plus size={18} />
        Adicionar forma de pagamento
      </button>

      {/* Resumo */}
      <div className={`p-3 rounded-xl border ${
        isValid
          ? 'bg-primary/10 border-primary/30'
          : 'bg-red-500/10 border-red-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isValid ? (
              <CheckCircle size={18} className="text-primary" />
            ) : (
              <AlertCircle size={18} className="text-red-400" />
            )}
            <span className="text-sm text-muted">Total informado:</span>
          </div>
          <span className={`font-bold ${isValid ? 'text-primary' : 'text-red-400'}`}>
            {formatCurrency(somaPagamentos)}
          </span>
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-sm text-muted">Total da venda:</span>
          <span className="font-medium text-foreground">{formatCurrency(total)}</span>
        </div>

        {!isValid && (
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-red-500/20">
            <span className="text-sm text-red-400">
              {diferenca > 0 ? 'Faltam:' : 'Excesso:'}
            </span>
            <span className="font-bold text-red-400">
              {formatCurrency(Math.abs(diferenca))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
