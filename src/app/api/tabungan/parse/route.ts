import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

export interface PortfolioRow {
  name: string;
  kind: 'main' | 'business' | 'saving';
  opening: number;
  income: number;
  expense: number;
  ending: number;
  /** opening + income - expense - ending; should be about 0 */
  diff: number;
}

const PROMPT =
  'This is a monthly "Laporan Portofolio" from Blu by BCA Digital: a table of the customer\'s accounts and saving pockets. ' +
  'Reply with ONE JSON object and nothing else: {"period":"YYYY-MM","rows":[{"name":string,"opening":number,"income":number,"expense":number,"ending":number}],"total_ending":number}. ' +
  'Columns in the table are: Saldo Awal (opening), Pemasukan (income), Pengeluaran (expense), Saldo Akhir (ending). ' +
  'One row per line under bluAccount, bluBisnis and every bluSaving/bluGether pocket (use the pocket name exactly as printed, e.g. "Investasi", "Bills & Cicilan"); do NOT include the TOTAL row in rows. ' +
  'Indonesian numbers like 1.234.567,89 mean 1234567.89. All values are positive numbers (expense positive even if printed with a minus). ' +
  'Check each row: opening + income - expense = ending; if your reading does not satisfy it, read the row again more carefully. total_ending is the Total Portofolio.';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: 'Add ANTHROPIC_API_KEY in Vercel first.' }, { status: 501 });

  const { kind, data } = await request.json();
  if (!['pdf', 'image'].includes(kind) || typeof data !== 'string' || !data || data.length > 5_800_000) {
    return NextResponse.json({ error: 'Send a PDF or a picture under 4 MB.' }, { status: 400 });
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: [
          kind === 'pdf'
            ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
            : { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } },
          { type: 'text', text: PROMPT },
        ],
      }],
    }),
  });
  if (!res.ok) {
    console.error('tabungan Anthropic error', res.status, await res.text());
    return NextResponse.json({ error: 'Could not read this file. Try again.' }, { status: 502 });
  }
  const d = await res.json();
  const text = (d.content as any[]).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return NextResponse.json({ error: 'This does not look like a portfolio report.' }, { status: 422 });

  try {
    const raw = JSON.parse(m[0]);
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.abs(v) : 0);
    const rows: PortfolioRow[] = (raw.rows as any[]).map((r) => {
      const name = String(r.name || '').trim();
      const lower = name.toLowerCase().replace(/\s+/g, '');
      const row = { name, opening: num(r.opening), income: num(r.income), expense: num(r.expense), ending: num(r.ending) };
      return {
        ...row,
        kind: (lower === 'bluaccount' ? 'main' : lower === 'blubisnis' ? 'business' : 'saving') as PortfolioRow['kind'],
        diff: Math.round((row.opening + row.income - row.expense - row.ending) * 100) / 100,
      };
    }).filter((r) => r.name);
    if (!/^\d{4}-\d{2}$/.test(String(raw.period)) || !rows.length) {
      return NextResponse.json({ error: 'Could not find the month or the rows in this report.' }, { status: 422 });
    }
    return NextResponse.json({ period: raw.period as string, rows, totalEnding: num(raw.total_ending) });
  } catch {
    return NextResponse.json({ error: 'The report could not be read. Try again.' }, { status: 422 });
  }
}
