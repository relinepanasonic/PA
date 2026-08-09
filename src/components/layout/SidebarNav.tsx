'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Wallet, Activity, TrendingUp } from 'lucide-react';
import Image from 'next/image';

const navItems = [
  { href: '/', label: 'Brief', icon: LayoutDashboard },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/finance', label: 'Finance', icon: Wallet },
  { href: '/investasi', label: 'Investasi', icon: TrendingUp },
  { href: '/activities', label: 'Activities', icon: Activity },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const [optimisticPath, setOptimisticPath] = useState(pathname);

  useEffect(() => {
    setOptimisticPath(pathname);
  }, [pathname]);

  return (
    <nav className="hidden md:flex flex-col w-[260px] h-screen fixed left-0 top-0 pt-6 pb-6 pl-6 z-40">
      <div className="glass-card rounded-3xl border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.6)] h-full w-full flex flex-col backdrop-blur-2xl p-4 relative overflow-hidden">
        
        {/* Abstract Glow Background */}
        <div className="absolute top-0 left-0 w-full h-48 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none" />

        <div className="flex items-center gap-3 mb-8 px-2 relative z-10">
          <div className="relative w-10 h-10 rounded-2xl overflow-hidden glass-card p-0.5 border border-white/20 shadow-[0_0_20px_rgba(59,130,246,0.35)] flex items-center justify-center bg-white/5">
            <Image
              src="/logo.png"
              alt="PersonalAssist Logo"
              width={38}
              height={38}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-tight leading-none">FitPulse</h2>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">Assistant</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 relative z-10">
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
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/50 to-cyan-500/40 border border-blue-400/50 shadow-[0_0_18px_rgba(59,130,246,0.25)] text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-slate-500 group-hover:text-blue-400 group-hover:bg-blue-500/10'}`}>
                  <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-sm font-bold tracking-wide transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
