'use client';

import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Header minimalista */}
      <header className="py-8 border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-center">
          <Image
            src={theme === 'light' ? '/logo.tema.claro.png' : '/logo.png'}
            alt="LoopIA"
            width={320}
            height={100}
            className="h-24 w-auto"
          />
        </div>
      </header>
      {children}
    </div>
  );
}
