import Image from 'next/image';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#121212]">
      {/* Header minimalista */}
      <header className="py-8 border-b border-[#333333]">
        <div className="max-w-2xl mx-auto flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="LoopIA"
            width={320}
            height={100}
            className="h-24 w-auto brightness-0 invert"
          />
        </div>
      </header>
      {children}
    </div>
  );
}
