'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Loader2, Sparkles, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchAll } from '@/lib/supabase/fetchAll';
import type { Insight } from '@/app/api/finance/insight/route';

interface Tx { amount: number; type: 'income' | 'expense'; tag: string; description: string; transaction_date: string; cat: string }
interface Debt { id: string; name: string; kind: 'credit_card' | 'paylater' | 'loan'; balance: number; credit_limit: number | null }
interface Row { name: string; sub: string; value: number; date?: string }

const COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#fb923c', '#f87171', '#2dd4bf', '#60a5fa', '#c084fc'];
const rp = (n: number) => (n < 0 ? '-' : '') + 'Rp ' + Math.abs(Math.round(n)).toLocaleString('id-ID');
const rpShort = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt` : Math.abs(n) >= 1e3 ? `${Math.round(n / 1e3)} rb` : String(Math.round(n)));
const monthKey = (d: string) => d.slice(0, 7);
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
const isTransfer = (t: Tx) => t.description.includes('___TRANSFER___');
const cleanDesc = (d: string) => d.replace(/^\[.*?\]\s*/, '').replace('___TRANSFER___', '').trim();
const axis = { stroke: '#64748b', fontSize: 10 };
const tip = { contentStyle: { background: '#0b1226', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, fontSize: 11 }, labelStyle: { color: '#94a3b8' }, itemStyle: { color: '#f1f5f9' }, cursor: { fill: 'rgba(148,163,184,0.12)' } };
const todayMonth = () => new Date().toISOString().slice(0, 7);
const shiftMonth = (m: string, delta: number) => { const d = new Date(`${m}-01T00:00:00`); d.setMonth(d.getMonth() + delta); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const digits = (v: string) => Number(v.replace(/[^\d]/g, '')) || 0;

function Card({ title, hint, children, className = '' }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 ${className}`}>
      <p className="text-sm font-bold text-white">{title}</p>
      {hint && <p className="text-[11px] text-slate-400 mb-2.5 leading-snug">{hint}</p>}
      {!hint && <div className="mb-2" />}
      {children}
    </div>
  );
}

