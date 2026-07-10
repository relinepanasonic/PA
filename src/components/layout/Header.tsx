'use client';
import { User } from 'lucide-react';
import Image from 'next/image';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

interface HeaderProps {
  displayName?: string;
}

export default function Header({ displayName = 'User' }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl border-b border-white/10">
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          {/* Sapphire 3D Logo Badge */}
          <div className="relative w-10 h-10 rounded-2xl overflow-hidden glass-card p-0.5 border border-white/20 shadow-[0_0_20px_rgba(59,130,246,0.35)] flex items-center justify-center">
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
            <p className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">{getFormattedDate()}</p>
            <h1 className="text-base font-extrabold text-white">
              {getGreeting()}, <span className="text-blue-400">{displayName.split(' ')[0]}</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg border border-white/20">
            <User size={18} className="text-white" />
          </button>
        </div>
      </div>
    </header>
  );
}
