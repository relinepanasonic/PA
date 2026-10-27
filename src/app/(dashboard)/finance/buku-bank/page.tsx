'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, EyeOff, Loader2, Plus, RotateCcw, UploadCloud } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchAll } from '@/lib/supabase/fetchAll';
import { classifyTransfer, guessCategory, transferDescription, TRANSFER_MARK } from '@/lib/transfers';
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
const SYNTH = 'Dari Transaksi'; // marks lines created from existing transactions, not from a statement file
const BANK_EXCLUDE = ['Dompet Cash'];

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

// Blu / bluAccount CSV: Tanggal, Keterangan, Nominal (signed), Tipe, Sisa Saldo. Parsed exactly, no AI needed.
function splitCsvLine(line: string) {
  const out: string[] = [];
  let cur = '', q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function parseBluCsv(text: string): { lines: ParsedLine[]; account: string } | null {
  const rows = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const head = rows.findIndex((r) => r.startsWith('Tanggal / Date'));
  if (head < 0) return null;
  const isBlu = /blu/i.test(rows.slice(0, head).join(' '));
  const lines: ParsedLine[] = [];
  for (const r of rows.slice(head + 1)) {
    const p = splitCsvLine(r);
    const m = p[0]?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) continue;
    const signed = parseFloat(p[2]);
    if (!Number.isFinite(signed) || signed === 0) continue;
    const direction: 'in' | 'out' = signed < 0 || /pengeluaran/i.test(p[3] || '') ? 'out' : 'in';
    const bal = parseFloat(p[4]);
    lines.push({
      date: `${m[3]}-${m[2]}-${m[1]}`, description: (p[1] || '').slice(0, 200), amount: Math.abs(signed), direction,
      balance: Number.isFinite(bal) ? bal : null, category: guessCategory(p[1] || '', direction),
    });
  }
  return lines.length ? { lines, account: isBlu ? 'Blu by BCA' : '' } : null;
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
    const data = await fetchAll<BankLine>((a, b) => supabase.from('bank_statement_lines').select('*').order('tx_date', { ascending: false }).order('id').range(a, b));
    setLines(data.map((l) => (l.status === 'matched' && !l.tx_id ? { ...l, status: 'unmatched' as const } : l)));
    setLoading(false);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  // Connects Transaksi -> Buku Bank: every bank transaction you entered or imported earlier (for example the old CSV import)
  // gets a line here, linked to itself. When the real statement is uploaded later, those lines merge with it instead of doubling up.
  const syncFromTransaksi = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const [txs, linked] = await Promise.all([
      fetchAll<any>((a, b) => supabase.from('finance_transactions').select('id,type,amount,description,transaction_date').order('transaction_date').order('id').range(a, b)),
      fetchAll<any>((a, b) => supabase.from('bank_statement_lines').select('id,tx_id').not('tx_id', 'is', null).order('id').range(a, b)),
    ]);
    const have = new Set(linked.map((r) => r.tx_id as string));
    const rows = txs
      .filter((t) => !have.has(t.id) && !String(t.description).includes('___TRANSFER___'))
      .map((t) => {
        const m = String(t.description || '').match(/^\[([^\]→]+?)\]\s*(.*)$/);
        return m && !BANK_EXCLUDE.includes(m[1].trim()) ? { t, account: m[1].trim(), desc: m[2] } : null;
      })
      .filter((x): x is { t: any; account: string; desc: string } => !!x)
      .map(({ t, account, desc }) => ({
        user_id: user.id, account, tx_date: t.transaction_date, description: desc.slice(0, 200), amount: Number(t.amount),
        direction: t.type === 'income' ? 'in' : 'out', balance: null, category: null, source_file: SYNTH, fingerprint: `tx:${t.id}`,
        status: 'matched', tx_id: t.id,
      }));
    let n = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const { data } = await supabase.from('bank_statement_lines').upsert(rows.slice(i, i + 200), { onConflict: 'user_id,fingerprint', ignoreDuplicates: true }).select('id');
      n += data?.length ?? 0;
    }
    return n;
  }, [supabase]);

  useEffect(() => {
    syncFromTransaksi().then((n) => {
      if (n > 0) setMessage({ ok: true, text: `${n} transactions you already had in Transaksi were added to Buku Bank.` });
      load();
    });
  }, [syncFromTransaksi, load]);

  // ── upload ────────────────────────────────────────────────────────────
  const parseFile = async (file: File): Promise<{ lines: ParsedLine[]; account?: string }> => {
    const post = async (body: object) => {
      const res = await fetch('/api/buku-bank/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Could not read ${file.name}`);
      return json.lines as ParsedLine[];
    };
    const post2 = async (body: object) => ({ lines: await post(body) });
    const yearHint = String(new Date().getFullYear());
    const name = file.name.toLowerCase();

    if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
      if (file.size > 4_200_000) throw new Error(`${file.name} is over 4 MB. Split it into months and upload again.`);
      return post2({ kind: 'pdf', data: await fileToBase64(file), yearHint });
    }
    if (file.type.startsWith('image/')) return post2({ kind: 'image', data: await imageToJpeg(file), mediaType: 'image/jpeg', yearHint });

    const rawText = await file.text();
    const blu = parseBluCsv(rawText);
    if (blu) return { lines: blu.lines, account: blu.account || undefined };

    const rows = rawText.split(/\r?\n/).filter((l) => l.trim());
    const header = rows.slice(0, 4).join('\n');
    const out: ParsedLine[] = [];
    for (let i = 0; i < rows.length; i += 120) {
      setProgress(`${file.name}: reading lines ${i + 1}-${Math.min(i + 120, rows.length)} of ${rows.length}`);
      const chunk = rows.slice(i, i + 120).join('\n');
      out.push(...(await post({ kind: 'text', data: i === 0 ? chunk : `${header}\n...\n${chunk}`, yearHint })));
    }
    return { lines: out };
  };

  const autoMatch = async (fresh: BankLine[]) => {
    if (!fresh.length) return 0;
    const dates = fresh.map((l) => new Date(l.tx_date).getTime());
    const from = new Date(Math.min(...dates) - 4 * dayMs).toISOString().slice(0, 10);
    const to = new Date(Math.max(...dates) + 4 * dayMs).toISOString().slice(0, 10);
    const [txs, linked] = await Promise.all([
      fetchAll<any>((a, b) => supabase.from('finance_transactions').select('id,type,amount,description,transaction_date').gte('transaction_date', from).lte('transaction_date', to).order('id').range(a, b)),
      fetchAll<any>((a, b) => supabase.from('bank_statement_lines').select('id,tx_id,source_file').not('tx_id', 'is', null).order('id').range(a, b)),
    ]);
    // transactions already claimed by a REAL statement line are taken; ones only claimed by a synthetic line can be merged
    const used = new Set(linked.filter((r) => r.source_file !== SYNTH).map((r) => r.tx_id as string));
    const synthOf = new Map(linked.filter((r) => r.source_file === SYNTH).map((r) => [r.tx_id as string, r.id as string]));
    let matched = 0;
    for (const l of [...fresh].sort((a, b) => a.tx_date.localeCompare(b.tx_date))) {
      const want = l.direction === 'in' ? 'income' : 'expense';
      let best: { id: string; gap: number } | null = null;
      for (const t of txs) {
        if (used.has(t.id) || t.type !== want || Math.round(Number(t.amount)) !== Math.round(Number(l.amount))) continue;
        const prefix = String(t.description || '').match(/^\[([^\]→]+?)\]/)?.[1]?.trim();
        if (prefix && prefix !== l.account && !BANK_EXCLUDE.includes(prefix)) continue; // recorded under another account
        const gap = Math.abs(new Date(t.transaction_date).getTime() - new Date(l.tx_date).getTime()) / dayMs;
        if (gap <= 3 && (!best || gap < best.gap)) best = { id: t.id, gap };
      }
      if (best) {
        used.add(best.id);
        const synth = synthOf.get(best.id);
        if (synth) { await supabase.from('bank_statement_lines').delete().eq('id', synth); synthOf.delete(best.id); }
        await supabase.from('bank_statement_lines').update({ status: 'matched', tx_id: best.id }).eq('id', l.id);
        matched++;
      }
    }
    return matched;
  };

  const pickCategory = (cats: any[], l: { direction: string; category: string | null }) => {
    const type = l.direction === 'in' ? 'income' : 'expense';
    const ofType = cats.filter((c) => c.type === type);
    return ofType.find((c) => l.category && c.name.toLowerCase() === l.category.toLowerCase()) ?? ofType.find((c) => c.name.toLowerCase().includes('other'));
  };

  // Everything not yet in Transaksi goes in: transfers between your own accounts become ONE transfer, the rest normal entries.
  const autoImport = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { added: 0, transfers: 0 };
    let todo = await fetchAll<BankLine>((a, b) => supabase.from('bank_statement_lines').select('*').eq('status', 'unmatched').order('tx_date').order('id').range(a, b));
    if (!todo.length) return { added: 0, transfers: 0 };
    const { data: cats } = await supabase.from('finance_categories').select('id,name,type,tag');
    const catList = (cats ?? []) as any[];

    // Blu pocket moves and transfers to your own other bank are NOT income or spending: store them as transfers.
    const transferCat0 = catList.find((c) => ['transfer banks', 'transfer from other'].includes(c.name.toLowerCase()));
    const selfLines = todo.map((l) => ({ l, info: classifyTransfer(l.description) })).filter((x): x is { l: BankLine; info: NonNullable<ReturnType<typeof classifyTransfer>> } => !!x.info);
    let selfDone = 0;
    for (let k = 0; k < selfLines.length; k += 100) {
      const chunk = selfLines.slice(k, k + 100);
      const made = await supabase.from('finance_transactions').insert(chunk.map(({ l, info }) => ({
        user_id: user.id, type: l.direction === 'in' ? 'income' : 'expense', amount: l.amount, tag: 'personal', category_id: transferCat0?.id ?? null,
        description: transferDescription(l.account, info, l.direction, l.description), transaction_date: l.tx_date,
      }))).select('id');
      if (!made.data || made.data.length !== chunk.length) continue;
      for (let j = 0; j < chunk.length; j += 20) {
        await Promise.all(chunk.slice(j, j + 20).map(({ l }, n) => supabase.from('bank_statement_lines').update({ status: 'matched', tx_id: made.data![j + n].id }).eq('id', l.id)));
      }
      selfDone += made.data.length;
    }
    const selfIds = new Set(selfLines.map((x) => x.l.id));
    todo = todo.filter((l) => !selfIds.has(l.id));

    const HINT = /trsf|transfer|\btf\b|pindah|bi-?fast|top ?-?up|topup|ovo|gopay|dana|linkaja|shopeepay/i;
    const transferCat = catList.find((c) => ['transfer banks', 'transfer from other'].includes(c.name.toLowerCase()));
    const usedIn = new Set<string>();
    const done = new Set<string>();
    let transfers = 0;
    for (const o of todo.filter((l) => l.direction === 'out')) {
      const i = todo.find((x) => x.direction === 'in' && !usedIn.has(x.id) && x.account !== o.account && Math.round(x.amount) === Math.round(o.amount)
        && Math.abs(new Date(x.tx_date).getTime() - new Date(o.tx_date).getTime()) <= 2 * dayMs && (HINT.test(o.description) || HINT.test(x.description)));
      if (!i) continue;
      const { data: tx } = await supabase.from('finance_transactions').insert({
        user_id: user.id, type: 'expense', amount: o.amount, tag: 'personal', category_id: transferCat?.id ?? null,
        description: `[${o.account} → ${i.account}] Transfer antar rekening___TRANSFER___`, transaction_date: o.tx_date,
      }).select('id').single();
      if (!tx) continue;
      usedIn.add(i.id);
      await supabase.from('bank_statement_lines').update({ status: 'matched', tx_id: tx.id }).in('id', [o.id, i.id]);
      done.add(o.id); done.add(i.id); transfers++;
    }
    todo = todo.filter((l) => !done.has(l.id));

    let added = 0;
    for (let k = 0; k < todo.length; k += 100) {
      const chunk = todo.slice(k, k + 100);
      setProgress(`Adding to Transaksi (${Math.min(k + 100, todo.length)}/${todo.length})...`);
      const rows = chunk.map((l) => {
        const cat = pickCategory(catList, l);
        return {
          user_id: user.id, type: l.direction === 'in' ? 'income' : 'expense', amount: l.amount, tag: cat?.tag ?? 'personal',
          category_id: cat?.id ?? null, description: `[${l.account}] ${l.description}`.slice(0, 250), transaction_date: l.tx_date,
        };
      });
      const { data: made } = await supabase.from('finance_transactions').insert(rows).select('id');
      if (!made || made.length !== chunk.length) continue;
      for (let j = 0; j < chunk.length; j += 20) {
        await Promise.all(chunk.slice(j, j + 20).map((l, n) =>
          supabase.from('bank_statement_lines').update({ status: 'matched', tx_id: made[j + n].id }).eq('id', l.id)));
      }
      added += made.length;
    }
    return { added, transfers: transfers + selfDone };
  };

  // One-time tidy: old transactions (e.g. the Jan-Sep CSV import) that are really pocket moves or transfers to your own bank.
  const [tidying, setTidying] = useState(false);
  const tidyOldTransfers = async () => {
    setTidying(true);
    setMessage(null);
    try {
      const all = await fetchAll<any>((a, b) => supabase.from('finance_transactions').select('id,type,amount,description,transaction_date').order('id').range(a, b));
      const found = all.map((t) => {
        const d = String(t.description || '');
        if (d.includes(TRANSFER_MARK)) return null;
        const m = d.match(/^\[([^\]→]+?)\]\s*(.*)$/);
        if (!m) return null;
        const info = classifyTransfer(m[2]);
        return info ? { t, account: m[1].trim(), rest: m[2], info } : null;
      }).filter((x): x is { t: any; account: string; rest: string; info: NonNullable<ReturnType<typeof classifyTransfer>> } => !!x);
      if (!found.length) { setMessage({ ok: true, text: 'Nothing to tidy: no old transaction looks like a transfer between your own accounts.' }); setTidying(false); return; }
      const total = found.reduce((s, x) => s + Number(x.t.amount), 0);
      if (!confirm(`${found.length} older transactions (total ${rp(total)}) are moves between your own Blu pockets or your own banks. Mark them as transfers so they stop counting as income and spending?`)) { setTidying(false); return; }
      const { data: cats } = await supabase.from('finance_categories').select('id,name');
      const tcat = (cats ?? []).find((c: any) => ['transfer banks', 'transfer from other'].includes(c.name.toLowerCase()));
      for (let i = 0; i < found.length; i += 20) {
        await Promise.all(found.slice(i, i + 20).map(({ t, account: acc, rest, info }) =>
          supabase.from('finance_transactions').update({
            description: transferDescription(acc, info, t.type === 'income' ? 'in' : 'out', rest), category_id: tcat?.id ?? null,
          }).eq('id', t.id)));
      }
      setMessage({ ok: true, text: `${found.length} transactions are now marked as transfers (${rp(total)}). Your Dashboard no longer counts them as income or spending.` });
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message || 'Could not tidy.' });
    }
    setTidying(false);
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
        const res = await parseFile(file);
        const parsed = res.lines;
        const acc = res.account ?? account;
        const seen = new Map<string, number>();
        const rows = parsed.map((p) => {
          const base = `${acc}|${p.date}|${p.direction}|${Math.round(p.amount)}|${p.balance != null ? Math.round(p.balance) : norm(p.description).slice(0, 60)}`;
          const n = (seen.get(base) ?? 0) + 1;
          seen.set(base, n);
          return {
            user_id: user.id, account: acc, tx_date: p.date, description: p.description, amount: p.amount, direction: p.direction,
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
      setProgress('Putting new lines into Transaksi...');
      const imp = await autoImport();
      setMessage({
        ok: true,
        text: `${added} new lines saved. ${imp.added} added to Transaksi, ${matched} were already there, ${imp.transfers} transfers between your accounts joined into one, ${skipped} duplicates skipped.`,
      });
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
    <div className="pb-28 md:pb-8 animate-fade-in">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300"><BookOpen size={18} /></div>
        <h1 className="text-lg font-extrabold text-white tracking-tight">Buku Bank</h1>
      </div>
      <p className="text-xs text-slate-400 mb-4">Upload your bank statements once (PDF, CSV or a picture). Jax reads every line and puts it into Transaksi automatically, so nothing is entered twice.</p>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
      {/* Upload */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
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
        <button type="button" onClick={tidyOldTransfers} disabled={tidying} className="mt-2 w-full h-9 rounded-xl border border-white/10 bg-white/5 text-slate-300 text-[11px] font-bold uppercase tracking-widest disabled:opacity-60">{tidying ? 'Checking...' : 'Tidy old transfers (pockets, own banks)'}</button>
        {message && <p className={`mt-2 text-xs ${message.ok ? 'text-emerald-300' : 'text-red-400'}`}>{message.text}</p>}
      </div>

      {/* Filters + totals */}
      <div>
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
      </div>
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
