'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/finance', label: 'Dashboard' },
  { href: '/finance/transaksi', label: 'Transaksi' },
  { href: '/finance/buku-bank', label: 'Buku Bank' },
];

// Finance has three sub pages: Dashboard (self accounting, the default), Transaksi (the ledger) and Buku Bank (bank statements).
export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div>
      <div className="sticky top-0 z-20 -mx-4 px-4 py-2 mb-2 bg-[#040814]/90 backdrop-blur-md border-b border-white/5">
        <div className="flex gap-1.5 overflow-x-auto">
          {TABS.map((t) => {
            const active = t.href === '/finance' ? path === '/finance' : path.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  active
                    ? 'bg-gradient-to-r from-blue-600/60 to-cyan-500/50 border-cyan-400/60 text-white shadow-[0_0_14px_rgba(34,211,238,0.35)]'
                    : 'bg-white/5 border-white/10 text-slate-300'
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
