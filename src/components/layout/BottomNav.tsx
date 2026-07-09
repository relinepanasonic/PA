'use client';
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface/80 backdrop-blur-xl border-t border-border pb-safe">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16">
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-accent-light'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${
                isActive ? 'bg-accent/10' : ''
              }`}>
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-gradient-to-r from-accent-dark to-accent-light rounded-full" />
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-accent-light' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
