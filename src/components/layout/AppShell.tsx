'use client';
import Header from './Header';
import BottomNav from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
  displayName?: string;
}

export default function AppShell({ children, displayName }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col relative">
      <Header displayName={displayName} />
      <main className="flex-1 pb-20 relative z-10">
        <div className="max-w-lg mx-auto">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
