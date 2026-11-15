import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { buildMorningBrief } from '@/lib/morning-brief';
import { allowedNumbers, lastSendError, notifyOwner } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const maxDuration = 60;

// "Send the morning brief to my WhatsApp now": the logged-in owner triggers it from the app (handy to test).
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.FONNTE_TOKEN || !allowedNumbers().length) {
    return NextResponse.json({ error: 'WhatsApp is not set up yet: add FONNTE_TOKEN and WHATSAPP_ALLOWED_NUMBERS in Vercel.' }, { status: 501 });
  }
  try {
    const text = await buildMorningBrief(supabase, user.id);
    const sent = await notifyOwner(text);
    return sent ? NextResponse.json({ ok: true, preview: text }) : NextResponse.json({ error: `Fonnte did not accept the message. Fonnte says: ${lastSendError() || 'no reason given'}`, preview: text }, { status: 502 });
  } catch (e) {
    console.error('Brief now failed', e);
    return NextResponse.json({ error: String((e as Error)?.message || e).slice(0, 200) }, { status: 500 });
  }
}
