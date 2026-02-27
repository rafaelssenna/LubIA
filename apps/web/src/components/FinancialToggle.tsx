'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useFinancialVisibility } from '@/contexts/FinancialVisibilityContext';

interface FinancialToggleProps {
  collapsed?: boolean;
}

export default function FinancialToggle({ collapsed = false }: FinancialToggleProps) {
  const { valuesHidden, toggleVisibility, isLoaded } = useFinancialVisibility();

  if (!isLoaded) {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${collapsed ? 'justify-center px-3' : ''}`}>
        <div className="w-5 h-5 bg-muted/20 rounded animate-pulse" />
        {!collapsed && <div className="h-4 w-20 bg-muted/20 rounded animate-pulse" />}
      </div>
    );
  }

  return (
    <button
      onClick={toggleVisibility}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 w-full group
        text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active
        ${collapsed ? 'justify-center px-3' : ''}`}
      title={collapsed ? (valuesHidden ? 'Mostrar Valores' : 'Ocultar Valores') : undefined}
      aria-label={valuesHidden ? 'Mostrar valores financeiros' : 'Ocultar valores financeiros'}
      aria-pressed={valuesHidden}
      role="switch"
    >
      <div className="relative w-5 h-5">
        <Eye
          size={20}
          className={`absolute inset-0 transition-all duration-500 ease-in-out
            ${!valuesHidden
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 rotate-90 scale-0'
            } group-hover:text-primary group-hover:drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]`}
        />
        <EyeOff
          size={20}
          className={`absolute inset-0 transition-all duration-500 ease-in-out
            ${valuesHidden
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-0'
            } group-hover:text-warning group-hover:drop-shadow-[0_0_8px_rgba(255,213,79,0.5)]`}
        />
      </div>

      {!collapsed && (
        <span className="font-medium transition-colors duration-300">
          {valuesHidden ? 'Mostrar Valores' : 'Ocultar Valores'}
        </span>
      )}

      {!collapsed && (
        <div className={`ml-auto w-8 h-4 rounded-full relative transition-colors duration-300
          ${valuesHidden ? 'bg-warning/60' : 'bg-border'}`}
        >
          <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300
            ${valuesHidden
              ? 'left-4 bg-warning'
              : 'left-0.5 bg-foreground-muted'
            }`}
          />
        </div>
      )}
    </button>
  );
}
