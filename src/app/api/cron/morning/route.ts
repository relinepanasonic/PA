import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runDailyTeamBrief } from '@/lib/ai/daily';
import { buildMorningBrief } from '@/lib/morning-brief';
import { notifyOwnerParts } from '@/lib/whatsapp';
import { wibDate } from '@/lib/health';
import type { Supa } from '@/lib/ai/tools';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const HEALTH_BRIEF =
  'Morning health summary. Nico just woke up. Read his Fitbit for today and the last few days, his recent gym sessions and his meals. ' +
  'Luna: how he slept and his resting heart rate. Rio: what to train today. Sari: what to eat today. ' +
  'Nara writes ONE short summary in Indonesian, easy to read aloud: sleep first, then movement, then the plan for today.';
const STOCK_BRIEF =
  'Daily stock recommendation for today before the IDX opens. Ratna: market mood, news, how the portfolio is doing and how earlier picks performed. ' +
  'Surya: scan the watchlist, choose 2 to 4 BUY, SELL or HOLD ideas with entry, target and stop loss, and save them. ' +
  'Bima writes ONE report in Indonesian that is easy to read aloud.';

// One morning job for everything (Vercel's free plan allows only 2 cron jobs):
//   1. the WhatsApp morning brief (schedule, to-dos, BBCA, 5 headlines)
//   2. the Health team report   3. the Stock Expert report (weekdays)
// Every part runs at most once per day, so a precise external trigger (cron-job.org at 08:00 WIB) and the Vercel cron can both call it safely.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 501 });

  const db = createClient(url, key, { auth: { persistSession: false } }) as unknown as Supa;
  const out: Record<string, unknown> = { date: wibDate() };
  const force = new URL(request.url).searchParams.get('force') === '1'; // for testing: send the brief again today

  // 1. WhatsApp morning brief, first, because it needs no AI and should arrive on time
  try {
    let userId = process.env.WHATSAPP_USER_ID || '';
    if (!userId) {
      const { data } = await db.from('profiles').select('id').order('created_at').limit(1);
      userId = data?.[0]?.id || '';
    }
    if (!userId) out.brief = 'no user';
    else {
      const marker = `[morning-brief] ${wibDate()}`;
      const { data: done } = await db.from('wa_messages').select('id').eq('user_id', userId).eq('content', marker).limit(1);
      if (done?.length && !force) out.brief = 'already sent today';
      else {
        const parts = await buildMorningBrief(db, userId);
        const sent = await notifyOwnerParts(parts);
        if (sent && !done?.length) await db.from('wa_messages').insert({ user_id: userId, role: 'assistant', content: marker });
        out.brief = sent ? 'sent' : 'send failed (check FONNTE_TOKEN and the numbers)';
      }
    }
  } catch (e) {
    console.error('Morning brief failed', e);
    out.brief = `failed: ${String((e as Error)?.message || e).slice(0, 150)}`;
  }

  // 2 and 3. the AI team reports (they text themselves to WhatsApp when done)
  try {
    out.health = await (await runDailyTeamBrief(request, { slug: 'health', prefix: 'Morning health summary', needs: 'fitbit', brief: HEALTH_BRIEF })).json();
  } catch (e) { out.health = `failed: ${String((e as Error)?.message || e).slice(0, 150)}`; }

  const weekday = new Date(`${wibDate()}T12:00:00+07:00`).getDay(); // 0 = Sunday
  if (weekday >= 1 && weekday <= 5) {
    try {
      out.stocks = await (await runDailyTeamBrief(request, { slug: 'stocks', prefix: 'Daily stock recommendation', needs: 'any', brief: STOCK_BRIEF })).json();
    } catch (e) { out.stocks = `failed: ${String((e as Error)?.message || e).slice(0, 150)}`; }
  } else out.stocks = 'skipped (weekend)';

  return NextResponse.json(out);
}
