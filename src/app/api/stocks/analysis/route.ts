import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchChart, fetchFundamentals, toJK } from '@/lib/stocks';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// One year of daily candles + fundamentals for up to 12 stocks, for the Investasi analysis pages.
// GET /api/stocks/analysis?tickers=BBCA,TLKM
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const raw = new URL(request.url).searchParams.get('tickers') || '';
  const tickers = Array.from(new Set(raw.split(',').map((t) => toJK(t).replace('.JK', '')).filter(Boolean))).slice(0, 12);
  if (!tickers.length) return NextResponse.json({ stocks: [], ihsg: [] });

  const toCandles = (c: NonNullable<Awaited<ReturnType<typeof fetchChart>>>) =>
    c.candles.map((x) => ({ d: new Date(x.t * 1000).toISOString().slice(0, 10), o: x.o, h: x.h, l: x.l, c: x.c, v: x.v }));

  const [ihsg, charts, funds] = await Promise.all([
    fetchChart('^JKSE', '1y'),
    Promise.all(tickers.map((t) => fetchChart(t, '1y'))),
    Promise.all(tickers.map((t) => fetchFundamentals(t))),
  ]);

  const stocks = tickers.map((t, i) => {
    const c = charts[i];
    return c
      ? { ticker: t, name: c.name, price: c.price, prevClose: c.prevClose, high52w: c.high52w, low52w: c.low52w, candles: toCandles(c), f: funds[i] }
      : { ticker: t, name: t, price: 0, prevClose: 0, high52w: null, low52w: null, candles: [], f: funds[i] };
  });
  return NextResponse.json({ stocks, ihsg: ihsg ? toCandles(ihsg) : [] });
}
