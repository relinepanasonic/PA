'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { UserPlus, Mail, Lock, User } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });

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
          <UserPlus size={24} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Create Account</h1>
        <p className="text-sm text-text-muted mt-1">Start managing your life</p>
      </div>

      <form onSubmit={handleSignup} className="glow-card p-6 space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">
            {error}
          </div>
        )}

        <Input
          id="name"
          type="text"
          label="Full Name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={<User size={16} />}
          required
        />

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
          placeholder="Min. 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock size={16} />}
          minLength={6}
          required
        />

        <Button type="submit" fullWidth isLoading={loading} size="lg">
          Create Account
        </Button>
      </form>

      <p className="text-center text-sm text-text-muted mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-accent-light hover:underline font-medium">
          Sign In
        </Link>
      </p>
    </div>
  );
}
