'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { LogIn, Mail, Lock } from 'lucide-react';

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
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-dark to-accent flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent/20">
          <LogIn size={24} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Welcome Back</h1>
        <p className="text-sm text-text-muted mt-1">Sign in to your dashboard</p>
      </div>

      <form onSubmit={handleLogin} className="glow-card p-6 space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">
            {error}
          </div>
        )}
        
        <Input
          id="email"
          type="email"
          label="Email"
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

        <Button type="submit" fullWidth isLoading={loading} size="lg">
          Sign In
        </Button>
      </form>

      <p className="text-center text-sm text-text-muted mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-accent-light hover:underline font-medium">
          Sign Up
        </Link>
      </p>
    </div>
  );
}
