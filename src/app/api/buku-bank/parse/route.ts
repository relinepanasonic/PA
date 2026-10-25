import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

export interface ParsedLine {
  date: string;
  description: string;
  amount: number;
  direction: 'in' | 'out';
  balance: number | null;
  category: string | null;
}

// Reads one bank statement piece (CSV/text chunk, a PDF or a picture) and returns its transactions.
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: 'Add ANTHROPIC_API_KEY in Vercel first.' }, { status: 501 });

  const { kind, data, mediaType, yearHint } = await request.json();
  if (!['text', 'pdf', 'image'].includes(kind) || typeof data !== 'string' || !data) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (data.length > 5_800_000) return NextResponse.json({ error: 'File is too large for one upload. Split it by month.' }, { status: 413 });

  const { data: cats } = await supabase.from('finance_categories').select('name,type').eq('user_id', user.id);
  const catList = (cats ?? []).map((c: any) => `${c.name} (${c.type})`).join(', ') || 'none';

  const prompt =
    'Extract EVERY transaction line from this bank statement (rekening koran / mutasi / buku tabungan). Reply with ONE JSON array and nothing else. ' +
    'Each item: {"date":"YYYY-MM-DD","description":"short text as printed","amount":number,"direction":"in"|"out","balance":number|null,"category":string|null}. ' +
    'Rules: amount is positive rupiah; Indonesian numbers like 1.234.567,89 mean 1234567.89; DB/debit/keluar/minus = "out", CR/credit/masuk/plus = "in"; ' +
    `dates are usually DD/MM/YYYY or DD MMM YYYY${yearHint ? `; if the year is missing use ${yearHint}` : ''}; ` +
    'skip opening and closing balance rows, totals, headers, page numbers and footers; never invent or merge rows; keep the original order. ' +
    `category: the best match from this list for the description, else null: ${catList}.`;

  const content: any[] =
    kind === 'text'
      ? [{ type: 'text', text: `${prompt}\n\nSTATEMENT TEXT:\n${data}` }]
      : [
          kind === 'pdf'
            ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
            : { type: 'image', source: { type: 'base64', media_type: ['image/png', 'image/webp'].includes(mediaType) ? mediaType : 'image/jpeg', data } },
          { type: 'text', text: prompt },
        ];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 16000, messages: [{ role: 'user', content }] }),
  });
  if (!res.ok) {
    console.error('buku-bank Anthropic error', res.status, await res.text());
    return NextResponse.json({ error: 'Could not read this file. Try again.' }, { status: 502 });
  }
  const d = await res.json();
  const text = (d.content as any[]).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return NextResponse.json({ error: 'No transactions found in this file.' }, { status: 422 });

  try {
    const raw = JSON.parse(m[0]) as any[];
    const lines: ParsedLine[] = raw
      .map((r) => ({
        date: String(r.date || ''),
        description: String(r.description || '').slice(0, 200),
        amount: Math.abs(Number(r.amount)),
        direction: (r.direction === 'in' ? 'in' : 'out') as 'in' | 'out',
        balance: r.balance == null || !Number.isFinite(Number(r.balance)) ? null : Number(r.balance),
        category: typeof r.category === 'string' && r.category ? r.category : null,
      }))
      .filter((l) => /^\d{4}-\d{2}-\d{2}$/.test(l.date) && Number.isFinite(l.amount) && l.amount > 0);
    return NextResponse.json({ lines, truncated: d.stop_reason === 'max_tokens' });
  } catch {
    return NextResponse.json({ error: 'The statement could not be read. Try a smaller file.' }, { status: 422 });
  }
}
