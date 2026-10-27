'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart,
  ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { annualVolPct, atrSeries, betaCorr, bollinger, levels, macdSeries, maxDrawdownPct, rsiSeries, smaSeries, type Candle } from '@/lib/indicators';
import type { Fundamentals } from '@/lib/stocks';

export type TheoryId = 'value' | 'quality' | 'trend' | 'momentum' | 'volatility' | 'levels' | 'risk';

export const THEORIES: { id: TheoryId; label: string }[] = [
  { id: 'value', label: 'Murah/Mahal' },
  { id: 'quality', label: 'Kualitas' },
  { id: 'trend', label: 'Tren' },
  { id: 'momentum', label: 'Tenaga' },
  { id: 'volatility', label: 'Liar/Tenang' },
  { id: 'levels', label: 'Batas Harga' },
  { id: 'risk', label: 'Risiko' },
];

interface Stock { ticker: string; name: string; price: number; prevClose: number; high52w: number | null; low52w: number | null; candles: Candle[]; f: Fundamentals | null }
interface Holding { ticker: string; lots: number; buy_price: number }

type Tone = 'good' | 'mid' | 'bad' | 'na';
interface Verdict { tone: Tone; label: string }

const GOOD: Verdict = { tone: 'good', label: 'Bagus' };
const MID: Verdict = { tone: 'mid', label: 'Netral' };
const BAD: Verdict = { tone: 'bad', label: 'Hati-hati' };
const NA: Verdict = { tone: 'na', label: 'Tak ada data' };

const TONE_CLS: Record<Tone, string> = {
  good: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
  mid: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
  bad: 'bg-red-500/20 text-red-300 border-red-400/40',
  na: 'bg-white/5 text-slate-400 border-white/10',
};

const COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#fb923c', '#f87171', '#2dd4bf', '#60a5fa', '#c084fc', '#facc15', '#4ade80'];

const num = (n: number | null | undefined, d = 1) => (n == null || !Number.isFinite(n) ? '-' : n.toLocaleString('id-ID', { maximumFractionDigits: d }));
const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const pctFmt = (n: number | null) => (n == null ? '-' : `${n > 0 ? '+' : ''}${n.toFixed(1)}%`);
const shortDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

