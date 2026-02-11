export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#121212]">
      {/* Header minimalista */}
      <header className="p-4 border-b border-[#333333]">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#43A047] to-[#1B5E20] rounded-xl flex items-center justify-center">
            <span className="text-xl font-bold text-white">L</span>
          </div>
          <span className="text-xl font-bold text-[#E8E8E8]">
            Lub<span className="text-[#43A047]">IA</span>
          </span>
        </div>
      </header>
      {children}
    </div>
  );
}
