'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FinanceTransaction, FinanceCategory, FinanceType, FinanceTag } from '@/lib/types/database';
import { Plus, Wallet, TrendingUp, TrendingDown, DollarSign, Tag, Trash2, Edit3, Calendar, Camera, UploadCloud, CheckCircle2, FileSpreadsheet, Sparkles, Building2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/LoadingSkeleton';

const PAGE_SIZE = 25;

interface BankAccount {
  id: string;
  label: string;
  icon: string;
  color: string;
}

const BANK_ACCOUNTS: BankAccount[] = [
  { id: 'all', label: 'All Accounts', icon: '🏦', color: 'bg-slate-800 text-slate-200 border-white/20' },
  { id: 'BCA Utama', label: 'BCA Utama', icon: '💳', color: 'bg-blue-500/20 text-blue-300 border-blue-400/40' },
  { id: 'Mandiri Bisnis', label: 'Mandiri Bisnis', icon: '🏛️', color: 'bg-amber-500/20 text-amber-300 border-amber-400/40' },
  { id: 'Jenius Digital', label: 'Jenius Digital', icon: '📱', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40' },
  { id: 'Kartu Kredit', label: 'Kartu Kredit', icon: '💳', color: 'bg-purple-500/20 text-purple-300 border-purple-400/40' },
  { id: 'Dompet Cash', label: 'Dompet Cash', icon: '💵', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' },
];

const parseAccountFromDesc = (desc: string) => {
  if (!desc) return { account: 'BCA Utama', cleanDesc: '' };
  const match = desc.match(/^\[(BCA Utama|Mandiri Bisnis|Jenius Digital|Kartu Kredit|Dompet Cash)\]\s*(.*)$/);
  if (match) {
    return { account: match[1], cleanDesc: match[2] };
  }
  return { account: 'BCA Utama', cleanDesc: desc };
};

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Makan', icon: '🍽️', color: '#f97316', type: 'expense' as const, tag: 'personal' as const },
  { name: 'Transport', icon: '🚗', color: '#3b82f6', type: 'expense' as const, tag: 'personal' as const },
  { name: 'Pribadi', icon: '👤', color: '#8b5cf6', type: 'expense' as const, tag: 'personal' as const },
  { name: 'Entertainment', icon: '🎬', color: '#ec4899', type: 'expense' as const, tag: 'personal' as const },
  { name: 'Gadget', icon: '📱', color: '#06b6d4', type: 'expense' as const, tag: 'personal' as const },
  { name: 'Other', icon: '📦', color: '#64748b', type: 'expense' as const, tag: 'personal' as const },
];

export default function FinancePage() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | FinanceType>('all');
  const [tagFilter, setTagFilter] = useState<'all' | FinanceTag>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);
  const [saving, setSaving] = useState(false);

  // E-Statement & Receipt AI Simulation state
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementAccount, setStatementAccount] = useState('BCA Utama');
  const [importingStatement, setImportingStatement] = useState(false);
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Summary state
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  // Form state
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<FinanceType>('expense');
  const [formTag, setFormTag] = useState<FinanceTag>('personal');
  const [formAccount, setFormAccount] = useState<string>('BCA Utama');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  const supabase = createClient();

  const fetchCategories = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('finance_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    const existingNames = new Set((data || []).map(c => c.name.toLowerCase()));
    const missing = DEFAULT_EXPENSE_CATEGORIES.filter(def => !existingNames.has(def.name.toLowerCase()));

    if (missing.length > 0) {
      const inserts = missing.map(def => ({
        user_id: user.id,
        name: def.name,
        type: def.type,
        tag: def.tag,
        color: def.color,
        icon: def.icon,
      }));
      await supabase.from('finance_categories').insert(inserts);

      const { data: refreshed } = await supabase
        .from('finance_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      setCategories(refreshed || []);
    } else {
      setCategories(data || []);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const { data: income } = await supabase
      .from('finance_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'income')
      .gte('transaction_date', monthStart)
      .lte('transaction_date', today);
    
    const { data: expenses } = await supabase
      .from('finance_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('transaction_date', monthStart)
      .lte('transaction_date', today);

    setTotalIncome((income || []).reduce((s, t) => s + Number(t.amount), 0));
    setTotalExpenses((expenses || []).reduce((s, t) => s + Number(t.amount), 0));
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from('finance_transactions')
      .select('*, finance_categories(*)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false });

    if (typeFilter !== 'all') query = query.eq('type', typeFilter);
    if (tagFilter !== 'all') query = query.eq('tag', tagFilter);

    const { data, count } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    setTransactions(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [typeFilter, tagFilter, page]);

  useEffect(() => { fetchCategories(); fetchSummary(); }, [fetchCategories, fetchSummary]);
  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const openCreate = () => {
    setEditingTx(null);
    setFormAmount('');
    setFormType('expense');
    setFormTag('personal');
    setFormAccount(accountFilter !== 'all' ? accountFilter : 'BCA Utama');
    setFormCategoryId('');
    setFormDescription('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  const openEdit = (tx: FinanceTransaction) => {
    setEditingTx(tx);
    const parsed = parseAccountFromDesc(tx.description || '');
    setFormAccount(parsed.account);
    setFormAmount(String(tx.amount));
    setFormType(tx.type);
    setFormTag(tx.tag);
    setFormCategoryId(tx.category_id || '');
    setFormDescription(parsed.cleanDesc);
    setFormDate(tx.transaction_date);
    setShowModal(true);
  };

  const handleScanReceipt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanningReceipt(true);
    setTimeout(() => {
      setFormAmount('125000');
      setFormType('expense');
      setFormTag('personal');
      setFormDescription('Lunch at Sushi Tei (Verified Receipt Photo)');
      setScanningReceipt(false);
    }, 1000);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const cleanDesc = formDescription.replace(/^\[.*?\]\s*/, '').trim();
    const finalDesc = `[${formAccount}] ${cleanDesc || 'Transaction'}`;

    const payload = {
      amount: parseFloat(formAmount),
      type: formType,
      tag: formTag,
      category_id: formCategoryId || null,
      description: finalDesc,
      transaction_date: formDate,
    };

    if (editingTx) {
      await supabase.from('finance_transactions').update(payload).eq('id', editingTx.id);
    } else {
      await supabase.from('finance_transactions').insert({ ...payload, user_id: user.id });
    }

    setSaving(false);
    setShowModal(false);
    fetchTransactions();
    fetchSummary();
  };

  const deleteTx = async (id: string) => {
    await supabase.from('finance_transactions').delete().eq('id', id);
    fetchTransactions();
    fetchSummary();
  };

  const sampleStatementRows = [
    { desc: 'Client Retainer Payment - Agensi', amount: 8500000, type: 'income' as FinanceType, tag: 'professional' as FinanceTag },
    { desc: 'Spotify Premium Family Subscription', amount: 89000, type: 'expense' as FinanceType, tag: 'personal' as FinanceTag },
    { desc: 'AWS Cloud Server Hosting Monthly', amount: 450000, type: 'expense' as FinanceType, tag: 'professional' as FinanceTag },
    { desc: 'Groceries & Household Supplies', amount: 620000, type: 'expense' as FinanceType, tag: 'personal' as FinanceTag },
  ];

  const handleImportStatement = async () => {
    setImportingStatement(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    const inserts = sampleStatementRows.map(row => ({
      user_id: user.id,
      amount: row.amount,
      type: row.type,
      tag: row.tag,
      description: `[${statementAccount}] ${row.desc}`,
      transaction_date: today,
    }));

    await supabase.from('finance_transactions').insert(inserts);
    setImportingStatement(false);
    setShowStatementModal(false);
    fetchTransactions();
    fetchSummary();
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const netBalance = totalIncome - totalExpenses;
  const filteredCategories = categories.filter(c => c.type === formType);

  const filteredTransactions = transactions.filter(tx => {
    if (accountFilter === 'all') return true;
    const parsed = parseAccountFromDesc(tx.description || '');
    return parsed.account === accountFilter;
  });

  return (
    <div className="p-4 space-y-4 animate-fade-in pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="text-blue-400" size={22} />
          <h1 className="text-xl font-bold text-white">Finance & Ledger</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStatementModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-300 transition-colors border border-white/10"
          >
            <FileSpreadsheet size={14} className="text-emerald-400" /> E-Statement
          </button>
          <Button onClick={openCreate} size="sm">
            <Plus size={16} /> Add
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glow-card p-3 text-center rounded-2xl border border-white/10 bg-white/[0.03]">
          <TrendingUp size={16} className="text-emerald-400 mx-auto mb-1" />
          <p className="text-[10px] text-slate-400 font-semibold">Income</p>
          <p className="text-sm font-bold text-emerald-400 mt-0.5">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="glow-card p-3 text-center rounded-2xl border border-white/10 bg-white/[0.03]">
          <TrendingDown size={16} className="text-red-400 mx-auto mb-1" />
          <p className="text-[10px] text-slate-400 font-semibold">Expenses</p>
          <p className="text-sm font-bold text-red-400 mt-0.5">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="glow-card p-3 text-center rounded-2xl border border-white/10 bg-white/[0.03]">
          <DollarSign size={16} className={`${netBalance >= 0 ? 'text-blue-400' : 'text-red-400'} mx-auto mb-1`} />
          <p className="text-[10px] text-slate-400 font-semibold">Net Balance</p>
          <p className={`text-sm font-bold mt-0.5 ${netBalance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{formatCurrency(netBalance)}</p>
        </div>
      </div>

      {/* Account / Wallet Switcher Carousel */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {BANK_ACCOUNTS.map((acc) => (
          <button
            key={acc.id}
            onClick={() => { setAccountFilter(acc.id); setPage(0); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              accountFilter === acc.id
                ? `${acc.color} shadow-lg scale-105`
                : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            <span>{acc.icon}</span>
            <span>{acc.label}</span>
          </button>
        ))}
      </div>

      {/* Filters: Type & Tag */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5">
          {(['all', 'income', 'expense'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setTypeFilter(f); setPage(0); }}
              className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                typeFilter === f
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/[0.05] text-slate-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f === 'income' ? 'Income' : 'Expenses'}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          {(['all', 'professional', 'personal'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTagFilter(t); setPage(0); }}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                tagFilter === t
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'bg-white/[0.03] text-slate-400 border border-transparent'
              }`}
            >
              {t === 'all' ? 'All Tags' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      {loading ? (
        <SkeletonList count={5} />
      ) : filteredTransactions.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No transactions found"
          description="Try selecting a different account or add a transaction."
          actionLabel="Add Transaction"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((tx) => {
            const parsed = parseAccountFromDesc(tx.description || '');
            return (
              <div
                key={tx.id}
                className="glass-card p-3.5 rounded-2xl flex items-center gap-3 border border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer"
                onClick={() => openEdit(tx)}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: tx.finance_categories?.color || (tx.type === 'income' ? '#10b981' : '#ef4444') }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {parsed.cleanDesc || tx.finance_categories?.name || (tx.type === 'income' ? 'Income' : 'Expense')}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] text-slate-400">
                      {new Date(tx.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 font-semibold">
                      💳 {parsed.account}
                    </span>
                    <Badge variant={tx.tag === 'professional' ? 'accent' : 'muted'} size="sm">
                      {tx.tag}
                    </Badge>
                  </div>
                </div>
                <p className={`text-sm font-extrabold flex-shrink-0 font-mono ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTx(tx.id); }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/15 transition-colors flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* ── ADD / EDIT TRANSACTION MODAL ────────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingTx ? 'Edit Transaction' : 'New Transaction'}
      >
        <div className="space-y-4">
          {/* Smart Receipt Photo Scanner Bar */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-blue-400/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-blue-400" />
              <div>
                <p className="text-xs font-bold text-white">Snap & Auto-Fill Receipt</p>
                <p className="text-[10px] text-slate-300">Scan photo with OCR Vision AI</p>
              </div>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleScanReceipt}
                className="hidden"
              />
              <button
                type="button"
                disabled={scanningReceipt}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
              >
                {scanningReceipt ? (
                  <>
                    <Sparkles size={13} className="animate-spin" /> Scanning...
                  </>
                ) : (
                  <>
                    <Camera size={13} /> Upload Receipt
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Account / Bank Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Account / Wallet</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {BANK_ACCOUNTS.filter(a => a.id !== 'all').map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setFormAccount(acc.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                    formAccount === acc.id
                      ? 'bg-blue-600/30 text-blue-300 border-blue-400'
                      : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  {acc.icon} {acc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Type</label>
            <div className="flex rounded-xl overflow-hidden border border-white/15">
              <button
                type="button"
                onClick={() => setFormType('income')}
                className={`flex-1 py-2.5 text-sm font-bold transition-all ${
                  formType === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-900 text-slate-400'
                }`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => setFormType('expense')}
                className={`flex-1 py-2.5 text-sm font-bold transition-all ${
                  formType === 'expense' ? 'bg-red-500/20 text-red-400' : 'bg-slate-900 text-slate-400'
                }`}
              >
                Expense
              </button>
            </div>
          </div>

          <Input
            id="tx-amount"
            type="number"
            label="Amount (IDR / USD)"
            placeholder="0.00"
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            icon={<DollarSign size={16} />}
          />

          {/* Tag Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Tag</label>
            <div className="flex rounded-xl overflow-hidden border border-white/15">
              <button
                type="button"
                onClick={() => setFormTag('personal')}
                className={`flex-1 py-2.5 text-sm font-bold transition-all ${
                  formTag === 'personal' ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-900 text-slate-400'
                }`}
              >
                Personal
              </button>
              <button
                type="button"
                onClick={() => setFormTag('professional')}
                className={`flex-1 py-2.5 text-sm font-bold transition-all ${
                  formTag === 'professional' ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-900 text-slate-400'
                }`}
              >
                Professional
              </button>
            </div>
          </div>

          {/* Quick Expense Category Pills */}
          {formType === 'expense' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Quick Category</label>
              <div className="flex gap-1.5 flex-wrap">
                {filteredCategories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFormCategoryId(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                      formCategoryId === c.id
                        ? 'bg-orange-500/30 text-orange-300 border-orange-400 shadow scale-105'
                        : 'bg-slate-900 text-slate-300 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <span>{c.icon || '🏷️'}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Select
            id="tx-category"
            label="Category"
            options={[
              { value: '', label: 'Select category...' },
              ...filteredCategories.map(c => ({ value: c.id, label: `${c.icon ? c.icon + ' ' : ''}${c.name}` })),
            ]}
            value={formCategoryId}
            onChange={(e) => setFormCategoryId(e.target.value)}
          />

          <Input
            id="tx-desc"
            label="Description"
            placeholder="What was this for?"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            icon={<Edit3 size={16} />}
          />

          <Input
            id="tx-date"
            type="date"
            label="Date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            icon={<Calendar size={16} />}
          />

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button fullWidth isLoading={saving} onClick={handleSave} disabled={!formAmount || parseFloat(formAmount) <= 0}>
              {editingTx ? 'Update Transaction' : 'Save Transaction'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── E-STATEMENT SMART IMPORT MODAL ──────────────────────────────────── */}
      <Modal
        isOpen={showStatementModal}
        onClose={() => setShowStatementModal(false)}
        title="Import Monthly E-Statement"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
            <p className="text-xs font-semibold text-slate-300">Select Target Account</p>
            <div className="flex gap-1.5 overflow-x-auto pt-2 pb-1 no-scrollbar">
              {BANK_ACCOUNTS.filter(a => a.id !== 'all').map((acc) => (
                <button
                  key={`st-${acc.id}`}
                  type="button"
                  onClick={() => setStatementAccount(acc.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                    statementAccount === acc.id
                      ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400'
                      : 'bg-slate-900 text-slate-400 border-white/10'
                  }`}
                >
                  {acc.icon} {acc.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] text-center space-y-2">
            <UploadCloud size={28} className="text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-white">Upload Bank PDF or CSV Statement</p>
            <p className="text-xs text-slate-400">Previewing auto-classified batch items below</p>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {sampleStatementRows.map((row, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <p className="font-bold text-white truncate">{row.desc}</p>
                  <p className="text-[10px] text-slate-400">Tag: {row.tag}</p>
                </div>
                <span className={`font-mono font-bold ${row.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {row.type === 'income' ? '+' : '-'}{formatCurrency(row.amount)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowStatementModal(false)}>
              Cancel
            </Button>
            <Button
              isLoading={importingStatement}
              onClick={handleImportStatement}
            >
              Import 4 Transactions to {statementAccount}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
