'use client';

import { useSidebar } from '@/contexts/SidebarContext';
import { ReactNode } from 'react';

interface MainContentProps {
  children: ReactNode;
}

export default function MainContent({ children }: MainContentProps) {
  const { collapsed } = useSidebar();

  return (
    <main
      className={`flex-1 transition-all duration-300 ${
        collapsed ? 'ml-20' : 'ml-72'
      }`}
    >
      {children}
    </main>
  );
}
