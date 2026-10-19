import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createCalendarEvent, listCalendarEvents } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = new URL(request.url).searchParams;
  const from = p.get('from') || new Date().toISOString();
  const to = p.get('to') || new Date(Date.now() + 7 * 86400000).toISOString();
  const r = await listCalendarEvents(supabase, user.id, from, to);
  return 'error' in r ? NextResponse.json(r, { status: 404 }) : NextResponse.json({ events: r });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json();
  if (typeof b.title !== 'string' || typeof b.startISO !== 'string') return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const r = await createCalendarEvent(supabase, user.id, b);
  return 'error' in r ? NextResponse.json(r, { status: 400 }) : NextResponse.json({ event: r });
}
