import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createGoal, ensureTeams, runGoal } from '@/lib/ai/office-engine';
import { wibDate } from '@/lib/health';
import type { Supa } from '@/lib/ai/tools';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BRIEF =
  'Morning health summary. Nico just woke up. Read his Fitbit for today and the last few days, his recent gym sessions and his meals. ' +
  'Luna: how he slept and his resting heart rate. Rio: what to train today. Sari: what to eat today. ' +
  'Nara writes ONE short summary in Indonesian, easy to read aloud: sleep first, then movement, then the plan for today.';

// Vercel Cron calls this every morning at 08:00 WIB (01:00 UTC, see vercel.json).
// It needs CRON_SECRET and SUPABASE_SERVICE_ROLE_KEY because nobody is logged in when it runs.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or ANTHROPIC_API_KEY' }, { status: 501 });
  }

  const db = createClient(url, key, { auth: { persistSession: false } }) as unknown as Supa;
  const { data: users } = await db.from('profiles').select('id').not('fitbit_refresh_token', 'is', null);
  const today = wibDate();
  const results: Record<string, string> = {};

  for (const u of (users ?? []) as { id: string }[]) {
    await ensureTeams(db, u.id);
    const { data: team } = await db.from('ai_teams').select('id').eq('user_id', u.id).eq('slug', 'health').single();
    if (!team) continue;

    // already done today?
    const { data: prev } = await db.from('ai_tasks').select('id')
      .eq('user_id', u.id).eq('team_id', team.id).eq('kind', 'goal').like('title', 'Morning health summary%')
      .gte('created_at', `${today}T00:00:00+07:00`).limit(1);
    if (prev?.length) { results[u.id] = 'already done'; continue; }

    const g = await createGoal(db, u.id, team.id, BRIEF);
    if ('error' in g) { results[u.id] = String(g.error); continue; }
    const r = await runGoal(db, u.id, g.id as string, 50_000);
    results[u.id] = r.done ? (r.error ? `failed: ${r.error}` : 'done') : 'still running';
  }
  return NextResponse.json({ date: today, results });
}
