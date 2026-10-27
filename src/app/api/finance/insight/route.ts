import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 90;

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

export interface Insight {
  headline: string;
  score: number;
  good: string[];
  risks: string[];
  actions: { title: string; why: string; impact: string }[];
  budgets: { category: string; limit: number; reason: string }[];
}

// Personal accounting advice from the numbers the Dashboard already computed (no raw bank text is sent).
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: 'Add ANTHROPIC_API_KEY in Vercel first.' }, { status: 501 });

  const { facts } = await request.json();
  if (!facts || typeof facts !== 'object') return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const prompt =
    'You are a calm, practical personal accountant for Nico, who lives in Indonesia (amounts in rupiah). ' +
    'Below are his finance numbers for one month (JSON). Write advice in simple Indonesian for a non-expert, short sentences, no jargon. ' +
    'Only use numbers present in the JSON; never invent data. Moves between his own accounts and pockets are already excluded from income and spending. ' +
    'Reply with ONE JSON object and nothing else: ' +
    '{"headline": one sentence verdict, "score": integer 0-100 for financial health this month, ' +
    '"good": up to 3 things going well, "risks": up to 4 risks or leaks (be specific with amounts), ' +
    '"actions": 3 to 5 concrete next steps each {"title","why","impact": expected effect in rupiah or months}, ' +
    '"budgets": up to 5 suggested monthly limits {"category","limit": rupiah number,"reason"}}. ' +
    'Consider: savings rate (target 20%+), emergency fund (target 3-6 months of spending), debt and credit use (keep card use under 30% of limit, pay PayLater first), ' +
    'recurring spending, categories that grew a lot versus last month, concentration of money in one place, and the 50/30/20 split.\n\nFACTS:\n' +
    JSON.stringify(facts).slice(0, 14000);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) {
    console.error('insight Anthropic error', res.status, await res.text());
    return NextResponse.json({ error: 'Could not get advice. Try again.' }, { status: 502 });
  }
  const d = await res.json();
  const text = (d.content as any[]).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return NextResponse.json({ error: 'The advice could not be read. Try again.' }, { status: 422 });
  try {
    const r = JSON.parse(m[0]);
    const arr = (v: unknown) => (Array.isArray(v) ? v : []);
    const insight: Insight = {
      headline: String(r.headline || ''),
      score: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))),
      good: arr(r.good).map(String).slice(0, 3),
      risks: arr(r.risks).map(String).slice(0, 4),
      actions: arr(r.actions).slice(0, 5).map((a: any) => ({ title: String(a.title || ''), why: String(a.why || ''), impact: String(a.impact || '') })),
      budgets: arr(r.budgets).slice(0, 5).map((b: any) => ({ category: String(b.category || ''), limit: Number(b.limit) || 0, reason: String(b.reason || '') })),
    };
    return NextResponse.json({ insight });
  } catch {
    return NextResponse.json({ error: 'The advice could not be read. Try again.' }, { status: 422 });
  }
}
