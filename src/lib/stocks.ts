// Market data and indicators for the Stock Expert team. Server-side only. Data: Yahoo Finance chart API + Google News RSS.

export const WATCHLIST = [
  'BBCA', 'BBRI', 'BMRI', 'BBNI', 'TLKM', 'ASII', 'UNVR', 'ICBP', 'INDF', 'KLBF',
  'ADRO', 'PTBA', 'ITMG', 'ANTM', 'INCO', 'MDKA', 'GOTO', 'AMRT', 'CPIN', 'SMGR',
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const toJK = (t: string) => {
  const c = t.trim().toUpperCase();
  return c.startsWith('^') || c.endsWith('.JK') ? c : `${c}.JK`;
};

export interface Candle { t: number; o: number; h: number; l: number; c: number; v: number }
export interface Chart {
  ticker: string;
  name: string;
  price: number;
  prevClose: number;
  high52w: number | null;
  low52w: number | null;
  candles: Candle[];
}

export async function fetchChart(ticker: string, range = '6mo'): Promise<Chart | null> {
  const t = toJK(ticker);
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(t)}?range=${range}&interval=1d`, {
      headers: { 'User-Agent': UA },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const r = (await res.json())?.chart?.result?.[0];
    if (!r?.meta) return null;
    const q = r.indicators?.quote?.[0] ?? {};
    const candles: Candle[] = [];
    (r.timestamp ?? []).forEach((ts: number, i: number) => {
      const c = q.close?.[i];
      if (typeof c === 'number' && c > 0) candles.push({ t: ts, o: q.open?.[i] ?? c, h: q.high?.[i] ?? c, l: q.low?.[i] ?? c, c, v: q.volume?.[i] ?? 0 });
    });
    const price = Number(r.meta.regularMarketPrice ?? candles.at(-1)?.c ?? 0);
    return {
      ticker: t,
      name: r.meta.shortName || r.meta.longName || t.replace('.JK', ''),
      price,
      prevClose: Number(r.meta.chartPreviousClose ?? r.meta.previousClose ?? candles.at(-2)?.c ?? price),
      high52w: r.meta.fiftyTwoWeekHigh ?? null,
      low52w: r.meta.fiftyTwoWeekLow ?? null,
      candles,
    };
  } catch (e) {
    console.error('fetchChart', t, e);
    return null;
  }
}

const sma = (v: number[], n: number) => (v.length >= n ? v.slice(-n).reduce((a, b) => a + b, 0) / n : null);

function rsi(closes: number[], n = 14): number | null {
  if (closes.length < n + 1) return null;
  let gain = 0, loss = 0;
  for (let i = closes.length - n; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  if (loss === 0) return 100;
  const rs = gain / n / (loss / n);
  return 100 - 100 / (1 + rs);
}

const r0 = (n: number | null) => (n == null ? null : Math.round(n));
const r1 = (n: number | null) => (n == null ? null : Math.round(n * 10) / 10);

export function technicals(ch: Chart) {
  const closes = ch.candles.map((c) => c.c);
  const vols = ch.candles.map((c) => c.v);
  const last20 = ch.candles.slice(-20);
  const sma20 = sma(closes, 20), sma50 = sma(closes, 50);
  const volAvg20 = sma(vols.slice(0, -1), 20);
  const chg = (n: number) => (closes.length > n ? ((ch.price / closes[closes.length - 1 - n]) - 1) * 100 : null);
  let trend = 'sideways';
  if (sma20 && sma50) trend = ch.price > sma20 && sma20 > sma50 ? 'uptrend' : ch.price < sma20 && sma20 < sma50 ? 'downtrend' : 'sideways';
  return {
    ticker: ch.ticker.replace('.JK', ''),
    price: r0(ch.price),
    changeTodayPct: r1(ch.prevClose ? (ch.price / ch.prevClose - 1) * 100 : null),
    change5dPct: r1(chg(5)),
    change1mPct: r1(chg(21)),
    sma20: r0(sma20),
    sma50: r0(sma50),
    rsi14: r1(rsi(closes)),
    trend,
    support20d: last20.length ? r0(Math.min(...last20.map((c) => c.l))) : null,
    resistance20d: last20.length ? r0(Math.max(...last20.map((c) => c.h))) : null,
    high52w: r0(ch.high52w),
    low52w: r0(ch.low52w),
    volumeVsAvg20: volAvg20 && vols.at(-1) ? r1(vols[vols.length - 1] / volAvg20) : null,
  };
}

// Yahoo only serves fundamentals (PER, PBV...) with a cookie + crumb pair; keep one for 30 minutes.
let session: { cookie: string; crumb: string; at: number } | null = null;

async function yahooSession() {
  if (session && Date.now() - session.at < 30 * 60 * 1000) return session;
  const c = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'manual', cache: 'no-store' });
  const cookie = (c.headers.getSetCookie?.() ?? []).map((x) => x.split(';')[0]).join('; ');
  const cr = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, Cookie: cookie }, cache: 'no-store' });
  const crumb = await cr.text();
  if (!cr.ok || !crumb || crumb.includes('<')) throw new Error('no crumb');
  session = { cookie, crumb, at: Date.now() };
  return session;
}

export interface Fundamentals {
  per: number | null; forwardPer: number | null; pbv: number | null; dividendYieldPct: number | null; roePct: number | null; eps: number | null;
  profitMarginPct: number | null; debtToEquityPct: number | null; currentRatio: number | null;
  revenueGrowthPct: number | null; earningsGrowthPct: number | null; payoutRatioPct: number | null; beta: number | null;
}

export async function fetchFundamentals(ticker: string): Promise<Fundamentals | null> {
  try {
    const s = await yahooSession();
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(toJK(ticker))}?modules=summaryDetail,defaultKeyStatistics,financialData&crumb=${encodeURIComponent(s.crumb)}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA, Cookie: s.cookie }, cache: 'no-store' });
    if (!res.ok) { if (res.status === 401) session = null; return null; }
    const r = (await res.json())?.quoteSummary?.result?.[0];
    if (!r) return null;
    const pct = (n?: number) => (typeof n === 'number' ? Math.round(n * 1000) / 10 : null);
    const num = (n?: number) => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
    return {
      per: num(r.summaryDetail?.trailingPE?.raw),
      forwardPer: num(r.summaryDetail?.forwardPE?.raw),
      pbv: num(r.defaultKeyStatistics?.priceToBook?.raw),
      dividendYieldPct: pct(r.summaryDetail?.dividendYield?.raw),
      roePct: pct(r.financialData?.returnOnEquity?.raw),
      eps: num(r.defaultKeyStatistics?.trailingEps?.raw),
      profitMarginPct: pct(r.financialData?.profitMargins?.raw),
      debtToEquityPct: num(r.financialData?.debtToEquity?.raw),
      currentRatio: num(r.financialData?.currentRatio?.raw),
      revenueGrowthPct: pct(r.financialData?.revenueGrowth?.raw),
      earningsGrowthPct: pct(r.financialData?.earningsGrowth?.raw),
      payoutRatioPct: pct(r.summaryDetail?.payoutRatio?.raw),
      beta: num(r.summaryDetail?.beta?.raw ?? r.defaultKeyStatistics?.beta?.raw),
    };
  } catch (e) {
    console.error('fetchFundamentals', ticker, e);
    return null;
  }
}

export async function marketOverview() {
  const [ihsg, usd] = await Promise.all([fetchChart('^JKSE', '1mo'), fetchChart('IDR=X', '1mo')]);
  const row = (c: Chart | null) => c && { price: r0(c.price), changeTodayPct: r1((c.price / c.prevClose - 1) * 100), change1mPct: r1(c.candles.length > 20 ? (c.price / c.candles[c.candles.length - 21].c - 1) * 100 : null) };
  return { ihsg: row(ihsg), usdIdr: row(usd) };
}

/** Quick technical scan of the watchlist, ranked by simple momentum + RSI rules. */
export async function screenWatchlist() {
  const charts = await Promise.all(WATCHLIST.map((t) => fetchChart(t)));
  const rows = charts.filter((c): c is Chart => !!c && c.candles.length > 30).map(technicals);
  const score = (t: ReturnType<typeof technicals>) => {
    let s = 0;
    if (t.trend === 'uptrend') s += 2; else if (t.trend === 'downtrend') s -= 2;
    if (t.rsi14 != null) { if (t.rsi14 < 35) s += 1; else if (t.rsi14 > 70) s -= 1; }
    if ((t.volumeVsAvg20 ?? 0) > 1.5 && (t.changeTodayPct ?? 0) > 0) s += 1;
    return s;
  };
  const ranked = rows.map((t) => ({ ...t, score: score(t) })).sort((a, b) => b.score - a.score);
  return { bullish: ranked.slice(0, 6), weak: ranked.slice(-4).reverse(), scanned: ranked.length };
}

export async function stockNews(query: string) {
  try {
    const res = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=id&gl=ID&ceid=ID:id`, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 6);
    return items.map((m) => {
      const title = (m[1].match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] ?? '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      const date = m[1].match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? '';
      return { title, date };
    });
  } catch {
    return [];
  }
}
