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

  // No mobile: sem margin. No desktop: margin conforme sidebar
  const marginClass = mounted
    ? collapsed ? 'ml-0 md:ml-20' : 'ml-0 md:ml-72'
    : 'ml-0 md:ml-72';

  return (
    <main
      className={`flex-1 min-w-0 transition-all duration-300 pt-14 md:pt-0 ${marginClass}`}
    >
      <div className="max-w-[1600px] mx-auto w-full">
        {children}
      </div>
    </main>
  );
}
