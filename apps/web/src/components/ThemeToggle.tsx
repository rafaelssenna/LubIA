'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  collapsed?: boolean;
}

export default function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
  const { theme, toggleTheme, isLoaded } = useTheme();
  const isDark = theme === 'dark';

  // Don't render until theme is loaded to prevent hydration mismatch
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
      onClick={toggleTheme}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 w-full group
        text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active
        ${collapsed ? 'justify-center px-3' : ''}`}
      title={collapsed ? (isDark ? 'Tema Claro' : 'Tema Escuro') : undefined}
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      aria-pressed={isDark}
      role="switch"
    >
      {/* Icon container with rotation animation */}
      <div className="relative w-5 h-5">
        {/* Sun icon - visible in dark mode */}
        <Sun
          size={20}
          className={`absolute inset-0 transition-all duration-500 ease-in-out
            ${isDark
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 rotate-90 scale-0'
            } group-hover:text-warning group-hover:drop-shadow-[0_0_8px_rgba(255,213,79,0.5)]`}
        />
        {/* Moon icon - visible in light mode */}
        <Moon
          size={20}
          className={`absolute inset-0 transition-all duration-500 ease-in-out
            ${!isDark
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-0'
            } group-hover:text-secondary group-hover:drop-shadow-[0_0_8px_rgba(66,165,245,0.5)]`}
        />
      </div>

      {/* Label - only shown when expanded */}
      {!collapsed && (
        <span className="font-medium transition-colors duration-300">
          {isDark ? 'Tema Claro' : 'Tema Escuro'}
        </span>
      )}

      {/* Visual indicator - mini toggle */}
      {!collapsed && (
        <div className={`ml-auto w-8 h-4 rounded-full relative transition-colors duration-300
          ${isDark ? 'bg-primary-dark' : 'bg-border'}`}
        >
          <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300
            ${isDark
              ? 'left-0.5 bg-primary-light'
              : 'left-4 bg-foreground-muted'
            }`}
          />
        </div>
      )}
    </button>
  );
}
