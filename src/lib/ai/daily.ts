// Shared runner for the scheduled morning reports (Vercel Cron). Nobody is logged in, so it uses the service role key.
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createGoal, ensureTeams, runGoal } from '@/lib/ai/office-engine';
import { wibDate } from '@/lib/health';
import type { Supa } from '@/lib/ai/tools';

export async function runDailyTeamBrief(
  request: Request,
  opts: { slug: string; prefix: string; brief: string; needs: 'fitbit' | 'any' },
) {
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
  const base = db.from('profiles').select('id');
  const { data: users } = await (opts.needs === 'fitbit' ? base.not('fitbit_refresh_token', 'is', null) : base);
  const today = wibDate();
  const results: Record<string, string> = {};

  for (const u of (users ?? []) as { id: string }[]) {
    await ensureTeams(db, u.id);
    const { data: team } = await db.from('ai_teams').select('id').eq('user_id', u.id).eq('slug', opts.slug).single();
    if (!team) continue;

    const { data: prev } = await db.from('ai_tasks').select('id')
      .eq('user_id', u.id).eq('team_id', team.id).eq('kind', 'goal').like('title', `${opts.prefix}%`)
      .gte('created_at', `${today}T00:00:00+07:00`).limit(1);
    if (prev?.length) { results[u.id] = 'already done'; continue; }

    const g = await createGoal(db, u.id, team.id, opts.brief);
    if ('error' in g) { results[u.id] = String(g.error); continue; }
    const r = await runGoal(db, u.id, g.id as string, 50_000);
    results[u.id] = r.done ? (r.error ? `failed: ${r.error}` : 'done') : 'still running';
  }
  return NextResponse.json({ date: today, results });
}
