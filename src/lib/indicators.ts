// Pure indicator maths shared by the Investasi analysis pages. No network, no React.

export interface Candle { d: string; o: number; h: number; l: number; c: number; v: number }

const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;

export const smaSeries = (v: number[], n: number): (number | null)[] =>
  v.map((_, i) => (i + 1 >= n ? avg(v.slice(i + 1 - n, i + 1)) : null));

export const emaSeries = (v: number[], n: number): number[] => {
  const k = 2 / (n + 1);
  const out: number[] = [];
  v.forEach((x, i) => out.push(i === 0 ? x : x * k + out[i - 1] * (1 - k)));
  return out;
};

/** Wilder RSI, 0-100. */
export function rsiSeries(closes: number[], n = 14): (number | null)[] {
  const out: (number | null)[] = closes.map(() => null);
  if (closes.length <= n) return out;
  let gain = 0, loss = 0;
  for (let i = 1; i <= n; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  gain /= n; loss /= n;
  out[n] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = n + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gain = (gain * (n - 1) + Math.max(d, 0)) / n;
    loss = (loss * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

export function macdSeries(closes: number[]) {
  const e12 = emaSeries(closes, 12), e26 = emaSeries(closes, 26);
  const macd = closes.map((_, i) => e12[i] - e26[i]);
  const signal = emaSeries(macd, 9);
  return { macd, signal, hist: macd.map((m, i) => m - signal[i]) };
}

export function bollinger(closes: number[], n = 20, k = 2) {
  const mid = smaSeries(closes, n);
  const upper: (number | null)[] = [], lower: (number | null)[] = [];
  closes.forEach((_, i) => {
    if (mid[i] == null) { upper.push(null); lower.push(null); return; }
    const w = closes.slice(i + 1 - n, i + 1);
    const sd = Math.sqrt(avg(w.map((x) => (x - (mid[i] as number)) ** 2)));
    upper.push((mid[i] as number) + k * sd);
    lower.push((mid[i] as number) - k * sd);
  });
  return { mid, upper, lower };
}

export function atrSeries(c: Candle[], n = 14): (number | null)[] {
  const tr = c.map((x, i) => (i === 0 ? x.h - x.l : Math.max(x.h - x.l, Math.abs(x.h - c[i - 1].c), Math.abs(x.l - c[i - 1].c))));
  const out: (number | null)[] = tr.map(() => null);
  if (tr.length < n) return out;
  let a = avg(tr.slice(0, n));
  out[n - 1] = a;
  for (let i = n; i < tr.length; i++) { a = (a * (n - 1) + tr[i]) / n; out[i] = a; }
  return out;
}

export const returns = (closes: number[]) => closes.slice(1).map((c, i) => c / closes[i] - 1);
const stdev = (a: number[]) => { if (a.length < 2) return 0; const m = avg(a); return Math.sqrt(avg(a.map((x) => (x - m) ** 2))); };
export const annualVolPct = (closes: number[]) => stdev(returns(closes)) * Math.sqrt(252) * 100;

export function maxDrawdownPct(closes: number[]) {
  let peak = closes[0] ?? 0, dd = 0;
  for (const c of closes) { peak = Math.max(peak, c); dd = Math.min(dd, c / peak - 1); }
  return dd * 100;
}

/** Beta and correlation of a stock against the index, aligned by date. */
export function betaCorr(stock: Candle[], index: Candle[]) {
  const idx = new Map(index.map((c) => [c.d, c.c]));
  const s: number[] = [], m: number[] = [];
  let prevS: number | null = null, prevM: number | null = null;
  for (const c of stock) {
    const im = idx.get(c.d);
    if (im == null) continue;
    if (prevS != null && prevM != null) { s.push(c.c / prevS - 1); m.push(im / prevM - 1); }
    prevS = c.c; prevM = im;
  }
  if (s.length < 30) return { beta: null as number | null, corr: null as number | null };
  const ms = avg(s), mm = avg(m);
  let cov = 0, vm = 0, vs = 0;
  for (let i = 0; i < s.length; i++) { cov += (s[i] - ms) * (m[i] - mm); vm += (m[i] - mm) ** 2; vs += (s[i] - ms) ** 2; }
  return { beta: vm ? cov / vm : null, corr: vm && vs ? cov / Math.sqrt(vm * vs) : null };
}

/** Nearest support below and resistance above the price, from swing lows/highs of the last 6 months. */
export function levels(c: Candle[], lookback = 126) {
  const w = c.slice(-lookback);
  const price = c[c.length - 1]?.c ?? 0;
  const lows: number[] = [], highs: number[] = [];
  for (let i = 3; i < w.length - 3; i++) {
    const seg = w.slice(i - 3, i + 4);
    if (w[i].l === Math.min(...seg.map((x) => x.l))) lows.push(w[i].l);
    if (w[i].h === Math.max(...seg.map((x) => x.h))) highs.push(w[i].h);
  }
  const below = lows.filter((x) => x < price).sort((a, b) => b - a);
  const above = highs.filter((x) => x > price).sort((a, b) => a - b);
  const hi = Math.max(...w.map((x) => x.h)), lo = Math.min(...w.map((x) => x.l));
  return {
    support: below[0] ?? lo,
    resistance: above[0] ?? hi,
    rangeHigh: hi,
    rangeLow: lo,
    fib: { f236: hi - (hi - lo) * 0.236, f382: hi - (hi - lo) * 0.382, f500: hi - (hi - lo) * 0.5, f618: hi - (hi - lo) * 0.618 },
  };
}
