import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { wibDate } from '@/lib/health';

export const dynamic = 'force-dynamic';

// The newest finished Health team report from today (WIB), if the morning run has happened.
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: team } = await supabase.from('ai_teams').select('id').eq('user_id', user.id).eq('slug', 'health').single();
  if (!team) return NextResponse.json({ report: null });

  const { data } = await supabase.from('ai_tasks').select('result,created_at')
    .eq('user_id', user.id).eq('team_id', team.id).eq('kind', 'goal').eq('status', 'done')
    .gte('created_at', `${wibDate()}T00:00:00+07:00`).order('created_at', { ascending: false }).limit(1);
  return NextResponse.json({ report: data?.[0]?.result ?? null, at: data?.[0]?.created_at ?? null });
}
