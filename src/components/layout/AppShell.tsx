'use client';
import Header from './Header';
import BottomNav from './BottomNav';
import SidebarNav from './SidebarNav';

interface AppShellProps {
  children: React.ReactNode;
  displayName?: string;
}

export default function AppShell({ children, displayName }: AppShellProps) {
  return (
    <div className="min-h-screen flex relative">
      <SidebarNav />
      <div className="flex-1 flex flex-col min-w-0 md:pl-[260px]">
        <Header displayName={displayName} />
        <main className="flex-1 pb-24 md:pb-6 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
