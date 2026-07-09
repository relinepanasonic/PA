'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CheckSquare, Wallet, Activity } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Brief', icon: LayoutDashboard },
  { href: '/todos', label: 'Todos', icon: CheckSquare },
  { href: '/finance', label: 'Finance', icon: Wallet },
  { href: '/activities', label: 'Activities', icon: Activity },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [optimisticPath, setOptimisticPath] = useState(pathname);

  useEffect(() => {
    setOptimisticPath(pathname);
  }, [pathname]);

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="glass-card rounded-full border border-white/15 shadow-[0_15px_35px_rgba(0,0,0,0.6)] px-2 py-1.5 flex items-center justify-around backdrop-blur-2xl">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? optimisticPath === '/'
              : optimisticPath.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={() => setOptimisticPath(item.href)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600/50 to-cyan-500/40 border border-blue-400/50 shadow-[0_0_18px_rgba(59,130,246,0.45)] text-white scale-105'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <item.icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
              {isActive && (
                <span className="text-xs font-semibold tracking-wide">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