function Chip({ tone, children }: { tone: 'good' | 'mid' | 'bad'; children: React.ReactNode }) {
  const c = { good: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40', mid: 'bg-amber-500/20 text-amber-200 border-amber-400/40', bad: 'bg-red-500/20 text-red-300 border-red-400/40' }[tone];
  return <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${c}`}>{children}</span>;
}

export default function FinanceDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [bankBal, setBankBal] = useState<{ account: string; balance: number; date: string }[]>([]);
  const [tab, setTab] = useState<{ name: string; kind: string; ending: number; period: string }[]>([]);
  const [tabTrend, setTabTrend] = useState<{ bulan: string; Total: number }[]>([]);
  const [stocks, setStocks] = useState<{ ticker: string; lots: number; buy: number; price: number | null }[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(todayMonth());
  const [insight, setInsight] = useState<Insight | null>(null);
  const [insightBusy, setInsightBusy] = useState(false);
  const [insightErr, setInsightErr] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', kind: 'credit_card', balance: '', limit: '' });

  const loadDebts = useCallback(async () => {
    const { data } = await supabase.from('finance_debts').select('id,name,kind,balance,credit_limit').order('created_at');
    setDebts(((data ?? []) as any[]).map((d) => ({ ...d, balance: Number(d.balance), credit_limit: d.credit_limit == null ? null : Number(d.credit_limit) })));
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const from = `${shiftMonth(todayMonth(), -12)}-01`;
      const [t, b, pk, sn, pf] = await Promise.all([
        fetchAll<any>((x, y) => supabase.from('finance_transactions').select('amount,type,tag,description,transaction_date,finance_categories(name)')
          .gte('transaction_date', from).order('transaction_date', { ascending: false }).order('id').range(x, y)),
        supabase.from('bank_statement_lines').select('account,balance,tx_date').not('balance', 'is', null)
          .order('tx_date', { ascending: false }).order('created_at', { ascending: false }).limit(600).then((r) => r.data),
        supabase.from('savings_pockets').select('id,name,kind').then((r) => r.data),
        fetchAll<any>((x, y) => supabase.from('savings_snapshots').select('pocket_id,period,ending').order('period', { ascending: false }).order('id').range(x, y)),
        supabase.from('portfolio_stocks').select('ticker,buy_price,lots').then((r) => r.data),
      ]);
      setTxs((t as any[]).map((r) => ({
        amount: Number(r.amount), type: r.type, tag: r.tag, description: r.description ?? '', transaction_date: r.transaction_date,
        cat: (Array.isArray(r.finance_categories) ? r.finance_categories[0]?.name : r.finance_categories?.name) || 'Lainnya',
      })));
      const seen = new Map<string, { account: string; balance: number; date: string }>();
      for (const r of (b ?? []) as any[]) if (!seen.has(r.account)) seen.set(r.account, { account: r.account, balance: Number(r.balance), date: r.tx_date });
      setBankBal(Array.from(seen.values()));

      const pocket = new Map(((pk ?? []) as any[]).map((p) => [p.id, p]));
      const latest = (sn as any[])[0]?.period as string | undefined;
      setTab(latest ? (sn as any[]).filter((s) => s.period === latest).map((s) => ({ name: pocket.get(s.pocket_id)?.name ?? '?', kind: pocket.get(s.pocket_id)?.kind ?? 'saving', ending: Number(s.ending), period: latest })) : []);
      const totals = new Map<string, number>();
      (sn as any[]).forEach((s) => totals.set(s.period, (totals.get(s.period) ?? 0) + Number(s.ending)));
      setTabTrend(Array.from(totals.entries()).sort(([a], [b2]) => a.localeCompare(b2)).slice(-12).map(([p, v]) => ({ bulan: monthLabel(p.slice(0, 7)), Total: v })));

      const holdings = (pf ?? []) as { ticker: string; buy_price: number; lots: number }[];
      let prices: Record<string, number> = {};
      if (holdings.length) {
        try {
          const r = await fetch(`/api/stocks?symbols=${encodeURIComponent(holdings.map((h) => h.ticker).join(','))}`);
          if (r.ok) ((await r.json()).stocks as any[]).forEach((s) => { if (s.price > 0) prices[String(s.ticker).replace('.JK', '')] = s.price; });
        } catch { prices = {}; }
      }
      setStocks(holdings.map((h) => ({ ticker: h.ticker.replace('.JK', ''), lots: Number(h.lots), buy: Number(h.buy_price), price: prices[h.ticker.replace('.JK', '')] ?? null })));
      await loadDebts();
      setLoading(false);
    })();
  }, [supabase, loadDebts]);

  // ───────── money position ─────────
  const hasTab = tab.length > 0;
  const bluMain = tab.filter((x) => x.kind !== 'saving');
  const pockets = tab.filter((x) => x.kind === 'saving');
  const otherBanks = bankBal.filter((b) => !/kredit|credit/i.test(b.account) && !(hasTab && b.account === 'Blu by BCA'));
  const bankRows: Row[] = [
    ...otherBanks.map((b) => ({ name: b.account, sub: 'Rekening', value: b.balance, date: b.date })),
    ...bluMain.map((b) => ({ name: b.name === 'bluAccount' ? 'Blu by BCA (bluAccount)' : b.name, sub: 'Rekening Blu', value: b.ending, date: b.period })),
  ].sort((a, b) => b.value - a.value);
  const banksTotal = bankRows.reduce((s, r) => s + r.value, 0);
  const pocketsTotal = pockets.reduce((s, p) => s + p.ending, 0);
  const stocksTotal = stocks.reduce((s, x) => s + (x.price ?? x.buy) * x.lots * 100, 0);
  const stocksCost = stocks.reduce((s, x) => s + x.buy * x.lots * 100, 0);
  const creditTotal = debts.reduce((s, d) => s + d.balance, 0);
  const netWorth = banksTotal + pocketsTotal + stocksTotal - creditTotal;
  const portfolioTotal = pocketsTotal + stocksTotal;

  // ───────── flows ─────────
  const real = useMemo(() => txs.filter((t) => !isTransfer(t)), [txs]);
  const inMonth = useCallback((m: string) => real.filter((t) => monthKey(t.transaction_date) === m), [real]);
  const sum = (a: Tx[], type: 'income' | 'expense') => a.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
  const cur = inMonth(month), prev = inMonth(shiftMonth(month, -1));
  const income = sum(cur, 'income'), expense = sum(cur, 'expense'), net = income - expense;
  const pIncome = sum(prev, 'income'), pExpense = sum(prev, 'expense');
  const savingRate = income > 0 ? (net / income) * 100 : null;

  const months6 = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
  const flow = months6.map((m) => { const a = inMonth(m); const i = sum(a, 'income'), e = sum(a, 'expense'); return { bulan: monthLabel(m), Pemasukan: i, Pengeluaran: e, Selisih: i - e, Tabungan: i > 0 ? Math.round(((i - e) / i) * 100) : 0 }; });

  const group = (a: Tx[], type: 'income' | 'expense') => {
    const m = new Map<string, number>();
    a.filter((t) => t.type === type).forEach((t) => m.set(t.cat, (m.get(t.cat) ?? 0) + t.amount));
    return Array.from(m.entries()).map(([name, value]) => ({ name, value })).sort((x, y) => y.value - x.value);
  };
  const expCats = group(cur, 'expense'), incCats = group(cur, 'income');
  const prevExp = new Map(group(prev, 'expense').map((c) => [c.name, c.value]));
  const catBars = expCats.slice(0, 7).map((c) => ({ kategori: c.name, 'Bulan ini': c.value, 'Bulan lalu': prevExp.get(c.name) ?? 0 }));

  const top5 = (type: 'income' | 'expense') => cur.filter((t) => t.type === type).sort((a, b) => b.amount - a.amount).slice(0, 5);
  const topIn = top5('income'), topOut = top5('expense');

  // burn rate: cumulative spending by day, this month vs last
  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const isThisMonth = month === todayMonth();
  const todayDay = new Date().getDate();
  const cumulative = (a: Tx[]) => { const d = Array(32).fill(0); a.filter((t) => t.type === 'expense').forEach((t) => { d[Number(t.transaction_date.slice(8, 10))] += t.amount; }); let c = 0; return d.map((v, i) => (i === 0 ? 0 : (c += v))); };
  const cumCur = cumulative(cur), cumPrev = cumulative(prev);
  const burn = Array.from({ length: daysInMonth }, (_, i) => ({ hari: i + 1, 'Bulan ini': isThisMonth && i + 1 > todayDay ? null : cumCur[i + 1], 'Bulan lalu': cumPrev[i + 1] }));

  // weekday
  const WD = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const last3 = [month, shiftMonth(month, -1), shiftMonth(month, -2)].flatMap(inMonth);
  const wd = WD.map((name, i) => ({ hari: name, Rata: Math.round(last3.filter((t) => t.type === 'expense' && new Date(`${t.transaction_date}T00:00:00`).getDay() === i).reduce((s, t) => s + t.amount, 0) / 3) }));
  const worstWd = [...wd].sort((a, b) => b.Rata - a.Rata)[0];

  // recurring
  const recurring = useMemo(() => {
    const m = new Map<string, { n: number; total: number }>();
    last3.filter((t) => t.type === 'expense').forEach((t) => {
      const key = cleanDesc(t.description).split('|').slice(0, 2).join(' ').replace(/\d{5,}/g, '').replace(/\s+/g, ' ').trim().slice(0, 42);
      if (!key) return;
      const v = m.get(key) ?? { n: 0, total: 0 };
      m.set(key, { n: v.n + 1, total: v.total + t.amount });
    });
    return Array.from(m.entries()).filter(([, v]) => v.n >= 3).map(([name, v]) => ({ name, ...v, avg: v.total / v.n })).sort((a, b) => b.total - a.total).slice(0, 7);
  }, [last3]);

  // 50 / 30 / 20
  const NEEDS = ['Makan', 'Transport', 'Loan'], WANTS = ['Entertainment', 'Gadget', 'Personal'];
  const needs = expCats.filter((c) => NEEDS.includes(c.name)).reduce((s, c) => s + c.value, 0);
  const wants = expCats.filter((c) => WANTS.includes(c.name)).reduce((s, c) => s + c.value, 0);
  const rest = expense - needs - wants;
  const saved = Math.max(net, 0);
  const pctOf = (v: number) => (income > 0 ? (v / income) * 100 : 0);

  // safety
  const avgExpense3 = [1, 2, 3].map((i) => sum(inMonth(shiftMonth(month, -i)), 'expense')).filter((v) => v > 0);
  const avgMonthlyExpense = avgExpense3.length ? avgExpense3.reduce((a, b) => a + b, 0) / avgExpense3.length : expense;
  const emergencyMonths = avgMonthlyExpense > 0 ? (banksTotal + pocketsTotal) / avgMonthlyExpense : null;
  const cardLimit = debts.filter((d) => d.credit_limit).reduce((s, d) => s + (d.credit_limit ?? 0), 0);
  const cardUsed = debts.filter((d) => d.credit_limit).reduce((s, d) => s + d.balance, 0);

  const insights: string[] = [];
  if (income === 0 && expense === 0) insights.push('Belum ada transaksi di bulan ini.');
  else {
    if (savingRate != null) insights.push(savingRate >= 20 ? `Hebat: kamu menabung ${savingRate.toFixed(0)}% dari pemasukan bulan ini.` : savingRate >= 0 ? `Kamu menabung ${savingRate.toFixed(0)}% dari pemasukan. Patokan sehat adalah 20% atau lebih.` : `Pengeluaran lebih besar ${rp(-net)} dari pemasukan bulan ini.`);
    if (expCats[0]) insights.push(`Pengeluaran terbesar: ${expCats[0].name} (${rp(expCats[0].value)}, ${((expCats[0].value / (expense || 1)) * 100).toFixed(0)}% dari total).`);
    if (pExpense > 0) { const d = ((expense - pExpense) / pExpense) * 100; insights.push(`Pengeluaran ${d >= 0 ? 'naik' : 'turun'} ${Math.abs(d).toFixed(0)}% dibanding bulan lalu.`); }
    if (isThisMonth && expense > 0) insights.push(`Rata-rata keluar ${rp(expense / Math.max(1, todayDay))} per hari; total bulan ini diperkirakan ${rp((expense / Math.max(1, todayDay)) * daysInMonth)}.`);
    if (worstWd && worstWd.Rata > 0) insights.push(`Hari paling boros: ${worstWd.hari} (rata-rata ${rp(worstWd.Rata)}).`);
  }

  // ───────── debts ─────────
  const addDebt = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !form.name.trim()) return;
    await supabase.from('finance_debts').insert({ user_id: user.id, name: form.name.trim(), kind: form.kind, balance: digits(form.balance), credit_limit: form.limit ? digits(form.limit) : null });
    setForm({ name: '', kind: 'credit_card', balance: '', limit: '' });
    loadDebts();
  };
  const saveDebt = async (d: Debt, balance: string, limit: string) => {
    await supabase.from('finance_debts').update({ balance: digits(balance), credit_limit: limit ? digits(limit) : null, updated_at: new Date().toISOString() }).eq('id', d.id);
    loadDebts();
  };
  const removeDebt = async (id: string) => { await supabase.from('finance_debts').delete().eq('id', id); loadDebts(); };

  // ───────── AI advice ─────────
  const askAdvice = async () => {
    setInsightBusy(true); setInsightErr(null);
    const facts = {
      month, income, expense, net, savingRatePct: savingRate && Math.round(savingRate), prevMonth: { income: pIncome, expense: pExpense },
      balances: { banks: Math.round(banksTotal), savingPockets: Math.round(pocketsTotal), stocks: Math.round(stocksTotal), credit: Math.round(creditTotal), netWorth: Math.round(netWorth), emergencyFundMonths: emergencyMonths && Number(emergencyMonths.toFixed(1)) },
      credit: debts.map((d) => ({ name: d.name, kind: d.kind, owed: d.balance, limit: d.credit_limit })),
      stocks: stocks.map((s) => ({ ticker: s.ticker, lots: s.lots, plPct: s.price ? Number(((s.price / s.buy - 1) * 100).toFixed(1)) : null })),
      expenseByCategory: expCats.slice(0, 8).map((c) => ({ category: c.name, amount: c.value, lastMonth: prevExp.get(c.name) ?? 0 })),
      incomeByCategory: incCats.slice(0, 5),
      biggestExpenses: topOut.map((t) => ({ what: cleanDesc(t.description).slice(0, 50), amount: t.amount })),
      recurring: recurring.slice(0, 5).map((r) => ({ what: r.name, times: r.n, total: r.total })),
      split503020: { needsPct: Math.round(pctOf(needs)), wantsPct: Math.round(pctOf(wants)), otherPct: Math.round(pctOf(rest)), savedPct: Math.round(pctOf(saved)) },
      avgMonthlyExpenseLast3: Math.round(avgMonthlyExpense),
    };
    try {
      const res = await fetch('/api/finance/insight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ facts }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not get advice.');
      setInsight(json.insight);
    } catch (e: any) { setInsightErr(e?.message || 'Could not get advice.'); }
    setInsightBusy(false);
  };

  const composition = [
    { name: 'Rekening', value: banksTotal }, { name: 'Pocket tabungan', value: pocketsTotal }, { name: 'Saham', value: stocksTotal },
  ].filter((x) => x.value > 0);

  return (
    <div className="space-y-4 pb-28 md:pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-white tracking-tight">Dashboard Keuangan</h1>
          <p className="text-[11px] text-slate-400">Laporan keuangan pribadimu, tersusun otomatis dari Transaksi, Buku Bank, Tabungan dan Investasi.</p>
        </div>
        <input type="month" value={month} max={todayMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} className="h-9 rounded-xl bg-white/5 border border-white/10 px-2.5 text-xs text-white outline-none [color-scheme:dark]" />
      </div>

      {loading ? <p className="text-xs text-slate-500">Memuat...</p> : (
        <>
          {/* 1. Big numbers */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/[0.07] p-3.5 col-span-2 lg:col-span-1">
              <p className="text-[10px] uppercase tracking-wider text-cyan-300/80">Total saldo</p>
              <p className="text-xl font-extrabold tabular-nums text-cyan-100">{rp(netWorth)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Rekening + pocket + saham − kredit</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Total portofolio</p>
              <p className="text-lg font-extrabold tabular-nums text-violet-200">{rp(portfolioTotal)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Pocket {rpShort(pocketsTotal)} + saham {rpShort(stocksTotal)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Total rekening</p>
              <p className="text-lg font-extrabold tabular-nums text-emerald-300">{rp(banksTotal)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{bankRows.length} rekening</p>
            </div>
            <div className="rounded-2xl border border-red-400/20 bg-red-500/[0.05] p-3.5">
              <p className="text-[10px] uppercase tracking-wider text-red-300/80">Total kredit</p>
              <p className="text-lg font-extrabold tabular-nums text-red-300">{rp(creditTotal)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{cardLimit > 0 ? `Terpakai ${((cardUsed / cardLimit) * 100).toFixed(0)}% dari limit` : debts.length ? `${debts.length} tagihan` : 'Belum diisi'}</p>
            </div>
          </div>

          {/* 2. Balances per place + composition */}
          <div className="grid lg:grid-cols-3 gap-4">
            <Card title="Saldo per rekening dan kredit" hint="Saldo terakhir dari Buku Bank dan laporan Tabungan." className="lg:col-span-2">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/10"><th className="py-1.5">Nama</th><th>Jenis</th><th className="text-right">Saldo</th><th className="text-right">Per tanggal</th><th className="text-right">Porsi</th></tr></thead>
                  <tbody>
                    {bankRows.map((r) => <tr key={r.name} className="border-b border-white/5"><td className="py-2 font-bold text-white">{r.name}</td><td className="text-slate-400">{r.sub}</td><td className="text-right tabular-nums text-slate-100">{rp(r.value)}</td><td className="text-right text-slate-500">{r.date?.slice(0, 10)}</td><td className="text-right tabular-nums text-slate-300">{netWorth ? ((r.value / (banksTotal + pocketsTotal + stocksTotal)) * 100).toFixed(0) : 0}%</td></tr>)}
                    {pockets.map((r) => <tr key={r.name} className="border-b border-white/5"><td className="py-2 font-bold text-white">{r.name}</td><td className="text-slate-400">Pocket Blu</td><td className="text-right tabular-nums text-slate-100">{rp(r.ending)}</td><td className="text-right text-slate-500">{r.period.slice(0, 7)}</td><td className="text-right tabular-nums text-slate-300">{((r.ending / (banksTotal + pocketsTotal + stocksTotal || 1)) * 100).toFixed(0)}%</td></tr>)}
                    {stocksTotal > 0 && <tr className="border-b border-white/5"><td className="py-2 font-bold text-white">Saham</td><td className="text-slate-400">{stocks.length} saham</td><td className="text-right tabular-nums text-slate-100">{rp(stocksTotal)}</td><td className="text-right text-slate-500">harga sekarang</td><td className="text-right tabular-nums text-slate-300">{((stocksTotal / (banksTotal + pocketsTotal + stocksTotal || 1)) * 100).toFixed(0)}%</td></tr>}
                    {debts.map((d) => <tr key={d.id} className="border-b border-white/5"><td className="py-2 font-bold text-red-200">{d.name}</td><td className="text-slate-400">{d.kind === 'credit_card' ? 'Kartu kredit' : d.kind === 'paylater' ? 'PayLater' : 'Pinjaman'}</td><td className="text-right tabular-nums text-red-300">-{rp(d.balance)}</td><td className="text-right text-slate-500">tagihan</td><td className="text-right text-slate-500">-</td></tr>)}
                    <tr><td className="py-2.5 font-extrabold text-white" colSpan={2}>Total saldo</td><td className="text-right font-extrabold tabular-nums text-cyan-200">{rp(netWorth)}</td><td colSpan={2} /></tr>
                  </tbody>
                </table>
              </div>
              {!bankRows.length && !hasTab && <p className="text-[11px] text-amber-300 mt-2">Upload mutasi di Buku Bank dan laporan portofolio di Tabungan agar saldo muncul di sini.</p>}
            </Card>
            <Card title="Isi kekayaanmu" hint="Dari mana saja total saldomu (sebelum dikurangi kredit).">
              {composition.length ? (
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={composition} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>{composition.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip {...tip} formatter={(v) => rp(Number(v))} /><Legend wrapperStyle={{ fontSize: 10 }} /></PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-xs text-slate-500">Belum ada data saldo.</p>}
              {emergencyMonths != null && (
                <div className="mt-1 text-xs text-slate-300 flex items-center justify-between">
                  <span>Dana darurat: <b className="text-white">{emergencyMonths.toFixed(1)} bulan</b> pengeluaran</span>
                  <Chip tone={emergencyMonths >= 3 ? 'good' : emergencyMonths >= 1 ? 'mid' : 'bad'}>{emergencyMonths >= 3 ? 'Aman' : emergencyMonths >= 1 ? 'Cukup tipis' : 'Rawan'}</Chip>
                </div>
              )}
            </Card>
          </div>

          {/* 3. Portfolio + credit */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Total portofolio (pocket tabungan + saham)" hint="Saham memakai harga pasar sekarang.">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/10"><th className="py-1.5">Aset</th><th className="text-right">Nilai</th><th className="text-right">Untung/rugi</th></tr></thead>
                <tbody>
                  {pockets.map((p) => <tr key={p.name} className="border-b border-white/5"><td className="py-2 font-bold text-white">{p.name} <span className="text-[10px] font-normal text-slate-500">pocket</span></td><td className="text-right tabular-nums text-slate-100">{rp(p.ending)}</td><td className="text-right text-slate-500">-</td></tr>)}
                  {stocks.map((s) => {
                    const val = (s.price ?? s.buy) * s.lots * 100, cost = s.buy * s.lots * 100, pl = val - cost;
                    return <tr key={s.ticker} className="border-b border-white/5"><td className="py-2 font-bold text-white">{s.ticker} <span className="text-[10px] font-normal text-slate-500">{s.lots} lot</span></td><td className="text-right tabular-nums text-slate-100">{rp(val)}</td><td className={`text-right tabular-nums ${pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{s.price ? `${pl >= 0 ? '+' : ''}${rp(pl)} (${((pl / (cost || 1)) * 100).toFixed(1)}%)` : 'harga belum ada'}</td></tr>;
                  })}
                  <tr><td className="py-2.5 font-extrabold text-white">Total</td><td className="text-right font-extrabold tabular-nums text-violet-200">{rp(portfolioTotal)}</td><td className={`text-right text-[11px] ${stocksTotal - stocksCost >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{stocksCost ? `saham ${stocksTotal - stocksCost >= 0 ? '+' : ''}${rp(stocksTotal - stocksCost)}` : ''}</td></tr>
                </tbody>
              </table>
              {tabTrend.length > 1 && (
                <>
                  <p className="text-[11px] font-bold text-slate-300 mt-3 mb-1">Total tabungan Blu per bulan</p>
                  <div style={{ height: 150 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={tabTrend} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} /><XAxis dataKey="bulan" {...axis} /><YAxis {...axis} tickFormatter={rpShort} /><Tooltip {...tip} formatter={(v) => rp(Number(v))} /><Line type="monotone" dataKey="Total" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} /></LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </Card>

            <Card title="Kredit dan utang" hint="Isi sisa tagihan kartu kredit, PayLater (Kredivo, dll) dan pinjaman. Angka ini mengurangi total saldo.">
              <div className="space-y-2">
                {debts.map((d) => (
                  <div key={d.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4"><p className="text-xs font-bold text-white truncate">{d.name}</p><p className="text-[10px] text-slate-500">{d.kind === 'credit_card' ? 'Kartu kredit' : d.kind === 'paylater' ? 'PayLater' : 'Pinjaman'}</p></div>
                    <input defaultValue={d.balance} onBlur={(e) => saveDebt(d, e.target.value, String(d.credit_limit ?? ''))} inputMode="numeric" className="col-span-4 h-8 rounded-lg bg-white/5 border border-white/10 px-2 text-xs text-red-200 outline-none" aria-label="Sisa tagihan" />
                    <input defaultValue={d.credit_limit ?? ''} placeholder="limit" onBlur={(e) => saveDebt(d, String(d.balance), e.target.value)} inputMode="numeric" className="col-span-3 h-8 rounded-lg bg-white/5 border border-white/10 px-2 text-xs text-slate-300 placeholder:text-slate-600 outline-none" aria-label="Limit" />
                    <button onClick={() => removeDebt(d.id)} className="col-span-1 text-slate-500 hover:text-red-400" aria-label="Hapus"><Trash2 size={14} /></button>
                    {d.credit_limit ? <div className="col-span-12 -mt-1"><div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className={`h-full ${d.balance / d.credit_limit > 0.3 ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(100, (d.balance / d.credit_limit) * 100)}%` }} /></div><p className="text-[10px] text-slate-500 mt-0.5">Terpakai {((d.balance / d.credit_limit) * 100).toFixed(0)}% dari limit {d.balance / d.credit_limit > 0.3 ? '(sebaiknya di bawah 30%)' : ''}</p></div> : null}
                  </div>
                ))}
                {!debts.length && <p className="text-xs text-slate-500">Belum ada kredit. Tambahkan di bawah.</p>}
              </div>
              <div className="grid grid-cols-12 gap-2 mt-3 pt-3 border-t border-white/10">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama (mis. Kredivo)" className="col-span-12 sm:col-span-4 h-9 rounded-lg bg-white/5 border border-white/10 px-2 text-xs text-white placeholder:text-slate-500 outline-none" />
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="col-span-6 sm:col-span-3 h-9 rounded-lg bg-white/5 border border-white/10 px-2 text-xs text-white outline-none">
                  <option value="credit_card" className="bg-slate-900">Kartu kredit</option><option value="paylater" className="bg-slate-900">PayLater</option><option value="loan" className="bg-slate-900">Pinjaman</option>
                </select>
                <input value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder="Sisa tagihan" inputMode="numeric" className="col-span-6 sm:col-span-2 h-9 rounded-lg bg-white/5 border border-white/10 px-2 text-xs text-white placeholder:text-slate-500 outline-none" />
                <input value={form.limit} onChange={(e) => setForm({ ...form, limit: e.target.value })} placeholder="Limit" inputMode="numeric" className="col-span-6 sm:col-span-2 h-9 rounded-lg bg-white/5 border border-white/10 px-2 text-xs text-white placeholder:text-slate-500 outline-none" />
                <button onClick={addDebt} className="col-span-6 sm:col-span-1 h-9 rounded-lg bg-red-500/20 border border-red-400/40 text-red-200 text-xs font-bold">Tambah</button>
              </div>
            </Card>
          </div>

          {/* 4. This month */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Pemasukan bulan ini', value: rp(income), delta: pIncome ? ((income - pIncome) / pIncome) * 100 : null, good: true, cls: 'text-emerald-300' },
              { label: 'Pengeluaran bulan ini', value: rp(expense), delta: pExpense ? ((expense - pExpense) / pExpense) * 100 : null, good: false, cls: 'text-red-300' },
              { label: 'Selisih (sisa)', value: rp(net), delta: null, good: true, cls: net >= 0 ? 'text-cyan-200' : 'text-red-300' },
              { label: 'Tingkat tabungan', value: savingRate == null ? '-' : `${savingRate.toFixed(0)}%`, delta: null, good: true, cls: savingRate != null && savingRate >= 20 ? 'text-emerald-300' : 'text-amber-200' },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">{k.label}</p>
                <p className={`text-lg font-extrabold tabular-nums ${k.cls}`}>{k.value}</p>
                {k.delta != null && <p className={`text-[10px] ${(k.delta >= 0) === k.good ? 'text-emerald-400' : 'text-red-400'}`}>{k.delta >= 0 ? '▲' : '▼'} {Math.abs(k.delta).toFixed(0)}% vs bulan lalu</p>}
              </div>
            ))}
          </div>

          {/* 5. Monthly charts */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Arus kas 6 bulan" hint="Hijau = masuk, merah = keluar, garis biru = sisa. Di atas nol berarti kamu berhasil menabung.">
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={flow} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} /><XAxis dataKey="bulan" {...axis} /><YAxis {...axis} tickFormatter={rpShort} />
                    <Tooltip {...tip} formatter={(v) => rp(Number(v))} /><Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Pemasukan" fill="#34d399" radius={[4, 4, 0, 0]} /><Bar dataKey="Pengeluaran" fill="#f87171" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="Selisih" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Tingkat tabungan per bulan" hint="Persen pemasukan yang tersisa. Garis putus-putus hijau adalah target sehat 20%.">
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flow} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} /><XAxis dataKey="bulan" {...axis} /><YAxis {...axis} unit="%" />
                    <Tooltip {...tip} formatter={(v) => `${v}%`} /><ReferenceLine y={20} stroke="#34d399" strokeDasharray="4 4" /><ReferenceLine y={0} stroke="#64748b" />
                    <Bar dataKey="Tabungan" radius={[4, 4, 0, 0]}>{flow.map((f, i) => <Cell key={i} fill={f.Tabungan >= 20 ? '#34d399' : f.Tabungan >= 0 ? '#fbbf24' : '#f87171'} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* 6. Categories */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Uangmu dipakai untuk apa?" hint="Pengeluaran bulan ini per kategori. Warna di kolom terakhir: merah = naik banyak, hijau = turun.">
              {expCats.length === 0 ? <p className="text-xs text-slate-500">Belum ada pengeluaran.</p> : (
                <>
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart><Pie data={expCats.slice(0, 8)} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82} paddingAngle={2}>{expCats.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip {...tip} formatter={(v) => rp(Number(v))} /></PieChart>
                    </ResponsiveContainer>
                  </div>
                  <table className="w-full text-xs mt-1">
                    <thead><tr className="text-[10px] uppercase text-slate-500 border-b border-white/10"><th className="text-left py-1.5">Kategori</th><th className="text-right">Jumlah</th><th className="text-right">Porsi</th><th className="text-right">Vs lalu</th></tr></thead>
                    <tbody>{expCats.map((c, i) => { const p = prevExp.get(c.name) ?? 0; const d = p ? ((c.value - p) / p) * 100 : null; return (
                      <tr key={c.name} className="border-b border-white/5 last:border-0"><td className="py-2 font-bold text-white"><span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: COLORS[i % COLORS.length] }} />{c.name}</td><td className="text-right tabular-nums text-slate-200">{rp(c.value)}</td><td className="text-right tabular-nums text-slate-300">{((c.value / expense) * 100).toFixed(0)}%</td><td className={`text-right tabular-nums ${d == null ? 'text-slate-500' : d > 20 ? 'text-red-400' : d < -10 ? 'text-emerald-400' : 'text-slate-300'}`}>{d == null ? 'baru' : `${d >= 0 ? '+' : ''}${d.toFixed(0)}%`}</td></tr>); })}</tbody>
                  </table>
                </>
              )}
            </Card>
            <Card title="Kategori: bulan ini vs bulan lalu" hint="Batang biru bulan ini, abu-abu bulan lalu. Cari kategori yang batangnya jauh lebih tinggi.">
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catBars} layout="vertical" margin={{ top: 5, right: 12, left: 10, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} /><XAxis type="number" {...axis} tickFormatter={rpShort} /><YAxis type="category" dataKey="kategori" {...axis} width={80} />
                    <Tooltip {...tip} formatter={(v) => rp(Number(v))} /><Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Bulan ini" fill="#38bdf8" radius={[0, 4, 4, 0]} /><Bar dataKey="Bulan lalu" fill="#475569" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* 7. Top 5 */}
          <div className="grid lg:grid-cols-2 gap-4">
            {[{ title: 'Top 5 pemasukan', rows: topIn, tone: 'text-emerald-300' }, { title: 'Top 5 pengeluaran', rows: topOut, tone: 'text-red-300' }].map((b) => (
              <Card key={b.title} title={b.title} hint="Transaksi terbesar bulan ini (transfer antar rekeningmu tidak dihitung).">
                {b.rows.length === 0 ? <p className="text-xs text-slate-500">Belum ada.</p> : (
                  <table className="w-full text-xs">
                    <tbody>{b.rows.map((t, i) => (
                      <tr key={i} className="border-b border-white/5 last:border-0">
                        <td className="py-2 w-6 text-slate-500">{i + 1}</td>
                        <td className="py-2"><p className="text-white font-bold truncate max-w-[260px]">{cleanDesc(t.description) || t.cat}</p><p className="text-[10px] text-slate-500">{t.transaction_date} · {t.cat}</p></td>
                        <td className={`text-right tabular-nums font-bold ${b.tone}`}>{rp(t.amount)}</td>
                      </tr>))}</tbody>
                  </table>
                )}
              </Card>
            ))}
          </div>

          {/* 8. Behaviour */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Kecepatan pengeluaran" hint="Total pengeluaran yang menumpuk hari demi hari. Kalau garis bulan ini lebih tinggi dari bulan lalu di tanggal yang sama, kamu lebih boros.">
              <div style={{ height: 230 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={burn} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} /><XAxis dataKey="hari" {...axis} /><YAxis {...axis} tickFormatter={rpShort} />
                    <Tooltip {...tip} formatter={(v) => rp(Number(v))} labelFormatter={(l) => `Tanggal ${l}`} /><Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="Bulan lalu" stroke="#64748b" dot={false} strokeWidth={1.5} /><Line type="monotone" dataKey="Bulan ini" stroke="#f87171" dot={false} strokeWidth={2.5} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Hari apa kamu paling boros?" hint="Rata-rata pengeluaran per hari dalam seminggu (3 bulan terakhir).">
              <div style={{ height: 230 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wd} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} /><XAxis dataKey="hari" {...axis} /><YAxis {...axis} tickFormatter={rpShort} />
                    <Tooltip {...tip} formatter={(v) => rp(Number(v))} />
                    <Bar dataKey="Rata" radius={[4, 4, 0, 0]}>{wd.map((d, i) => <Cell key={i} fill={d.hari === worstWd?.hari ? '#f87171' : '#38bdf8'} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Aturan 50/30/20" hint="Patokan umum: 50% kebutuhan, 30% keinginan, 20% tabungan. Kebutuhan = Makan, Transport, Loan. Keinginan = Entertainment, Gadget, Personal.">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/10"><th className="py-1.5">Kelompok</th><th className="text-right">Jumlah</th><th className="text-right">Porsi</th><th className="text-right">Target</th><th className="text-right">Status</th></tr></thead>
                <tbody>
                  {[{ n: 'Kebutuhan', v: needs, t: 50, max: true }, { n: 'Keinginan', v: wants, t: 30, max: true }, { n: 'Tabungan', v: saved, t: 20, max: false }].map((r) => {
                    const p = pctOf(r.v); const ok = r.max ? p <= r.t : p >= r.t;
                    return <tr key={r.n} className="border-b border-white/5"><td className="py-2 font-bold text-white">{r.n}</td><td className="text-right tabular-nums text-slate-200">{rp(r.v)}</td><td className="text-right tabular-nums text-slate-200">{p.toFixed(0)}%</td><td className="text-right text-slate-400">{r.max ? '≤' : '≥'} {r.t}%</td><td className="text-right"><Chip tone={ok ? 'good' : p > r.t * 1.3 || (!r.max && p < r.t / 2) ? 'bad' : 'mid'}>{ok ? 'Sesuai' : r.max ? 'Terlalu besar' : 'Kurang'}</Chip></td></tr>;
                  })}
                  {rest > 0 && <tr><td className="py-2 text-slate-400">Lainnya (belum masuk kelompok)</td><td className="text-right tabular-nums text-slate-400">{rp(rest)}</td><td className="text-right tabular-nums text-slate-400">{pctOf(rest).toFixed(0)}%</td><td colSpan={2} /></tr>}
                </tbody>
              </table>
            </Card>
            <Card title="Pengeluaran berulang" hint="Hal yang kamu bayar berkali-kali dalam 3 bulan terakhir. Pengeluaran kecil yang berulang sering jadi kebocoran terbesar.">
              {recurring.length === 0 ? <p className="text-xs text-slate-500">Belum ada pola berulang.</p> : (
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/10"><th className="py-1.5">Untuk</th><th className="text-right">Kali</th><th className="text-right">Rata-rata</th><th className="text-right">Total</th></tr></thead>
                  <tbody>{recurring.map((r) => <tr key={r.name} className="border-b border-white/5 last:border-0"><td className="py-2 font-bold text-white truncate max-w-[220px]">{r.name}</td><td className="text-right tabular-nums text-slate-300">{r.n}x</td><td className="text-right tabular-nums text-slate-300">{rp(r.avg)}</td><td className="text-right tabular-nums text-red-300">{rp(r.total)}</td></tr>)}</tbody>
                </table>
              )}
            </Card>
          </div>

          {/* 9. Statement + AI advice */}
          <Card title="Ringkasan untukmu">
            <ul className="space-y-1.5">{insights.map((t, i) => <li key={i} className="text-xs text-slate-200 leading-relaxed flex gap-2"><span className="text-cyan-300">•</span>{t}</li>)}</ul>
          </Card>

          <Card title="Saran akuntan AI" hint="Jax membaca angka-angka di atas dan memberi saran. Tidak mengirim teks mutasi bankmu, hanya total dan kategori.">
            <button onClick={askAdvice} disabled={insightBusy} className="h-10 px-5 rounded-xl border border-cyan-400/40 bg-cyan-500/15 text-cyan-100 text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-60">
              {insightBusy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}{insight ? 'Perbarui saran' : 'Minta saran untuk bulan ini'}
            </button>
            {insightErr && <p className="text-xs text-red-400 mt-2">{insightErr}</p>}
            {insight && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center text-lg font-extrabold ${insight.score >= 70 ? 'border-emerald-400 text-emerald-300' : insight.score >= 45 ? 'border-amber-400 text-amber-200' : 'border-red-400 text-red-300'}`}>{insight.score}</div>
                  <div><p className="text-[10px] uppercase tracking-wider text-slate-500">Skor kesehatan keuangan bulan ini</p><p className="text-sm font-bold text-white leading-snug">{insight.headline}</p></div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] p-3"><p className="text-[11px] font-bold text-emerald-300 mb-1.5">Yang sudah bagus</p><ul className="space-y-1">{insight.good.map((g, i) => <li key={i} className="text-xs text-slate-200 leading-relaxed">✓ {g}</li>)}</ul></div>
                  <div className="rounded-xl border border-red-400/20 bg-red-500/[0.06] p-3"><p className="text-[11px] font-bold text-red-300 mb-1.5">Yang perlu diwaspadai</p><ul className="space-y-1">{insight.risks.map((g, i) => <li key={i} className="text-xs text-slate-200 leading-relaxed">! {g}</li>)}</ul></div>
                </div>
                {insight.actions.length > 0 && (
                  <div className="overflow-x-auto">
                    <p className="text-[11px] font-bold text-white mb-1.5">Langkah yang disarankan</p>
                    <table className="w-full text-xs"><thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/10"><th className="py-1.5">Langkah</th><th>Kenapa</th><th className="text-right">Dampak</th></tr></thead>
                      <tbody>{insight.actions.map((a, i) => <tr key={i} className="border-b border-white/5 last:border-0 align-top"><td className="py-2 pr-3 font-bold text-white">{i + 1}. {a.title}</td><td className="py-2 pr-3 text-slate-300">{a.why}</td><td className="py-2 text-right text-cyan-200">{a.impact}</td></tr>)}</tbody></table>
                  </div>
                )}
                {insight.budgets.length > 0 && (
                  <div className="overflow-x-auto">
                    <p className="text-[11px] font-bold text-white mb-1.5">Usulan batas bulanan</p>
                    <table className="w-full text-xs"><thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/10"><th className="py-1.5">Kategori</th><th className="text-right">Batas</th><th>Alasan</th></tr></thead>
                      <tbody>{insight.budgets.map((b, i) => <tr key={i} className="border-b border-white/5 last:border-0 align-top"><td className="py-2 font-bold text-white">{b.category}</td><td className="py-2 text-right tabular-nums text-cyan-200">{rp(b.limit)}</td><td className="py-2 pl-3 text-slate-300">{b.reason}</td></tr>)}</tbody></table>
                  </div>
                )}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
