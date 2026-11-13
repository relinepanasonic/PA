import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { runJax } from '@/lib/ai/jax';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Jax in the app chat. The brain lives in lib/ai/jax.ts so WhatsApp uses exactly the same one.
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { messages, image } = await request.json();
  if (!Array.isArray(messages) || !messages.length || messages.length > 30) {
    return NextResponse.json({ error: 'Bad messages' }, { status: 400 });
  }

  const r = await runJax({ db: supabase, userId: user.id, messages, image, channel: 'app' });
  return r.ok ? NextResponse.json({ reply: r.reply }) : NextResponse.json({ error: r.error }, { status: r.status });
}
