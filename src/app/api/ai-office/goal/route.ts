import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createGoal } from '@/lib/ai/office-engine';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'Add ANTHROPIC_API_KEY in Vercel first.' }, { status: 501 });
  const { teamId, text } = await request.json();
  if (typeof teamId !== 'string' || typeof text !== 'string') return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const res = await createGoal(supabase, user.id, teamId, text);
  return NextResponse.json(res, { status: 'error' in res ? 400 : 200 });
}
