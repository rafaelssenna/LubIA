'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface FinancialVisibilityContextType {
  valuesHidden: boolean;
  toggleVisibility: () => void;
  isLoaded: boolean;
}

const FinancialVisibilityContext = createContext<FinancialVisibilityContextType | undefined>(undefined);

const STORAGE_KEY = 'loopia-hide-values';

export function FinancialVisibilityProvider({ children }: { children: ReactNode }) {
  const [valuesHidden, setValuesHidden] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      setValuesHidden(true);
    }
    setIsLoaded(true);
  }, []);

  const toggleVisibility = useCallback(() => {
    setValuesHidden(prev => {
      const newValue = !prev;
      localStorage.setItem(STORAGE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  return (
    <FinancialVisibilityContext.Provider value={{ valuesHidden, toggleVisibility, isLoaded }}>
      {children}
    </FinancialVisibilityContext.Provider>
  );
}

export function useFinancialVisibility() {
  const context = useContext(FinancialVisibilityContext);
  if (context === undefined) {
    throw new Error('useFinancialVisibility must be used within a FinancialVisibilityProvider');
  }
  return context;
}
