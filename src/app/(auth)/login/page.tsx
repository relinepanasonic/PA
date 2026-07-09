'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Sparkles, Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="animate-fade-in flex flex-col justify-between min-h-[85vh]">
      {/* Top Welcome Section */}
      <div className="pt-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles size={14} /> Personal Assistant AI
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Welcome Back
        </h1>
        <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">
          Your command center for daily tasks, finances, and sports activities
        </p>
      </div>

      {/* Ultra Glass Bottom Card (FitPulse Studio Incubator style) */}
      <div className="mt-8">
        <form onSubmit={handleLogin} className="glass-card rounded-[32px] p-7 border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.7)] space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-danger/15 border border-danger/30 text-xs text-red-300 font-medium text-center">
              {error}
            </div>
          )}
          
          <Input
            id="email"
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={16} />}
            required
          />
          
          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={16} />}
            required
          />

          <div className="pt-2">
            <Button type="submit" fullWidth isLoading={loading} size="lg" className="rounded-full shadow-[0_0_25px_rgba(59,130,246,0.45)]">
              <span className="flex items-center justify-center gap-2">
                Sign In <ArrowRight size={18} />
              </span>
            </Button>
          </div>

          <div className="pt-2 text-center">
            <p className="text-xs text-slate-400">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-semibold underline-offset-4 hover:underline ml-1">
                Create Account
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