function Chip({ v }: { v: Verdict }) {
  return <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${TONE_CLS[v.tone]}`}>{v.label}</span>;
}

function Explainer({ title, what, how }: { title: string; what: string; how: string }) {
  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.06] p-3.5">
      <p className="text-sm font-bold text-white mb-1">{title}</p>
      <p className="text-xs text-slate-300 leading-relaxed"><b className="text-cyan-300">Apa ini?</b> {what}</p>
      <p className="text-xs text-slate-300 leading-relaxed mt-1"><b className="text-cyan-300">Cara baca:</b> {how}</p>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: (React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/10">
            {head.map((h, i) => <th key={i} className={`px-3 py-2 font-bold whitespace-nowrap ${i > 0 ? 'text-right' : ''}`}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-white/5 last:border-0">
              {r.map((c, j) => <td key={j} className={`px-3 py-2.5 whitespace-nowrap ${j === 0 ? 'font-bold text-white' : 'text-right text-slate-200 tabular-nums'}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ChartBox = ({ children, h = 240 }: { children: React.ReactNode; h?: number }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2" style={{ height: h }}>
    <ResponsiveContainer width="100%" height="100%">{children as React.ReactElement}</ResponsiveContainer>
  </div>
);

const axis = { stroke: '#64748b', fontSize: 10 };
const tip = { contentStyle: { background: '#0b1226', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, fontSize: 11 }, labelStyle: { color: '#94a3b8' }, itemStyle: { color: '#f1f5f9' }, cursor: { fill: 'rgba(148,163,184,0.12)' } };

// cached so switching between theory pages does not refetch
const cache = new Map<string, { at: number; stocks: Stock[]; ihsg: Candle[] }>();

export default function TheoryView({ theory }: { theory: TheoryId }) {
  const supabase = useMemo(() => createClient(), []);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [watch, setWatch] = useState<string[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [ihsg, setIhsg] = useState<Candle[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [input, setInput] = useState('');

  const loadLists = useCallback(async () => {
    const [{ data: p }, { data: w }] = await Promise.all([
      supabase.from('portfolio_stocks').select('ticker,lots,buy_price'),
      supabase.from('stock_watchlist').select('ticker').order('created_at'),
    ]);
    const merged = new Map<string, Holding>();
    for (const r of (p ?? []) as Holding[]) {
      const t = r.ticker.replace('.JK', '');
      const cur = merged.get(t);
      merged.set(t, { ticker: t, lots: (cur?.lots ?? 0) + Number(r.lots), buy_price: r.buy_price });
    }
    setHoldings(Array.from(merged.values()));
    setWatch(((w ?? []) as { ticker: string }[]).map((x) => x.ticker.replace('.JK', '')));
    setLoadingList(false);
  }, [supabase]);
  useEffect(() => { loadLists(); }, [loadLists]);

  const tickers = useMemo(() => Array.from(new Set([...holdings.map((h) => h.ticker), ...watch])).slice(0, 12), [holdings, watch]);
  const key = tickers.join(',');

  useEffect(() => {
    if (loadingList || !key) { setStocks([]); return; }
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < 5 * 60 * 1000) { setStocks(hit.stocks); setIhsg(hit.ihsg); return; }
    let cancelled = false;
    setLoadingData(true);
    setError(null);
    fetch(`/api/stocks/analysis?tickers=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Gagal memuat data saham.'))))
      .then((j) => {
        if (cancelled) return;
        cache.set(key, { at: Date.now(), stocks: j.stocks, ihsg: j.ihsg });
        setStocks(j.stocks); setIhsg(j.ihsg);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoadingData(false));
    return () => { cancelled = true; };
  }, [key, loadingList]);

  useEffect(() => { if (!sel || !tickers.includes(sel)) setSel(tickers[0] ?? null); }, [tickers, sel]);

  const addWatch = async () => {
    const t = input.trim().toUpperCase().replace('.JK', '');
    if (!t || tickers.includes(t)) { setInput(''); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('stock_watchlist').upsert({ user_id: user.id, ticker: t }, { onConflict: 'user_id,ticker', ignoreDuplicates: true });
    setInput('');
    loadLists();
  };
  const removeWatch = async (t: string) => {
    await supabase.from('stock_watchlist').delete().eq('ticker', t);
    loadLists();
  };

  const ok = stocks.filter((s) => s.candles.length > 30);
  const cur = ok.find((s) => s.ticker === sel) ?? ok[0];

  const picker = (
    <div className="flex flex-wrap gap-1.5">
      {ok.map((s) => (
        <button key={s.ticker} onClick={() => setSel(s.ticker)} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${cur?.ticker === s.ticker ? 'bg-cyan-500/25 border-cyan-400/60 text-cyan-100' : 'bg-white/5 border-white/10 text-slate-300'}`}>{s.ticker}</button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* My stocks */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Saham yang dianalisis</p>
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {holdings.map((h) => <span key={h.ticker} className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 border border-blue-400/40 text-blue-100">{h.ticker} <span className="text-[9px] font-normal text-blue-300/80">portofolio</span></span>)}
          {watch.filter((t) => !holdings.some((h) => h.ticker === t)).map((t) => (
            <span key={t} className="pl-2.5 pr-1.5 py-1 rounded-full text-xs font-bold bg-violet-500/20 border border-violet-400/40 text-violet-100 inline-flex items-center gap-1">
              {t} <span className="text-[9px] font-normal text-violet-300/80">pantauan</span>
              <button onClick={() => removeWatch(t)} aria-label={`Hapus ${t}`} className="text-violet-300 hover:text-white"><X size={12} /></button>
            </span>
          ))}
          {!holdings.length && !watch.length && !loadingList && <span className="text-xs text-slate-500">Belum ada saham. Tambahkan di portofolio atau daftar pantauan.</span>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); addWatch(); }} className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tambah pantauan, mis. TLKM" className="flex-1 min-w-0 h-9 rounded-xl bg-white/5 border border-white/10 px-3 text-xs text-white placeholder:text-slate-500 outline-none" />
          <button type="submit" className="h-9 px-3 rounded-xl bg-violet-500/25 border border-violet-400/40 text-violet-100 text-xs font-bold inline-flex items-center gap-1"><Plus size={14} /> Pantau</button>
        </form>
        {tickers.length >= 12 && <p className="text-[10px] text-slate-500 mt-1.5">Maksimal 12 saham dianalisis sekaligus.</p>}
      </div>

      {loadingData && <p className="text-xs text-cyan-300 inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Mengambil data pasar...</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {!loadingData && !error && !ok.length && !loadingList && tickers.length > 0 && <p className="text-xs text-slate-500">Data belum tersedia. Coba lagi sebentar lagi.</p>}

      {ok.length > 0 && theory === 'value' && <ValueView stocks={ok} />}
      {ok.length > 0 && theory === 'quality' && <QualityView stocks={ok} />}
      {ok.length > 0 && theory === 'trend' && cur && <TrendView stocks={ok} cur={cur} picker={picker} />}
      {ok.length > 0 && theory === 'momentum' && cur && <MomentumView stocks={ok} cur={cur} picker={picker} />}
      {ok.length > 0 && theory === 'volatility' && cur && <VolatilityView stocks={ok} cur={cur} picker={picker} />}
      {ok.length > 0 && theory === 'levels' && cur && <LevelsView stocks={ok} cur={cur} picker={picker} />}
      {ok.length > 0 && theory === 'risk' && <RiskView stocks={ok} holdings={holdings} ihsg={ihsg} />}

      <p className="text-[10px] text-slate-500 leading-relaxed">Ini alat bantu belajar dan bukan nasihat keuangan. Patokan angka bersifat umum dan tiap industri berbeda. Keputusan dan risikonya ada di kamu.</p>
    </div>
  );
}

// ───────────────────────── 1. Value ─────────────────────────
function valueVerdict(f: Fundamentals | null): Verdict {
  if (!f || (f.per == null && f.pbv == null)) return NA;
  let score = 0, n = 0;
  if (f.per != null && f.per > 0) { n++; score += f.per < 12 ? 1 : f.per > 22 ? -1 : 0; }
  if (f.pbv != null) { n++; score += f.pbv < 1.5 ? 1 : f.pbv > 3.5 ? -1 : 0; }
  if (f.dividendYieldPct != null) { n++; score += f.dividendYieldPct >= 4 ? 1 : 0; }
  if (!n) return NA;
  return score >= 1 ? { tone: 'good', label: 'Murah' } : score <= -1 ? { tone: 'bad', label: 'Mahal' } : { tone: 'mid', label: 'Wajar' };
}

function ValueView({ stocks }: { stocks: Stock[] }) {
  const data = stocks.filter((s) => s.f?.per != null && s.f.per > 0).map((s) => ({ ticker: s.ticker, per: s.f!.per as number }));
  return (
    <div className="space-y-4">
      <Explainer
        title="Teori Nilai (Fundamental): murah atau mahal?"
        what="Menilai apakah harga saham sepadan dengan keuntungan dan aset perusahaan. Seperti membandingkan harga rumah dengan sewa yang dihasilkannya."
        how="PER = berapa tahun laba untuk balik modal (makin kecil makin murah). PBV = harga dibanding nilai buku perusahaan (di bawah 1,5 murah, di atas 3,5 mahal). Dividen = bagi hasil per tahun dari harga saham."
      />
      {data.length > 0 && (
        <ChartBox>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="ticker" {...axis} /><YAxis {...axis} />
            <Tooltip {...tip} formatter={(v) => [`${num(Number(v))}x`, 'PER']} />
            <ReferenceLine y={12} stroke="#34d399" strokeDasharray="4 4" label={{ value: 'murah', fill: '#34d399', fontSize: 10, position: 'insideTopRight' }} />
            <ReferenceLine y={22} stroke="#f87171" strokeDasharray="4 4" label={{ value: 'mahal', fill: '#f87171', fontSize: 10, position: 'insideTopRight' }} />
            <Bar dataKey="per" radius={[6, 6, 0, 0]}>{data.map((d, i) => <Cell key={i} fill={d.per < 12 ? '#34d399' : d.per > 22 ? '#f87171' : '#fbbf24'} />)}</Bar>
          </BarChart>
        </ChartBox>
      )}
      <Table
        head={['Saham', 'Harga', 'PER', 'PBV', 'Dividen', 'Kesimpulan']}
        rows={stocks.map((s) => [s.ticker, rp(s.price), s.f?.per != null ? `${num(s.f.per)}x` : '-', num(s.f?.pbv, 2), s.f?.dividendYieldPct != null ? `${num(s.f.dividendYieldPct)}%` : '-', <Chip key="c" v={valueVerdict(s.f)} />])}
      />
      <p className="text-[11px] text-slate-500">Murah belum tentu bagus: cek juga halaman Kualitas. Bank biasanya memang punya PBV lebih tinggi.</p>
    </div>
  );
}

// ───────────────────────── 2. Quality ─────────────────────────
function qualityVerdict(f: Fundamentals | null): Verdict {
  if (!f || (f.roePct == null && f.profitMarginPct == null)) return NA;
  let score = 0, n = 0;
  if (f.roePct != null) { n++; score += f.roePct >= 15 ? 1 : f.roePct < 8 ? -1 : 0; }
  if (f.profitMarginPct != null) { n++; score += f.profitMarginPct >= 15 ? 1 : f.profitMarginPct < 5 ? -1 : 0; }
  if (f.earningsGrowthPct != null) { n++; score += f.earningsGrowthPct > 5 ? 1 : f.earningsGrowthPct < -10 ? -1 : 0; }
  if (f.debtToEquityPct != null) { n++; score += f.debtToEquityPct < 100 ? 0 : -1; }
  if (!n) return NA;
  return score >= 2 ? GOOD : score <= -1 ? BAD : MID;
}

function QualityView({ stocks }: { stocks: Stock[] }) {
  const data = stocks.filter((s) => s.f?.roePct != null).map((s) => ({ ticker: s.ticker, roe: s.f!.roePct as number }));
  return (
    <div className="space-y-4">
      <Explainer
        title="Teori Kualitas (Buffett): bisnisnya sehat?"
        what="Perusahaan bagus menghasilkan laba tinggi dari modalnya, tumbuh, dan tidak terlilit utang. Pemenang jangka panjang biasanya perusahaan seperti ini."
        how="ROE = laba dari tiap Rp100 modal pemegang saham (di atas 15% bagus). Margin = laba dari tiap Rp100 penjualan. Utang/Modal di atas 100% berarti utangnya besar (abaikan untuk bank, utang adalah bahan baku mereka)."
      />
      {data.length > 0 && (
        <ChartBox>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="ticker" {...axis} /><YAxis {...axis} unit="%" />
            <Tooltip {...tip} formatter={(v) => [`${num(Number(v))}%`, 'ROE']} />
            <ReferenceLine y={15} stroke="#34d399" strokeDasharray="4 4" label={{ value: 'bagus 15%', fill: '#34d399', fontSize: 10, position: 'insideTopRight' }} />
            <Bar dataKey="roe" radius={[6, 6, 0, 0]}>{data.map((d, i) => <Cell key={i} fill={d.roe >= 15 ? '#34d399' : d.roe < 8 ? '#f87171' : '#fbbf24'} />)}</Bar>
          </BarChart>
        </ChartBox>
      )}
      <Table
        head={['Saham', 'ROE', 'Margin', 'Laba tumbuh', 'Utang/Modal', 'Kesimpulan']}
        rows={stocks.map((s) => [s.ticker, s.f?.roePct != null ? `${num(s.f.roePct)}%` : '-', s.f?.profitMarginPct != null ? `${num(s.f.profitMarginPct)}%` : '-', pctFmt(s.f?.earningsGrowthPct ?? null), s.f?.debtToEquityPct != null ? `${num(s.f.debtToEquityPct, 0)}%` : '-', <Chip key="c" v={qualityVerdict(s.f)} />])}
      />
    </div>
  );
}

// ───────────────────────── 3. Trend ─────────────────────────
function trendOf(c: Candle[]): { v: Verdict; text: string; sma20: number | null; sma50: number | null; sma200: number | null } {
  const closes = c.map((x) => x.c);
  const last = closes[closes.length - 1];
  const s20 = smaSeries(closes, 20).at(-1) ?? null, s50 = smaSeries(closes, 50).at(-1) ?? null, s200 = smaSeries(closes, 200).at(-1) ?? null;
  if (s20 == null || s50 == null) return { v: NA, text: '-', sma20: s20, sma50: s50, sma200: s200 };
  if (last > s20 && s20 > s50) return { v: { tone: 'good', label: 'Naik' }, text: 'Harga di atas rata-rata 20 & 50 hari', sma20: s20, sma50: s50, sma200: s200 };
  if (last < s20 && s20 < s50) return { v: { tone: 'bad', label: 'Turun' }, text: 'Harga di bawah rata-rata 20 & 50 hari', sma20: s20, sma50: s50, sma200: s200 };
  return { v: { tone: 'mid', label: 'Datar' }, text: 'Arah belum jelas', sma20: s20, sma50: s50, sma200: s200 };
}

function TrendView({ stocks, cur, picker }: { stocks: Stock[]; cur: Stock; picker: React.ReactNode }) {
  const closes = cur.candles.map((x) => x.c);
  const s20 = smaSeries(closes, 20), s50 = smaSeries(closes, 50), s200 = smaSeries(closes, 200);
  const data = cur.candles.map((x, i) => ({ d: x.d, harga: x.c, ma20: s20[i], ma50: s50[i], ma200: s200[i] }));
  return (
    <div className="space-y-4">
      <Explainer
        title="Teori Tren (Dow): ke mana arah harga?"
        what="Harga cenderung bergerak dalam satu arah cukup lama. Rata-rata harga (garis halus) membantu melihat arahnya tanpa terganggu naik turun harian."
        how="Harga di atas garis rata-rata 50 hari dan 20 hari di atas 50 hari = tren naik. Sebaliknya = tren turun. Garis 200 hari adalah tren jangka panjang. Lebih baik membeli saham yang trennya naik."
      />
      {picker}
      <ChartBox h={280}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="d" tickFormatter={shortDate} {...axis} minTickGap={40} />
          <YAxis domain={['auto', 'auto']} {...axis} />
          <Tooltip {...tip} labelFormatter={(l) => shortDate(String(l))} formatter={(v) => rp(Number(v))} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="harga" name="Harga" stroke="#e2e8f0" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="ma20" name="Rata-rata 20 hari" stroke="#38bdf8" dot={false} strokeWidth={1.5} />
          <Line type="monotone" dataKey="ma50" name="Rata-rata 50 hari" stroke="#fbbf24" dot={false} strokeWidth={1.5} />
          <Line type="monotone" dataKey="ma200" name="Rata-rata 200 hari" stroke="#f472b6" dot={false} strokeWidth={1.5} />
        </LineChart>
      </ChartBox>
      <Table
        head={['Saham', 'Harga', 'MA20', 'MA50', 'MA200', 'Arah']}
        rows={stocks.map((s) => { const t = trendOf(s.candles); return [s.ticker, rp(s.price), t.sma20 ? rp(t.sma20) : '-', t.sma50 ? rp(t.sma50) : '-', t.sma200 ? rp(t.sma200) : '-', <Chip key="c" v={t.v} />]; })}
      />
    </div>
  );
}

// ───────────────────────── 4. Momentum ─────────────────────────
function MomentumView({ stocks, cur, picker }: { stocks: Stock[]; cur: Stock; picker: React.ReactNode }) {
  const closes = cur.candles.map((x) => x.c);
  const rsi = rsiSeries(closes);
  const m = macdSeries(closes);
  const data = cur.candles.map((x, i) => ({ d: x.d, rsi: rsi[i], hist: m.hist[i] })).slice(-150);
  const rows = stocks.map((s) => {
    const c = s.candles.map((x) => x.c);
    const r = rsiSeries(c).at(-1) ?? null;
    const mm = macdSeries(c);
    const up = mm.macd.at(-1)! > mm.signal.at(-1)!;
    const rv: Verdict = r == null ? NA : r >= 70 ? { tone: 'bad', label: 'Terlalu panas' } : r <= 30 ? { tone: 'good', label: 'Murah sesaat' } : MID;
    return [s.ticker, r == null ? '-' : num(r, 0), rv.tone === 'na' ? '-' : <Chip key="r" v={rv} />, <Chip key="m" v={up ? { tone: 'good', label: 'Tenaga naik' } : { tone: 'bad', label: 'Tenaga turun' }} />];
  });
  return (
    <div className="space-y-4">
      <Explainer
        title="Teori Tenaga (Momentum): masih kuat atau lelah?"
        what="Mengukur seberapa cepat dan kuat harga bergerak. Seperti kecepatan mobil: bisa kencang, tapi terlalu kencang biasanya segera melambat."
        how="RSI di atas 70 = naik terlalu cepat, rawan turun dulu. RSI di bawah 30 = turun terlalu dalam, bisa memantul. Grafik batang bawah (MACD): hijau di atas nol = tenaga naik, merah di bawah nol = tenaga turun."
      />
      {picker}
      <p className="text-[11px] font-bold text-slate-300">RSI {cur.ticker} (0-100)</p>
      <ChartBox h={190}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="d" tickFormatter={shortDate} {...axis} minTickGap={40} />
          <YAxis domain={[0, 100]} ticks={[0, 30, 50, 70, 100]} {...axis} />
          <ReferenceArea y1={70} y2={100} fill="rgba(248,113,113,0.12)" />
          <ReferenceArea y1={0} y2={30} fill="rgba(52,211,153,0.12)" />
          <Tooltip {...tip} labelFormatter={(l) => shortDate(String(l))} formatter={(v) => num(Number(v), 0)} />
          <Line type="monotone" dataKey="rsi" name="RSI" stroke="#38bdf8" dot={false} strokeWidth={2} />
        </ComposedChart>
      </ChartBox>
      <p className="text-[11px] font-bold text-slate-300">Tenaga naik/turun (MACD)</p>
      <ChartBox h={150}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis dataKey="d" tickFormatter={shortDate} {...axis} minTickGap={40} />
          <YAxis {...axis} />
          <ReferenceLine y={0} stroke="#64748b" />
          <Tooltip {...tip} labelFormatter={(l) => shortDate(String(l))} formatter={(v) => num(Number(v), 1)} />
          <Bar dataKey="hist" name="Tenaga">{data.map((d, i) => <Cell key={i} fill={(d.hist ?? 0) >= 0 ? '#34d399' : '#f87171'} />)}</Bar>
        </BarChart>
      </ChartBox>
      <Table head={['Saham', 'RSI', 'Kondisi RSI', 'Tenaga']} rows={rows} />
    </div>
  );
}

// ───────────────────────── 5. Volatility ─────────────────────────
function VolatilityView({ stocks, cur, picker }: { stocks: Stock[]; cur: Stock; picker: React.ReactNode }) {
  const closes = cur.candles.map((x) => x.c);
  const b = bollinger(closes);
  const data = cur.candles.map((x, i) => ({ d: x.d, harga: x.c, atas: b.upper[i], bawah: b.lower[i], tengah: b.mid[i] })).slice(-180);
  const rows = stocks.map((s) => {
    const c = s.candles.map((x) => x.c);
    const atr = atrSeries(s.candles).at(-1) ?? null;
    const atrPct = atr != null && s.price ? (atr / s.price) * 100 : null;
    const vol = annualVolPct(c);
    const v: Verdict = vol < 25 ? { tone: 'good', label: 'Tenang' } : vol > 45 ? { tone: 'bad', label: 'Liar' } : MID;
    return [s.ticker, atrPct == null ? '-' : `${num(atrPct, 1)}%`, `${num(vol, 0)}%`, atr != null ? rp(s.price - 2 * atr) : '-', <Chip key="c" v={v} />];
  });
  return (
    <div className="space-y-4">
      <Explainer
        title="Teori Volatilitas (Bollinger): seberapa liar harganya?"
        what="Mengukur seberapa jauh harga biasanya bergoyang. Saham tenang cocok untuk yang tidak suka deg-degan, saham liar bisa untung besar tapi juga rugi besar."
        how="Pita biru adalah batas wajar pergerakan. Harga menyentuh pita atas = mulai mahal sesaat, pita bawah = mulai murah sesaat. Gerak harian rata-rata (ATR) membantu menentukan batas rugi (stop loss) yang masuk akal."
      />
      {picker}
      <ChartBox h={270}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="d" tickFormatter={shortDate} {...axis} minTickGap={40} />
          <YAxis domain={['auto', 'auto']} {...axis} />
          <Tooltip {...tip} labelFormatter={(l) => shortDate(String(l))} formatter={(v) => rp(Number(v))} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="atas" name="Pita atas" stroke="#a78bfa" dot={false} strokeWidth={1} strokeDasharray="4 3" />
          <Line type="monotone" dataKey="bawah" name="Pita bawah" stroke="#a78bfa" dot={false} strokeWidth={1} strokeDasharray="4 3" />
          <Line type="monotone" dataKey="tengah" name="Rata-rata" stroke="#64748b" dot={false} strokeWidth={1} />
          <Line type="monotone" dataKey="harga" name="Harga" stroke="#e2e8f0" dot={false} strokeWidth={2} />
        </ComposedChart>
      </ChartBox>
      <Table head={['Saham', 'Gerak harian', 'Goyang setahun', 'Stop loss saran', 'Sifat']} rows={rows} />
      <p className="text-[11px] text-slate-500">Stop loss saran = harga sekarang dikurangi 2 kali gerak harian rata-rata. Ini contoh hitungan, sesuaikan dengan toleransi risikomu.</p>
    </div>
  );
}

// ───────────────────────── 6. Levels ─────────────────────────
function LevelsView({ stocks, cur, picker }: { stocks: Stock[]; cur: Stock; picker: React.ReactNode }) {
  const lv = levels(cur.candles);
  const data = cur.candles.slice(-126).map((x) => ({ d: x.d, harga: x.c }));
  const rows = stocks.map((s) => {
    const l = levels(s.candles);
    const toSup = ((s.price / l.support) - 1) * 100, toRes = ((l.resistance / s.price) - 1) * 100;
    const v: Verdict = toRes < 2 ? { tone: 'bad', label: 'Dekat batas atas' } : toSup < 2 ? { tone: 'good', label: 'Dekat batas bawah' } : MID;
    return [s.ticker, rp(s.price), rp(l.support), rp(l.resistance), `${num(toRes, 1)}%`, <Chip key="c" v={v} />];
  });
  return (
    <div className="space-y-4">
      <Explainer
        title="Teori Batas Harga (Support, Resistance, Fibonacci)"
        what="Harga sering berhenti atau memantul di angka tertentu karena banyak orang pernah membeli atau menjual di sana. Bawah disebut support (lantai), atas resistance (atap)."
        how="Beli dekat lantai lebih aman karena jaraknya ke batas rugi kecil. Dekat atap lebih berisiko karena harga sering tertahan. Garis putus-putus oranye (Fibonacci) adalah titik pantulan umum saat harga koreksi dari puncaknya."
      />
      {picker}
      <ChartBox h={280}>
        <ComposedChart data={data} margin={{ top: 10, right: 40, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="d" tickFormatter={shortDate} {...axis} minTickGap={40} />
          <YAxis domain={[Math.floor(lv.rangeLow * 0.97), Math.ceil(lv.rangeHigh * 1.03)]} {...axis} />
          <Tooltip {...tip} labelFormatter={(l) => shortDate(String(l))} formatter={(v) => rp(Number(v))} />
          <ReferenceLine y={lv.resistance} stroke="#f87171" label={{ value: 'atap', fill: '#f87171', fontSize: 10, position: 'right' }} />
          <ReferenceLine y={lv.support} stroke="#34d399" label={{ value: 'lantai', fill: '#34d399', fontSize: 10, position: 'right' }} />
          <ReferenceLine y={lv.fib.f382} stroke="#fb923c" strokeDasharray="3 4" label={{ value: '38%', fill: '#fb923c', fontSize: 9, position: 'right' }} />
          <ReferenceLine y={lv.fib.f500} stroke="#fb923c" strokeDasharray="3 4" label={{ value: '50%', fill: '#fb923c', fontSize: 9, position: 'right' }} />
          <ReferenceLine y={lv.fib.f618} stroke="#fb923c" strokeDasharray="3 4" label={{ value: '62%', fill: '#fb923c', fontSize: 9, position: 'right' }} />
          <Area type="monotone" dataKey="harga" stroke="#e2e8f0" fill="rgba(148,163,184,0.12)" strokeWidth={2} />
        </ComposedChart>
      </ChartBox>
      <Table head={['Saham', 'Harga', 'Lantai', 'Atap', 'Jarak ke atap', 'Posisi']} rows={rows} />
    </div>
  );
}

// ───────────────────────── 7. Risk ─────────────────────────
function RiskView({ stocks, holdings, ihsg }: { stocks: Stock[]; holdings: Holding[]; ihsg: Candle[] }) {
  const pie = holdings
    .map((h) => { const s = stocks.find((x) => x.ticker === h.ticker); return s ? { name: h.ticker, value: s.price * h.lots * 100 } : null; })
    .filter((x): x is { name: string; value: number } => !!x && x.value > 0);
  const total = pie.reduce((a, b) => a + b.value, 0);
  const top = pie.slice().sort((a, b) => b.value - a.value)[0];
  const rows = stocks.map((s) => {
    const c = s.candles.map((x) => x.c);
    const vol = annualVolPct(c), dd = maxDrawdownPct(c);
    const { beta, corr } = betaCorr(s.candles, ihsg);
    const ret = c.length > 1 ? (c[c.length - 1] / c[0] - 1) * 100 : 0;
    const v: Verdict = dd < -35 || vol > 50 ? BAD : dd > -15 && vol < 28 ? GOOD : MID;
    return [s.ticker, `${num(vol, 0)}%`, `${num(dd, 0)}%`, beta == null ? '-' : num(beta, 2), corr == null ? '-' : num(corr, 2), pctFmt(ret), <Chip key="c" v={v} />];
  });
  return (
    <div className="space-y-4">
      <Explainer
        title="Teori Portofolio (Markowitz): jangan taruh semua telur di satu keranjang"
        what="Risiko tidak hanya soal satu saham, tapi bagaimana saham-sahammu bergerak bersama. Menyebar ke saham yang berbeda membuat portofolio lebih stabil."
        how="Penurunan terdalam = berapa % harga pernah jatuh dari puncaknya dalam setahun (itu kerugian terburuk jika kamu apes). Beta di atas 1 = lebih goyang dari IHSG. Korelasi dekat 1 = bergerak searah IHSG, jadi kurang menyebar risiko."
      />
      {pie.length > 0 ? (
        <>
          <p className="text-[11px] font-bold text-slate-300">Porsi tiap saham di portofoliomu</p>
          <ChartBox h={230}>
            <PieChart>
              <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2} label={({ name, value }) => `${name} ${num(((Number(value)) / total) * 100, 0)}%`} labelLine={false} fontSize={10}>
                {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip {...tip} formatter={(v) => rp(Number(v))} />
            </PieChart>
          </ChartBox>
          {top && total > 0 && (
            <p className={`text-xs ${top.value / total > 0.4 ? 'text-amber-300' : 'text-emerald-300'}`}>
              {top.value / total > 0.4 ? `Hati-hati: ${top.name} mengambil ${num((top.value / total) * 100, 0)}% portofoliomu. Satu saham yang jatuh bisa menyeret semuanya.` : `Bagus: tidak ada satu saham yang mendominasi (terbesar ${top.name} ${num((top.value / total) * 100, 0)}%).`}
            </p>
          )}
        </>
      ) : <p className="text-xs text-slate-500">Tambahkan saham di Portofolio untuk melihat pembagian porsinya.</p>}
      <Table head={['Saham', 'Goyang setahun', 'Turun terdalam', 'Beta', 'Korelasi IHSG', 'Hasil 1 th', 'Risiko']} rows={rows} />
    </div>
  );
}
