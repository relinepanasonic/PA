'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { fetchAll } from '@/lib/supabase/fetchAll';

interface Tx {
  amount: number;
  type: 'income' | 'expense';
  tag: string;
  description: string;
  transaction_date: string;
  cat: string;
}

const COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#fb923c', '#f87171', '#2dd4bf', '#60a5fa', '#c084fc'];
const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const rpShort = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt` : Math.abs(n) >= 1e3 ? `${Math.round(n / 1e3)} rb` : String(Math.round(n)));
const monthKey = (d: string) => d.slice(0, 7);
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
const isTransfer = (t: Tx) => t.description.includes('___TRANSFER___');
const axis = { stroke: '#64748b', fontSize: 10 };
const tip = { contentStyle: { background: '#0b1226', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, fontSize: 11 }, labelStyle: { color: '#94a3b8' }, itemStyle: { color: '#f1f5f9' }, cursor: { fill: 'rgba(148,163,184,0.12)' } };

const todayMonth = () => new Date().toISOString().slice(0, 7);
const shiftMonth = (m: string, delta: number) => {
  const d = new Date(`${m}-01T00:00:00`);
  d.setMonth(d.getMonth() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

function Card({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
      <p className="text-sm font-bold text-white">{title}</p>
      {hint && <p className="text-[11px] text-slate-400 mb-2.5 leading-snug">{hint}</p>}
      {children}
    </div>
  );
}

export default function FinanceDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [balances, setBalances] = useState<{ account: string; balance: number; date: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(todayMonth());

  useEffect(() => {
    (async () => {
      const from = `${shiftMonth(todayMonth(), -12)}-01`;
      const [t, b] = await Promise.all([
        fetchAll<any>((x, y) => supabase.from('finance_transactions').select('amount,type,tag,description,transaction_date,finance_categories(name)')
          .gte('transaction_date', from).order('transaction_date', { ascending: false }).order('id').range(x, y)),
        supabase.from('bank_statement_lines').select('account,balance,tx_date').not('balance', 'is', null)
          .order('tx_date', { ascending: false }).order('created_at', { ascending: false }).limit(400).then((r) => r.data),
      ]);
      setTxs((t as any[]).map((r) => ({
        amount: Number(r.amount), type: r.type, tag: r.tag, description: r.description ?? '', transaction_date: r.transaction_date,
        cat: (Array.isArray(r.finance_categories) ? r.finance_categories[0]?.name : r.finance_categories?.name) || 'Lainnya',
      })));
      const seen = new Map<string, { account: string; balance: number; date: string }>();
      for (const r of (b ?? []) as any[]) if (!seen.has(r.account)) seen.set(r.account, { account: r.account, balance: Number(r.balance), date: r.tx_date });
      setBalances(Array.from(seen.values()));
      setLoading(false);
    })();
  }, [supabase]);

  const real = useMemo(() => txs.filter((t) => !isTransfer(t)), [txs]);
  const inMonth = (m: string) => real.filter((t) => monthKey(t.transaction_date) === m);
  const sum = (a: Tx[], type: 'income' | 'expense') => a.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);

  const cur = inMonth(month), prev = inMonth(shiftMonth(month, -1));
  const income = sum(cur, 'income'), expense = sum(cur, 'expense'), net = income - expense;
  const pIncome = sum(prev, 'income'), pExpense = sum(prev, 'expense');
  const savingRate = income > 0 ? (net / income) * 100 : null;

  // 6-month cash flow
  const months6 = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
  const flow = months6.map((m) => {
    const a = inMonth(m);
    const i = sum(a, 'income'), e = sum(a, 'expense');
    return { bulan: monthLabel(m), Pemasukan: i, Pengeluaran: e, Selisih: i - e };
  });

  // categories
  const group = (a: Tx[], type: 'income' | 'expense') => {
    const m = new Map<string, number>();
    a.filter((t) => t.type === type).forEach((t) => m.set(t.cat, (m.get(t.cat) ?? 0) + t.amount));
    return Array.from(m.entries()).map(([name, value]) => ({ name, value })).sort((x, y) => y.value - x.value);
  };
  const expCats = group(cur, 'expense'), incCats = group(cur, 'income');
  const prevExp = new Map(group(prev, 'expense').map((c) => [c.name, c.value]));

  // insights
  const today = new Date();
  const isThisMonth = month === todayMonth();
  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const daysPassed = isThisMonth ? Math.max(1, today.getDate()) : daysInMonth;
  const dailyAvg = expense / daysPassed;
  const projected = isThisMonth ? dailyAvg * daysInMonth : expense;
  const biggest = cur.filter((t) => t.type === 'expense').sort((a, b) => b.amount - a.amount)[0];
  const profExp = cur.filter((t) => t.type === 'expense' && t.tag === 'professional').reduce((s, t) => s + t.amount, 0);

  const insights: string[] = [];
  if (income === 0 && expense === 0) insights.push('Belum ada transaksi di bulan ini.');
  else {
    if (savingRate != null) insights.push(savingRate >= 20 ? `Hebat: kamu menabung ${savingRate.toFixed(0)}% dari pemasukan bulan ini.` : savingRate >= 0 ? `Kamu menabung ${savingRate.toFixed(0)}% dari pemasukan. Patokan sehat adalah 20% atau lebih.` : `Pengeluaran lebih besar ${rp(-net)} dari pemasukan bulan ini.`);
    if (expCats[0]) insights.push(`Pengeluaran terbesar: ${expCats[0].name} (${rp(expCats[0].value)}, ${((expCats[0].value / (expense || 1)) * 100).toFixed(0)}% dari total).`);
    if (pExpense > 0) { const d = ((expense - pExpense) / pExpense) * 100; insights.push(`Pengeluaran ${d >= 0 ? 'naik' : 'turun'} ${Math.abs(d).toFixed(0)}% dibanding bulan lalu.`); }
    if (isThisMonth && expense > 0) insights.push(`Rata-rata keluar ${rp(dailyAvg)} per hari. Kalau terus begini, total bulan ini sekitar ${rp(projected)}.`);
    if (biggest) insights.push(`Satu pengeluaran terbesar: ${biggest.description.replace(/^\[.*?\]\s*/, '') || biggest.cat} (${rp(biggest.amount)}).`);
  }

  const totalCash = balances.reduce((s, b) => s + b.balance, 0);

  return (
    <div className="space-y-4 pb-28 md:pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-white tracking-tight">Dashboard Keuangan</h1>
          <p className="text-[11px] text-slate-400">Laporan keuangan pribadimu, tersusun otomatis dari Transaksi.</p>
        </div>
        <input type="month" value={month} max={todayMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} className="h-9 rounded-xl bg-white/5 border border-white/10 px-2.5 text-xs text-white outline-none [color-scheme:dark]" />
      </div>

      {loading ? <p className="text-xs text-slate-500">Memuat...</p> : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Pemasukan', value: rp(income), delta: pIncome ? ((income - pIncome) / pIncome) * 100 : null, good: true, cls: 'text-emerald-300' },
              { label: 'Pengeluaran', value: rp(expense), delta: pExpense ? ((expense - pExpense) / pExpense) * 100 : null, good: false, cls: 'text-red-300' },
              { label: 'Selisih (sisa)', value: rp(net), delta: null, good: true, cls: net >= 0 ? 'text-cyan-200' : 'text-red-300' },
              { label: 'Tingkat tabungan', value: savingRate == null ? '-' : `${savingRate.toFixed(0)}%`, delta: null, good: true, cls: savingRate != null && savingRate >= 20 ? 'text-emerald-300' : 'text-amber-200' },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">{k.label}</p>
                <p className={`text-base font-extrabold tabular-nums ${k.cls}`}>{k.value}</p>
                {k.delta != null && (
                  <p className={`text-[10px] ${(k.delta >= 0) === k.good ? 'text-emerald-400' : 'text-red-400'}`}>{k.delta >= 0 ? '▲' : '▼'} {Math.abs(k.delta).toFixed(0)}% vs bulan lalu</p>
                )}
              </div>
            ))}
          </div>

          {/* Insights */}
          <Card title="Ringkasan untukmu">
            <ul className="space-y-1.5">
              {insights.map((t, i) => <li key={i} className="text-xs text-slate-200 leading-relaxed flex gap-2"><span className="text-cyan-300">•</span>{t}</li>)}
            </ul>
          </Card>

          {/* Cash flow */}
          <Card title="Arus kas 6 bulan" hint="Hijau = uang masuk, merah = uang keluar, garis biru = sisa. Garis biru di atas nol artinya kamu berhasil menabung.">
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={flow} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="bulan" {...axis} /><YAxis {...axis} tickFormatter={rpShort} />
                  <Tooltip {...tip} formatter={(v) => rp(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Pemasukan" fill="#34d399" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Pengeluaran" fill="#f87171" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="Selisih" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Expense categories */}
          <Card title="Uangmu dipakai untuk apa?" hint="Pengeluaran bulan ini per kategori. Perhatikan kategori yang naik jauh dari bulan lalu.">
            {expCats.length === 0 ? <p className="text-xs text-slate-500">Belum ada pengeluaran.</p> : (
              <>
                <div style={{ height: 210 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expCats.slice(0, 8)} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                        {expCats.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip {...tip} formatter={(v) => rp(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto mt-1">
                  <table className="w-full text-xs">
                    <thead><tr className="text-[10px] uppercase text-slate-500 border-b border-white/10"><th className="text-left py-1.5">Kategori</th><th className="text-right">Jumlah</th><th className="text-right">Porsi</th><th className="text-right">Vs bulan lalu</th></tr></thead>
                    <tbody>
                      {expCats.map((c, i) => {
                        const p = prevExp.get(c.name) ?? 0;
                        const d = p ? ((c.value - p) / p) * 100 : null;
                        return (
                          <tr key={c.name} className="border-b border-white/5 last:border-0">
                            <td className="py-2 font-bold text-white"><span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: COLORS[i % COLORS.length] }} />{c.name}</td>
                            <td className="text-right tabular-nums text-slate-200">{rp(c.value)}</td>
                            <td className="text-right tabular-nums text-slate-300">{((c.value / expense) * 100).toFixed(0)}%</td>
                            <td className={`text-right tabular-nums ${d == null ? 'text-slate-500' : d > 20 ? 'text-red-400' : d < -10 ? 'text-emerald-400' : 'text-slate-300'}`}>{d == null ? 'baru' : `${d >= 0 ? '+' : ''}${d.toFixed(0)}%`}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

          {/* Income statement */}
          <Card title="Laporan laba rugi pribadi" hint="Seperti rapor keuangan: pemasukan dikurangi pengeluaran = sisa uangmu bulan ini.">
            <table className="w-full text-xs">
              <tbody>
                <tr><td colSpan={2} className="pt-1 pb-1 text-[10px] uppercase tracking-wider text-emerald-300 font-bold">Pemasukan</td></tr>
                {incCats.map((c) => <tr key={c.name}><td className="py-1 pl-3 text-slate-300">{c.name}</td><td className="text-right tabular-nums text-slate-100">{rp(c.value)}</td></tr>)}
                <tr className="border-t border-white/10"><td className="py-1.5 font-bold text-white">Total pemasukan</td><td className="text-right font-bold tabular-nums text-emerald-300">{rp(income)}</td></tr>
                <tr><td colSpan={2} className="pt-3 pb-1 text-[10px] uppercase tracking-wider text-red-300 font-bold">Pengeluaran</td></tr>
                {expCats.map((c) => <tr key={c.name}><td className="py-1 pl-3 text-slate-300">{c.name}</td><td className="text-right tabular-nums text-slate-100">{rp(c.value)}</td></tr>)}
                <tr className="border-t border-white/10"><td className="py-1.5 font-bold text-white">Total pengeluaran</td><td className="text-right font-bold tabular-nums text-red-300">{rp(expense)}</td></tr>
                <tr className="border-t-2 border-white/20"><td className="py-2 font-extrabold text-white">Sisa uang bulan ini</td><td className={`text-right font-extrabold tabular-nums ${net >= 0 ? 'text-cyan-200' : 'text-red-300'}`}>{rp(net)}</td></tr>
                {profExp > 0 && <tr><td className="py-1 text-[11px] text-slate-400">Di antaranya pengeluaran bisnis</td><td className="text-right text-[11px] tabular-nums text-slate-400">{rp(profExp)}</td></tr>}
              </tbody>
            </table>
          </Card>

          {/* Balances */}
          <Card title="Posisi uang di rekening" hint="Saldo terakhir yang tertulis di buku bank yang kamu upload.">
            {balances.length === 0 ? <p className="text-xs text-slate-500">Upload buku bank agar saldo tiap rekening muncul di sini.</p> : (
              <table className="w-full text-xs">
                <tbody>
                  {balances.map((b) => (
                    <tr key={b.account} className="border-b border-white/5">
                      <td className="py-2 font-bold text-white">{b.account}<span className="block text-[10px] font-normal text-slate-500">per {b.date}</span></td>
                      <td className="text-right tabular-nums text-slate-100">{rp(b.balance)}</td>
                    </tr>
                  ))}
                  <tr><td className="py-2 font-extrabold text-white">Total</td><td className="text-right font-extrabold tabular-nums text-cyan-200">{rp(totalCash)}</td></tr>
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
