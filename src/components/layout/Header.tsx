'use client';
import { Bell, User } from 'lucide-react';

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
    <header className="sticky top-0 z-30 bg-background/60 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        <div>
          <p className="text-xs text-text-muted">{getFormattedDate()}</p>
          <h1 className="text-lg font-bold text-text-primary">
            {getGreeting()}, <span className="text-accent-light">{displayName.split(' ')[0]}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative p-2 rounded-xl bg-surface-light/50 text-text-muted hover:text-text-primary transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
          </button>
          <button className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-dark to-accent flex items-center justify-center">
            <User size={18} className="text-white" />
          </button>
        </div>
      </div>
    </header>
  );
}
