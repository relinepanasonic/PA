'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Loader2, PiggyBank, UploadCloud } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchAll } from '@/lib/supabase/fetchAll';
import { classifyTransfer } from '@/lib/transfers';
import type { PortfolioRow } from '@/app/api/tabungan/parse/route';

interface Pocket { id: string; name: string; kind: 'main' | 'business' | 'saving'; target_amount: number | null }
interface Snap { pocket_id: string; period: string; opening: number; income: number; expense: number; ending: number }

const COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#fb923c', '#f87171', '#2dd4bf', '#60a5fa', '#c084fc'];
const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const monthName = (p: string) => new Date(`${p.slice(0, 7)}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const tip = { contentStyle: { background: '#0b1226', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, fontSize: 11 }, itemStyle: { color: '#f1f5f9' } };

async function toBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function Chip({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${ok ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' : 'bg-amber-500/20 text-amber-200 border-amber-400/40'}`}>{children}</span>;
}

export default function TabunganPage() {
  const supabase = useMemo(() => createClient(), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pockets, setPockets] = useState<Pocket[]>([]);
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [period, setPeriod] = useState<string | null>(null);
  const [bank, setBank] = useState<{ lastBalance: number | null; toPocket: Record<string, number>; fromPocket: Record<string, number> }>({ lastBalance: null, toPocket: {}, fromPocket: {} });

  const load = useCallback(async () => {
    const [{ data: p }, s] = await Promise.all([
      supabase.from('savings_pockets').select('id,name,kind,target_amount').order('created_at'),
      fetchAll<any>((a, b) => supabase.from('savings_snapshots').select('pocket_id,period,opening,income,expense,ending').order('period', { ascending: false }).order('id').range(a, b)),
    ]);
    setPockets(((p ?? []) as any[]).map((x) => ({ ...x, target_amount: x.target_amount == null ? null : Number(x.target_amount) })));
    const parsed = s.map((x) => ({ ...x, opening: Number(x.opening), income: Number(x.income), expense: Number(x.expense), ending: Number(x.ending) })) as Snap[];
    setSnaps(parsed);
    setPeriod((cur) => cur ?? parsed[0]?.period ?? null);
    setLoading(false);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  const periods = useMemo(() => Array.from(new Set(snaps.map((s) => s.period))).sort().reverse(), [snaps]);
  const nextPeriod = (p: string) => { const d = new Date(`${p}T00:00:00`); d.setMonth(d.getMonth() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };

  // numbers from Buku Bank for the selected month, used to cross-check the report
  useEffect(() => {
    if (!period) return;
    (async () => {
      const lines = await fetchAll<any>((a, b) => supabase.from('bank_statement_lines').select('tx_date,description,amount,direction,balance,created_at,account')
        .eq('account', 'Blu by BCA').gte('tx_date', period).lt('tx_date', nextPeriod(period)).order('tx_date').order('id').range(a, b));
      const toPocket: Record<string, number> = {}, fromPocket: Record<string, number> = {};
      let last: { d: string; bal: number } | null = null;
      for (const l of lines) {
        const info = classifyTransfer(String(l.description));
        if (info?.kind === 'pocket') {
          const name = info.counter.replace(/^Pocket /, '');
          const target = l.direction === 'out' ? toPocket : fromPocket;
          target[name] = (target[name] ?? 0) + Number(l.amount);
        }
        if (l.balance != null && (!last || l.tx_date >= last.d)) last = { d: l.tx_date, bal: Number(l.balance) };
      }
      setBank({ lastBalance: last?.bal ?? null, toPocket, fromPocket });
    })();
  }, [supabase, period]);

  // ── upload ──
  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setMessage(null);
    const notes: string[] = [];
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please log in again.');
      for (const file of Array.from(files)) {
        setProgress(`Reading ${file.name}...`);
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        if (isPdf && file.size > 4_200_000) throw new Error(`${file.name} is too large.`);
        const res = await fetch('/api/tabungan/parse', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: isPdf ? 'pdf' : 'image', data: await toBase64(file) }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || `Could not read ${file.name}`);
        const rows = json.rows as PortfolioRow[];
        const periodDate = `${json.period}-01`;

        setProgress(`Saving ${monthName(periodDate)}...`);
        const { data: have } = await supabase.from('savings_pockets').select('id,name');
        const idByName = new Map(((have ?? []) as any[]).map((p) => [norm(p.name), p.id as string]));
        for (const r of rows) {
          if (idByName.has(norm(r.name))) continue;
          const { data: created } = await supabase.from('savings_pockets').insert({ user_id: user.id, bank: 'Blu', name: r.name, kind: r.kind }).select('id').single();
          if (created) idByName.set(norm(r.name), created.id);
        }
        const { error } = await supabase.from('savings_snapshots').upsert(
          rows.map((r) => ({ user_id: user.id, pocket_id: idByName.get(norm(r.name)), period: periodDate, opening: r.opening, income: r.income, expense: r.expense, ending: r.ending, source_file: file.name })),
          { onConflict: 'pocket_id,period' },
        );
        if (error) throw new Error(error.message);
        const total = rows.reduce((s, r) => s + r.ending, 0);
        const bad = rows.filter((r) => Math.abs(r.diff) > 1);
        notes.push(`${monthName(periodDate)}: ${rows.length} rows saved, total ${rp(total)}${json.totalEnding && Math.abs(json.totalEnding - total) > 1 ? ` (the report says ${rp(json.totalEnding)}, please check)` : ' (matches the report)'}${bad.length ? `. Check: ${bad.map((b) => b.name).join(', ')} do not add up` : ''}.`);
        setPeriod(periodDate);
      }
      setMessage({ ok: true, text: notes.join(' ') });
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message || 'Upload failed.' });
    }
    setProgress(null);
    if (fileRef.current) fileRef.current.value = '';
    load();
  };

  const saveTarget = async (p: Pocket, value: string) => {
    const v = value.trim() === '' ? null : Number(value.replace(/\./g, '').replace(',', '.'));
    if (v != null && !Number.isFinite(v)) return;
    await supabase.from('savings_pockets').update({ target_amount: v }).eq('id', p.id);
    load();
  };

  // ── view data ──
  const byPocket = useMemo(() => new Map(pockets.map((p) => [p.id, p])), [pockets]);
  const cur = snaps.filter((s) => s.period === period);
  const prevPeriod = periods[periods.indexOf(period ?? '') + 1];
  const prev = new Map(snaps.filter((s) => s.period === prevPeriod).map((s) => [s.pocket_id, s]));
  const rowsNow = cur.map((s) => ({ s, p: byPocket.get(s.pocket_id) })).filter((x): x is { s: Snap; p: Pocket } => !!x.p)
    .sort((a, b) => b.s.ending - a.s.ending);
  const total = rowsNow.reduce((t, x) => t + x.s.ending, 0);
  const prevTotal = Array.from(prev.values()).reduce((t, s) => t + s.ending, 0);
  const main = rowsNow.find((x) => x.p.kind === 'main')?.s.ending ?? 0;
  const inPockets = rowsNow.filter((x) => x.p.kind === 'saving').reduce((t, x) => t + x.s.ending, 0);
  const pie = rowsNow.filter((x) => x.s.ending > 0).map((x) => ({ name: x.p.name, value: x.s.ending }));
  const savingRows = rowsNow.filter((x) => x.p.kind === 'saving');
  const mainRow = rowsNow.find((x) => x.p.kind === 'main');

  const delta = (now: number, before: number | undefined) => (before == null ? null : now - before);
  const totalDelta = prevPeriod ? total - prevTotal : null;
  const biggest = rowsNow[0];

  return (
    <div className="pb-28 md:pb-8 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-2xl bg-violet-500/15 border border-violet-400/30 flex items-center justify-center text-violet-300"><PiggyBank size={18} /></div>
        <div>
          <h1 className="text-lg font-extrabold text-white tracking-tight">Tabungan</h1>
          <p className="text-[11px] text-slate-400">Saldo bluAccount dan semua pocket Blu, bulan demi bulan.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
          <p className="text-sm font-bold text-white">Upload laporan portofolio bulanan</p>
          <p className="text-[11px] text-slate-400 mb-3">PDF "Laporan Portofolio" dari aplikasi Blu, satu file per bulan. Bisa pilih beberapa file sekaligus. Upload bulan yang sama lagi akan menggantikan datanya.</p>
          <input ref={fileRef} type="file" multiple accept=".pdf,image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={!!progress}
            className="w-full h-11 rounded-xl border border-violet-400/40 bg-violet-500/15 text-violet-100 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60">
            {progress ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}{progress ?? 'Upload laporan portofolio'}
          </button>
          {message && <p className={`mt-2 text-xs leading-relaxed ${message.ok ? 'text-emerald-300' : 'text-red-400'}`}>{message.text}</p>}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 flex flex-col justify-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Bulan</p>
          <select value={period ?? ''} onChange={(e) => setPeriod(e.target.value)} disabled={!periods.length}
            className="h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-white outline-none">
            {periods.map((p) => <option key={p} value={p} className="bg-slate-900">{monthName(p)}</option>)}
            {!periods.length && <option>Belum ada data</option>}
          </select>
          {biggest && <p className="text-xs text-slate-300 mt-3 leading-relaxed">
            Total tabunganmu {rp(total)}{totalDelta != null ? `, ${totalDelta >= 0 ? 'naik' : 'turun'} ${rp(Math.abs(totalDelta))} dibanding bulan lalu` : ''}. Terbesar ada di <b className="text-white">{biggest.p.name}</b> ({rp(biggest.s.ending)}).
          </p>}
        </div>
      </div>

      {loading ? <p className="text-xs text-slate-500">Memuat...</p> : !periods.length ? (
        <p className="text-xs text-slate-500 text-center py-10">Belum ada data. Upload laporan portofolio Blu pertamamu di atas.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total portofolio', value: rp(total), cls: 'text-cyan-200', sub: totalDelta != null ? `${totalDelta >= 0 ? '▲' : '▼'} ${rp(Math.abs(totalDelta))} vs bulan lalu` : null, good: (totalDelta ?? 0) >= 0 },
              { label: 'Di pocket tabungan', value: rp(inPockets), cls: 'text-violet-200', sub: null, good: true },
              { label: 'Di bluAccount', value: rp(main), cls: 'text-emerald-300', sub: null, good: true },
              { label: 'Jumlah pocket', value: String(savingRows.length), cls: 'text-slate-100', sub: null, good: true },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">{k.label}</p>
                <p className={`text-lg font-extrabold tabular-nums ${k.cls}`}>{k.value}</p>
                {k.sub && <p className={`text-[10px] ${k.good ? 'text-emerald-400' : 'text-red-400'}`}>{k.sub}</p>}
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 lg:col-span-1">
              <p className="text-sm font-bold text-white">Uangmu ada di mana?</p>
              <p className="text-[11px] text-slate-400">Porsi saldo akhir tiap rekening dan pocket.</p>
              <div style={{ height: 230 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...tip} formatter={(v) => rp(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1">
                {pie.map((x, i) => (
                  <div key={x.name} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300"><span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: COLORS[i % COLORS.length] }} />{x.name}</span>
                    <span className="text-slate-200 tabular-nums">{total ? ((x.value / total) * 100).toFixed(0) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-3 content-start">
              {rowsNow.map(({ s, p }) => {
                const d = delta(s.ending, prev.get(p.id)?.ending);
                const pct = p.target_amount ? Math.min(100, (s.ending / p.target_amount) * 100) : null;
                return (
                  <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-white">{p.name}</p>
                      <span className="text-[9px] uppercase tracking-wider text-slate-500">{p.kind === 'main' ? 'rekening' : p.kind === 'business' ? 'bisnis' : 'pocket'}</span>
                    </div>
                    <p className="text-lg font-extrabold tabular-nums text-cyan-100">{rp(s.ending)}</p>
                    {d != null && <p className={`text-[11px] ${d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{d >= 0 ? '▲' : '▼'} {rp(Math.abs(d))} vs bulan lalu</p>}
                    <p className="text-[10px] text-slate-500 mt-1">Masuk {rp(s.income)} · Keluar {rp(s.expense)}</p>
                    {p.kind === 'saving' && (
                      <div className="mt-2">
                        {pct != null && <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1"><div className="h-full bg-violet-400" style={{ width: `${pct}%` }} /></div>}
                        <input
                          defaultValue={p.target_amount ?? ''} placeholder="Target (Rp), opsional" inputMode="numeric"
                          onBlur={(e) => saveTarget(p, e.target.value)}
                          className="w-full h-7 rounded-lg bg-white/5 border border-white/10 px-2 text-[11px] text-slate-200 placeholder:text-slate-600 outline-none"
                        />
                        {pct != null && <p className="text-[10px] text-violet-300 mt-0.5">{pct.toFixed(0)}% dari target</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* cross-check with Buku Bank */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
            <p className="text-sm font-bold text-white">Cocokkan dengan Buku Bank</p>
            <p className="text-[11px] text-slate-400 mb-3">Laporan ini harus sama dengan mutasi bluAccount yang sudah kamu upload. Selisih kecil di pocket biasanya bunga.</p>
            {mainRow && (
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="text-slate-300">Saldo akhir bluAccount: laporan {rp(mainRow.s.ending)}</span>
                {bank.lastBalance == null ? <Chip ok={false}>Belum ada mutasi bulan ini di Buku Bank</Chip>
                  : <><span className="text-slate-300">mutasi {rp(bank.lastBalance)}</span><Chip ok={Math.abs(bank.lastBalance - mainRow.s.ending) < 1}>{Math.abs(bank.lastBalance - mainRow.s.ending) < 1 ? 'Cocok' : `Selisih ${rp(Math.abs(bank.lastBalance - mainRow.s.ending))}`}</Chip></>}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/10">
                  <th className="py-1.5">Pocket</th><th className="text-right">Masuk (laporan)</th><th className="text-right">Dari mutasi</th><th className="text-right">Keluar (laporan)</th><th className="text-right">Ke mutasi</th><th className="text-right">Status</th>
                </tr></thead>
                <tbody>
                  {savingRows.map(({ s, p }) => {
                    const key = Object.keys({ ...bank.toPocket, ...bank.fromPocket }).find((k) => norm(k) === norm(p.name) || norm(k).includes(norm(p.name)) || norm(p.name).includes(norm(k)));
                    const toP = key ? bank.toPocket[key] ?? 0 : 0, fromP = key ? bank.fromPocket[key] ?? 0 : 0;
                    const ok = Math.abs(s.income - toP) <= 25000 && Math.abs(s.expense - fromP) <= 25000;
                    const noBank = bank.lastBalance == null;
                    return (
                      <tr key={p.id} className="border-b border-white/5 last:border-0">
                        <td className="py-2 font-bold text-white">{p.name}</td>
                        <td className="text-right tabular-nums text-slate-200">{rp(s.income)}</td><td className="text-right tabular-nums text-slate-300">{noBank ? '-' : rp(toP)}</td>
                        <td className="text-right tabular-nums text-slate-200">{rp(s.expense)}</td><td className="text-right tabular-nums text-slate-300">{noBank ? '-' : rp(fromP)}</td>
                        <td className="text-right">{noBank ? <Chip ok={false}>Belum ada mutasi</Chip> : <Chip ok={ok}>{ok ? 'Cocok' : 'Selisih'}</Chip>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* history */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
            <p className="text-sm font-bold text-white">Riwayat saldo akhir</p>
            <p className="text-[11px] text-slate-400 mb-2">Satu baris per bulan. Pantau pocket mana yang bertambah dari waktu ke waktu.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/10">
                  <th className="py-1.5">Bulan</th>{pockets.map((p) => <th key={p.id} className="text-right px-2 whitespace-nowrap">{p.name}</th>)}<th className="text-right px-2">Total</th>
                </tr></thead>
                <tbody>
                  {periods.map((per) => {
                    const m = new Map(snaps.filter((s) => s.period === per).map((s) => [s.pocket_id, s.ending]));
                    const t = Array.from(m.values()).reduce((a, b) => a + b, 0);
                    return (
                      <tr key={per} className="border-b border-white/5 last:border-0">
                        <td className="py-2 font-bold text-white whitespace-nowrap">{monthName(per)}</td>
                        {pockets.map((p) => <td key={p.id} className="text-right px-2 tabular-nums text-slate-200 whitespace-nowrap">{m.has(p.id) ? rp(m.get(p.id)!) : '-'}</td>)}
                        <td className="text-right px-2 tabular-nums font-bold text-cyan-200 whitespace-nowrap">{rp(t)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
