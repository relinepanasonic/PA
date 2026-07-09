export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Decorative gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px]" />
      <div className="relative z-10 w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}
