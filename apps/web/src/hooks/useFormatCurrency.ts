'use client';

import { useCallback } from 'react';
import { useFinancialVisibility } from '@/contexts/FinancialVisibilityContext';

const HIDDEN_VALUE = '\u2022\u2022\u2022\u2022\u2022';

export function useFormatCurrency() {
  const { valuesHidden } = useFinancialVisibility();

  return useCallback((value: number) => {
    if (valuesHidden) return HIDDEN_VALUE;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }, [valuesHidden]);
}
