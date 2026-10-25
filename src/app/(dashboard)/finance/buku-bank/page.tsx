'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, CheckCircle2, EyeOff, Loader2, Plus, RotateCcw, UploadCloud } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { ParsedLine } from '@/app/api/buku-bank/parse/route';

interface BankLine {
  id: string;
  account: string;
  tx_date: string;
  description: string;
  amount: number;
  direction: 'in' | 'out';
  balance: number | null;
  category: string | null;
  source_file: string | null;
  status: 'unmatched' | 'matched' | 'ignored';
  tx_id: string | null;
}

const DEFAULT_ACCOUNTS = ['Blu by BCA', 'BCA Utama', 'Mandiri Bisnis', 'Jenius Digital', 'Kartu Kredit', 'Dompet Cash', 'E-Money / Gopay'];
const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const dayMs = 86400000;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

async function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function imageToJpeg(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.88).split(',')[1];
}

export default function BukuBankPage() {
  const supabase = useMemo(() => createClient(), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [accounts, setAccounts] = useState<string[]>(DEFAULT_ACCOUNTS);
  const [account, setAccount] = useState('Blu by BCA');
  const [lines, setLines] = useState<BankLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [tab, setTab] = useState<'unmatched' | 'matched' | 'ignored'>('unmatched');
  const [month, setMonth] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [working, setWorking] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('pa_custom_bank_accounts') || '[]') as { id: string }[];
      const extra = stored.map((a) => a.id).filter((id) => id && id !== 'all' && !DEFAULT_ACCOUNTS.includes(id));
      if (extra.length) setAccounts([...DEFAULT_ACCOUNTS, ...extra]);
    } catch {
      /* ignore broken storage */
    }
  }, []);

  const load = useCallback(async () => {
    const { data } = await supabase.from('bank_statement_lines').select('*').order('tx_date', { ascending: false }).limit(2000);
    setLines((data ?? []) as BankLine[]);
    setLoading(false);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  // ── upload ────────────────────────────────────────────────────────────
  const parseFile = async (file: File): Promise<ParsedLine[]> => {
    const post = async (body: object) => {
      const res = await fetch('/api/buku-bank/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Could not read ${file.name}`);
      return json.lines as ParsedLine[];
    };
    const yearHint = String(new Date().getFullYear());
    const name = file.name.toLowerCase();

    if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
      if (file.size > 4_200_000) throw new Error(`${file.name} is over 4 MB. Split it into months and upload again.`);
      return post({ kind: 'pdf', data: await fileToBase64(file), yearHint });
    }
    if (file.type.startsWith('image/')) return post({ kind: 'image', data: await imageToJpeg(file), mediaType: 'image/jpeg', yearHint });

    const rows = (await file.text()).split(/\r?\n/).filter((l) => l.trim());
    const header = rows.slice(0, 4).join('\n');
    const out: ParsedLine[] = [];
    for (let i = 0; i < rows.length; i += 120) {
      setProgress(`${file.name}: reading lines ${i + 1}-${Math.min(i + 120, rows.length)} of ${rows.length}`);
      const chunk = rows.slice(i, i + 120).join('\n');
      out.push(...(await post({ kind: 'text', data: i === 0 ? chunk : `${header}\n...\n${chunk}`, yearHint })));
    }
    return out;
  };

  const autoMatch = async (fresh: BankLine[]) => {
    if (!fresh.length) return 0;
    const dates = fresh.map((l) => new Date(l.tx_date).getTime());
    const from = new Date(Math.min(...dates) - 4 * dayMs).toISOString().slice(0, 10);
    const to = new Date(Math.max(...dates) + 4 * dayMs).toISOString().slice(0, 10);
    const [{ data: txs }, { data: linked }] = await Promise.all([
      supabase.from('finance_transactions').select('id,type,amount,transaction_date').gte('transaction_date', from).lte('transaction_date', to).limit(3000),
      supabase.from('bank_statement_lines').select('tx_id').not('tx_id', 'is', null),
    ]);
    const used = new Set((linked ?? []).map((r: any) => r.tx_id as string));
    let matched = 0;
    for (const l of [...fresh].sort((a, b) => a.tx_date.localeCompare(b.tx_date))) {
      const want = l.direction === 'in' ? 'income' : 'expense';
      let best: { id: string; gap: number } | null = null;
      for (const t of (txs ?? []) as any[]) {
        if (used.has(t.id) || t.type !== want || Math.round(Number(t.amount)) !== Math.round(Number(l.amount))) continue;
        const gap = Math.abs(new Date(t.transaction_date).getTime() - new Date(l.tx_date).getTime()) / dayMs;
        if (gap <= 3 && (!best || gap < best.gap)) best = { id: t.id, gap };
      }
      if (best) {
        used.add(best.id);
        await supabase.from('bank_statement_lines').update({ status: 'matched', tx_id: best.id }).eq('id', l.id);
        matched++;
      }
    }
    return matched;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setMessage(null);
    let added = 0, skipped = 0, matched = 0;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please log in again.');
      for (const file of Array.from(files)) {
        setProgress(`Reading ${file.name}...`);
        const parsed = await parseFile(file);
        const seen = new Map<string, number>();
        const rows = parsed.map((p) => {
          const base = `${account}|${p.date}|${p.direction}|${Math.round(p.amount)}|${p.balance != null ? Math.round(p.balance) : norm(p.description).slice(0, 60)}`;
          const n = (seen.get(base) ?? 0) + 1;
          seen.set(base, n);
          return {
            user_id: user.id, account, tx_date: p.date, description: p.description, amount: p.amount, direction: p.direction,
            balance: p.balance, category: p.category, source_file: file.name, fingerprint: `${base}#${n}`,
          };
        });
        for (let i = 0; i < rows.length; i += 200) {
          setProgress(`Saving ${file.name} (${Math.min(i + 200, rows.length)}/${rows.length})...`);
          const { data: inserted, error } = await supabase.from('bank_statement_lines')
            .upsert(rows.slice(i, i + 200), { onConflict: 'user_id,fingerprint', ignoreDuplicates: true }).select('*');
          if (error) throw new Error(error.message);
          added += inserted?.length ?? 0;
          skipped += Math.min(200, rows.length - i) - (inserted?.length ?? 0);
          matched += await autoMatch((inserted ?? []) as BankLine[]);
        }
      }
      setMessage({ ok: true, text: `${added} new lines saved, ${matched} already in Finance, ${skipped} duplicates skipped. ${added - matched} still missing from Finance.` });
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message || 'Upload failed.' });
    }
    setProgress(null);
    if (fileRef.current) fileRef.current.value = '';
    load();
  };

  // ── actions ───────────────────────────────────────────────────────────
  const addToFinance = async (l: BankLine, silent = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const type = l.direction === 'in' ? 'income' : 'expense';
    const { data: cats } = await supabase.from('finance_categories').select('id,name,tag').eq('type', type);
    const cat = (cats ?? []).find((c: any) => l.category && c.name.toLowerCase() === l.category.toLowerCase())
      ?? (cats ?? []).find((c: any) => c.name.toLowerCase().includes('other'));
    const { data: tx, error } = await supabase.from('finance_transactions').insert({
      user_id: user.id, type, amount: l.amount, tag: cat?.tag ?? 'personal', category_id: cat?.id ?? null,
      description: `[${l.account}] ${l.description}`.slice(0, 250), transaction_date: l.tx_date,
    }).select('id').single();
    if (error || !tx) return false;
    await supabase.from('bank_statement_lines').update({ status: 'matched', tx_id: tx.id }).eq('id', l.id);
    if (!silent) load();
    return true;
  };

  const setStatus = async (l: BankLine, status: 'unmatched' | 'ignored') => {
    await supabase.from('bank_statement_lines').update({ status, tx_id: null }).eq('id', l.id);
    load();
  };

  // ── view ──────────────────────────────────────────────────────────────
  const months = useMemo(() => Array.from(new Set(lines.map((l) => l.tx_date.slice(0, 7)))).sort().reverse(), [lines]);
  const usedAccounts = useMemo(() => Array.from(new Set(lines.map((l) => l.account))), [lines]);
  const scoped = lines.filter((l) => (month === 'all' || l.tx_date.startsWith(month)) && (filterAccount === 'all' || l.account === filterAccount));
  const count = (s: BankLine['status']) => scoped.filter((l) => l.status === s).length;
  const shown = scoped.filter((l) => l.status === tab);
  const totalIn = scoped.filter((l) => l.direction === 'in').reduce((s, l) => s + Number(l.amount), 0);
  const totalOut = scoped.filter((l) => l.direction === 'out').reduce((s, l) => s + Number(l.amount), 0);
  const missingOut = scoped.filter((l) => l.status === 'unmatched' && l.direction === 'out').reduce((s, l) => s + Number(l.amount), 0);

  const addAll = async () => {
    const todo = shown.filter((l) => l.status === 'unmatched');
    if (!todo.length || !confirm(`Add ${todo.length} missing lines to Finance?`)) return;
    setWorking(`Adding 0/${todo.length}...`);
    let ok = 0;
    for (const l of todo) {
      if (await addToFinance(l, true)) ok++;
      setWorking(`Adding ${ok}/${todo.length}...`);
    }
    setWorking(null);
    setMessage({ ok: true, text: `${ok} lines added to Finance.` });
    load();
  };

  return (
    <div className="p-4 pb-28 md:pb-8 max-w-3xl mx-auto animate-fade-in">
      <Link href="/finance" className="inline-flex items-center gap-1.5 text-xs text-cyan-300 mb-3 hover:underline">
        <ArrowLeft size={14} /> Finance
      </Link>
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300"><BookOpen size={18} /></div>
        <h1 className="text-lg font-extrabold text-white tracking-tight">Buku Bank</h1>
      </div>
      <p className="text-xs text-slate-400 mb-4">Upload your bank statements (PDF, CSV or a picture). Jax reads every line and shows what is missing from Finance.</p>

      {/* Upload */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 mb-4">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Statement is from account</label>
        <select
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          className="w-full mt-1 mb-3 h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-white outline-none"
        >
          {accounts.map((a) => <option key={a} value={a} className="bg-slate-900">{a}</option>)}
        </select>
        <input ref={fileRef} type="file" multiple accept=".pdf,.csv,.txt,image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={!!progress}
          className="w-full h-12 rounded-xl border border-emerald-400/40 bg-emerald-500/15 text-emerald-100 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {progress ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
          {progress ?? 'Upload statement files'}
        </button>
        <p className="text-[10px] text-slate-500 mt-2">PDF up to 4 MB each (split big ones by month), CSV, or screenshots. Pick several files at once. Uploading the same statement twice is safe.</p>
        {message && <p className={`mt-2 text-xs ${message.ok ? 'text-emerald-300' : 'text-red-400'}`}>{message.text}</p>}
      </div>

      {/* Filters + totals */}
      <div className="flex gap-2 mb-3">
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="flex-1 h-9 rounded-xl bg-white/5 border border-white/10 px-2 text-xs text-white outline-none">
          <option value="all" className="bg-slate-900">All months</option>
          {months.map((m) => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
        </select>
        <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} className="flex-1 h-9 rounded-xl bg-white/5 border border-white/10 px-2 text-xs text-white outline-none">
          <option value="all" className="bg-slate-900">All accounts</option>
          {usedAccounts.map((a) => <option key={a} value={a} className="bg-slate-900">{a}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5"><p className="text-[9px] uppercase text-slate-500">Money in</p><p className="text-xs font-bold text-emerald-300">{rp(totalIn)}</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5"><p className="text-[9px] uppercase text-slate-500">Money out</p><p className="text-xs font-bold text-red-300">{rp(totalOut)}</p></div>
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-2.5"><p className="text-[9px] uppercase text-amber-300/80">Missing spending</p><p className="text-xs font-bold text-amber-200">{rp(missingOut)}</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 mb-3">
        {(['unmatched', 'matched', 'ignored'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`text-sm font-bold pb-2 border-b-2 ${tab === t ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-500'}`}>
            {t === 'unmatched' ? 'Missing' : t === 'matched' ? 'In Finance' : 'Ignored'} ({count(t)})
          </button>
        ))}
      </div>

      {tab === 'unmatched' && shown.length > 0 && (
        <button onClick={addAll} disabled={!!working} className="w-full mb-3 h-10 rounded-xl border border-cyan-400/40 bg-cyan-500/15 text-cyan-100 text-xs font-bold uppercase tracking-widest disabled:opacity-60">
          {working ?? `Add all ${shown.length} to Finance`}
        </button>
      )}

      {loading ? (
        <p className="text-xs text-slate-500">Loading...</p>
      ) : shown.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8">
          {lines.length === 0 ? 'Nothing yet. Upload your first statement above.' : tab === 'unmatched' ? 'Nothing is missing. Every line is already in Finance.' : 'Nothing here.'}
        </p>
      ) : (
        <div className="space-y-1.5">
          {shown.map((l) => (
            <div key={l.id} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{l.description || '(no description)'}</p>
                <p className="text-[10px] text-slate-500 truncate">{l.tx_date} · {l.account}{l.category ? ` · ${l.category}` : ''}</p>
              </div>
              <p className={`text-sm font-bold tabular-nums whitespace-nowrap ${l.direction === 'in' ? 'text-emerald-300' : 'text-red-300'}`}>
                {l.direction === 'in' ? '+' : '-'}{rp(Number(l.amount))}
              </p>
              {l.status === 'unmatched' && (
                <>
                  <button onClick={() => addToFinance(l)} title="Add to Finance" className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 flex items-center justify-center"><Plus size={15} /></button>
                  <button onClick={() => setStatus(l, 'ignored')} title="Ignore" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center"><EyeOff size={14} /></button>
                </>
              )}
              {l.status === 'matched' && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
              {l.status === 'ignored' && (
                <button onClick={() => setStatus(l, 'unmatched')} title="Restore" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-slate-300 flex items-center justify-center"><RotateCcw size={14} /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
