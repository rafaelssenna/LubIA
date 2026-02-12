'use client';

import { useSidebar } from '@/contexts/SidebarContext';
import { ReactNode, useEffect, useState } from 'react';

interface MainContentProps {
  children: ReactNode;
}

export default function MainContent({ children }: MainContentProps) {
  const { collapsed } = useSidebar();
  const [mounted, setMounted] = useState(false);

  // Evita problema de hidratação
  useEffect(() => {
    setMounted(true);
  }, []);

  // Valor padrão para SSR e antes do mount
  const marginClass = mounted
    ? collapsed ? 'ml-20' : 'ml-72'
    : 'ml-72';

  return (
    <main
      className={`flex-1 min-w-0 transition-all duration-300 ${marginClass}`}
      style={{ marginLeft: mounted ? undefined : '288px' }}
    >
      {children}
    </main>
  );
}
