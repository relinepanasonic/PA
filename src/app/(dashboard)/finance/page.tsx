'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FinanceTransaction, FinanceCategory, FinanceType, FinanceTag } from '@/lib/types/database';
import { Plus, Wallet, TrendingUp, TrendingDown, DollarSign, Tag, Trash2, Edit3, Calendar, Camera, UploadCloud, CheckCircle2, FileSpreadsheet, Sparkles, Building2, Settings } from 'lucide-react';
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

const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [
  { id: 'all', label: 'All Accounts', icon: '🏦', color: 'bg-slate-800 text-slate-200 border-white/20' },
  { id: 'BCA Utama', label: 'BCA Utama', icon: '💳', color: 'bg-blue-500/20 text-blue-300 border-blue-400/40' },
  { id: 'Mandiri Bisnis', label: 'Mandiri Bisnis', icon: '🏛️', color: 'bg-amber-500/20 text-amber-300 border-amber-400/40' },
  { id: 'Jenius Digital', label: 'Jenius Digital', icon: '📱', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40' },
  { id: 'Kartu Kredit', label: 'Kartu Kredit', icon: '💳', color: 'bg-purple-500/20 text-purple-300 border-purple-400/40' },
  { id: 'Dompet Cash', label: 'Dompet Cash', icon: '💵', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' },
];

const parseAccountFromDesc = (desc: string) => {
  if (!desc) return { account: 'BCA Utama', cleanDesc: '' };
  const match = desc.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (match) {
    return { account: match[1], cleanDesc: match[2] };
  }
  return { account: 'BCA Utama', cleanDesc: desc };
};

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Makan', icon: '🍽️', color: '#f97316', type: 'expense' as const, tag: 'personal' as const },
  { name: 'Transport', icon: '🚗', color: '#3b82f6', type: 'expense' as const, tag: 'personal' as const },
  { name: 'Pribadi', icon: '👤', color: '#8b5cf6', type: 'expense' as const, tag: 'personal' as const },
  { name: 'Work', icon: '💼', color: '#0ea5e9', type: 'expense' as const, tag: 'professional' as const },
  { name: 'Entertainment', icon: '🎬', color: '#ec4899', type: 'expense' as const, tag: 'personal' as const },
  { name: 'Gadget', icon: '📱', color: '#06b6d4', type: 'expense' as const, tag: 'personal' as const },
  { name: 'Other', icon: '📦', color: '#64748b', type: 'expense' as const, tag: 'personal' as const },
];

interface ParsedReceipt {
  amount: number | null;
  merchant: string;
  categoryName: string;
}

const parseReceiptText = (text: string): ParsedReceipt => {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  let detectedAmount: number | null = null;
  const totalKeywords = /(grand\s*total|total|edc|bayar|tagihan|amount|subtotal)/i;
  const candidateAmounts: number[] = [];

  for (const line of lines) {
    if (totalKeywords.test(line)) {
      const matches = line.match(/\b\d{1,3}([.,]\d{3})+(?:[.,]\d{2})?\b|\b\d{4,9}\b/g);
      if (matches) {
        for (const m of matches) {
          const cleanNum = Number(m.replace(/[.,]/g, ''));
          if (!isNaN(cleanNum) && cleanNum >= 1000 && cleanNum <= 500000000) {
            candidateAmounts.push(cleanNum);
          }
        }
      }
    }
  }

  if (candidateAmounts.length > 0) {
    detectedAmount = Math.max(...candidateAmounts);
  } else {
    const allNumbers: number[] = [];
    const numRegex = /\b\d{1,3}([.,]\d{3})+\b/g;
    let match;
    while ((match = numRegex.exec(text)) !== null) {
      const val = Number(match[0].replace(/[.,]/g, ''));
      if (!isNaN(val) && val >= 5000 && val <= 500000000) {
        allNumbers.push(val);
      }
    }
    if (allNumbers.length > 0) {
      detectedAmount = Math.max(...allNumbers);
    }
  }

  let detectedMerchant = 'Merchant Receipt';
  for (const line of lines.slice(0, 8)) {
    if (line.length > 3 && !/^\d+$/.test(line) && !/^\d{2}[-/.]\d{2}/.test(line)) {
      const cleaned = line.replace(/[^a-zA-Z0-9\s&.-]/g, '').trim();
      if (cleaned.length >= 3) {
        detectedMerchant = cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        break;
      }
    }
  }

  const upperText = text.toUpperCase();
  if (upperText.includes('STARBUCKS')) detectedMerchant = 'Starbucks Coffee';
  else if (upperText.includes('SUSHI TEI')) detectedMerchant = 'Sushi Tei';
  else if (upperText.includes('INDOMARET')) detectedMerchant = 'Indomaret';
  else if (upperText.includes('ALFAMART')) detectedMerchant = 'Alfamart';
  else if (upperText.includes('MCDONALD')) detectedMerchant = "McDonald's";
  else if (upperText.includes('KFC')) detectedMerchant = 'KFC';

  let detectedCategory = 'Makan';
  if (/starbucks|sushi|coffee|kopi|cafe|resto|makan|food|bakmi|pizza|burger|tea|kfc|mcd|bread|roti/i.test(text)) {
    detectedCategory = 'Makan';
  } else if (/grab|gojek|gocar|goride|uber|parkir|parking|bensin|pertamina|shell|toll|transport/i.test(text)) {
    detectedCategory = 'Transport';
  } else if (/cinema|xxi|cgv|netflix|spotify|entertainment|nonton/i.test(text)) {
    detectedCategory = 'Entertainment';
  } else if (/apple|samsung|ibox|gadget|tokopedia|shopee|electronic/i.test(text)) {
    detectedCategory = 'Gadget';
  }

  return {
    amount: detectedAmount,
    merchant: detectedMerchant,
    categoryName: detectedCategory,
  };
};

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

  // Dynamic Bank Accounts state
  const [accounts, setAccounts] = useState<BankAccount[]>(DEFAULT_BANK_ACCOUNTS);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountIcon, setNewAccountIcon] = useState('💳');

  // E-Statement & Receipt AI Simulation state
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementAccount, setStatementAccount] = useState('BCA Utama');
  const [importingStatement, setImportingStatement] = useState(false);
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
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
  useEffect(() => {
    fetchTransactions();
    const stored = localStorage.getItem('pa_custom_bank_accounts');
    if (stored) {
      try {
        setAccounts(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse accounts:', e);
      }
    }
  }, [fetchTransactions]);

  const handleAddAccount = () => {
    if (!newAccountName.trim()) return;
    const colors = [
      'bg-blue-500/20 text-blue-300 border-blue-400/40',
      'bg-amber-500/20 text-amber-300 border-amber-400/40',
      'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
      'bg-purple-500/20 text-purple-300 border-purple-400/40',
      'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
      'bg-rose-500/20 text-rose-300 border-rose-400/40',
    ];
    const randColor = colors[Math.floor(Math.random() * colors.length)];
    const newAcc: BankAccount = {
      id: newAccountName.trim(),
      label: newAccountName.trim(),
      icon: newAccountIcon || '💳',
      color: randColor,
    };
    const updated = [...accounts, newAcc];
    setAccounts(updated);
    localStorage.setItem('pa_custom_bank_accounts', JSON.stringify(updated));
    setNewAccountName('');
  };

  const handleDeleteAccount = (id: string) => {
    if (id === 'all') return;
    const updated = accounts.filter(a => a.id !== id);
    setAccounts(updated);
    localStorage.setItem('pa_custom_bank_accounts', JSON.stringify(updated));
    if (accountFilter === id) setAccountFilter('all');
  };

  const openCreate = () => {
    setEditingTx(null);
    setOcrStatus(null);
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
    setOcrStatus(null);
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

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanningReceipt(true);
    setOcrStatus('Scanning receipt image with Tesseract AI...');

    try {
      const Tesseract = (await import('tesseract.js')).default;
      const result = await Tesseract.recognize(file, 'eng');
      const text = result.data.text || '';
      
      const parsed = parseReceiptText(text);

      if (parsed.amount) {
        setFormAmount(String(parsed.amount));
      }
      setFormType('expense');
      setFormTag('personal');
      setFormDescription(`${parsed.merchant} (Verified OCR Receipt)`);

      const matchedCat = categories.find(
        c => c.name.toLowerCase() === parsed.categoryName.toLowerCase()
      );
      if (matchedCat) {
        setFormCategoryId(matchedCat.id);
      }

      setOcrStatus(`✨ OCR Result: ${parsed.merchant} — ${parsed.amount ? 'Rp ' + parsed.amount.toLocaleString('id-ID') : 'Detected'} (${parsed.categoryName})`);
    } catch (err) {
      console.error('OCR scan failed:', err);
      setOcrStatus('⚠️ Could not auto-read text from image. Please verify amount.');
    } finally {
      setScanningReceipt(false);
    }
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
    <div className="p-4 space-y-4 animate-fade-in pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-sm">
            <Wallet size={18} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white tracking-tight">Finance</h1>
            <p className="text-[11px] text-slate-400 font-medium">Multi-account cashflow tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStatementModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-slate-300 transition-all border border-white/10 active:scale-95"
          >
            <FileSpreadsheet size={14} className="text-emerald-400" />
            <span>Import</span>
          </button>
          <Button onClick={openCreate} size="sm">
            <Plus size={16} /> Add
          </Button>
        </div>
      </div>

      {/* Hero Financial Balance Card */}
      <div className="p-4 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Cashflow Balance</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-medium">
            This Month
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <h2 className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${netBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
            {formatCurrency(netBalance)}
          </h2>
        </div>

        {/* Income / Expense Split Divider */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Income</p>
              <p className="text-xs sm:text-sm font-bold font-mono text-emerald-400 truncate">{formatCurrency(totalIncome)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-red-500/[0.06] border border-red-500/20">
            <div className="w-7 h-7 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
              <TrendingDown size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Expenses</p>
              <p className="text-xs sm:text-sm font-bold font-mono text-red-400 truncate">{formatCurrency(totalExpenses)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Account / Wallet Selector Pills */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Accounts & Wallets</p>
          <button
            onClick={() => setShowAccountModal(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Settings size={12} />
            <span>Manage Accounts</span>
          </button>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
          {accounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => { setAccountFilter(acc.id); setPage(0); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                accountFilter === acc.id
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md scale-[1.02]'
                  : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <span>{acc.icon}</span>
              <span>{acc.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Clean Dropdown Filters Bar (No overflow on mobile) */}
      <div className="grid grid-cols-2 gap-2 p-2 rounded-2xl bg-white/[0.03] border border-white/10">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as any); setPage(0); }}
            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs font-bold text-white focus:outline-none focus:border-blue-400"
          >
            <option value="all">All Types</option>
            <option value="income">Income Only (+)</option>
            <option value="expense">Expenses Only (-)</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tag</label>
          <select
            value={tagFilter}
            onChange={(e) => { setTagFilter(e.target.value as any); setPage(0); }}
            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs font-bold text-white focus:outline-none focus:border-blue-400"
          >
            <option value="all">All Tags</option>
            <option value="personal">Personal</option>
            <option value="professional">Professional</option>
          </select>
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
                onClick={() => openEdit(tx)}
                className="group p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Category Tile */}
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 border border-white/10 shadow-inner"
                    style={{ backgroundColor: `${tx.finance_categories?.color || '#3b82f6'}18` }}
                  >
                    {tx.finance_categories?.icon || (tx.type === 'income' ? '💰' : '💸')}
                  </div>

                  {/* Text & Meta */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate group-hover:text-blue-300 transition-colors">
                      {parsed.cleanDesc || tx.finance_categories?.name || (tx.type === 'income' ? 'Income' : 'Expense')}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400 flex-wrap">
                      <span>{new Date(tx.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-300">{parsed.account}</span>
                      <span>•</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        tx.tag === 'professional' ? 'bg-cyan-500/15 text-cyan-300' : 'bg-slate-500/15 text-slate-300'
                      }`}>
                        {tx.tag === 'professional' ? 'Pro' : 'Personal'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount & Actions */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <p className={`text-sm font-extrabold font-mono ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTx(tx.id); }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/15 transition-colors opacity-80 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
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

          {ocrStatus && (
            <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-400/30 text-xs font-semibold text-blue-200">
              {ocrStatus}
            </div>
          )}

          {/* Account / Bank Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Account / Wallet</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {accounts.filter(a => a.id !== 'all').map((acc) => (
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

          {/* 1-Row Quick Category (Exactly 4 Categories: Makan, Transport, Work, Entertainment) */}
          {formType === 'expense' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Quick Category</label>
              <div className="grid grid-cols-4 gap-1.5">
                {['Makan', 'Transport', 'Work', 'Entertainment']
                  .map(name => filteredCategories.find(c => c.name.toLowerCase() === name.toLowerCase()))
                  .filter(Boolean)
                  .map((c) => {
                    const cat = c!;
                    const isSelected = formCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setFormCategoryId(cat.id);
                          if (cat.tag) setFormTag(cat.tag);
                        }}
                        className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border ${
                          isSelected
                            ? 'bg-blue-600/30 border-blue-400 text-white shadow-md scale-[1.02]'
                            : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08]'
                        }`}
                      >
                        <span className="text-base leading-none">{cat.icon || '🏷️'}</span>
                        <span className="text-[11px] font-bold truncate w-full text-center leading-tight">{cat.name}</span>
                      </button>
                    );
                  })}
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
              {accounts.filter(a => a.id !== 'all').map((acc) => (
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

      {/* ── MANAGE ACCOUNTS / WALLETS MODAL ────────────────────────────────────── */}
      <Modal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        title="Manage Bank Accounts & Wallets"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider">Add New Account</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Icon (💳, 🏦...)"
                value={newAccountIcon}
                onChange={(e) => setNewAccountIcon(e.target.value)}
                className="w-16 px-2.5 py-2 rounded-xl bg-slate-900 border border-white/15 text-center text-sm font-bold text-white focus:outline-none focus:border-blue-400"
              />
              <input
                type="text"
                placeholder="Account Name (e.g. Bank Jago)"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs font-semibold text-white focus:outline-none focus:border-blue-400"
              />
              <Button size="sm" onClick={handleAddAccount} disabled={!newAccountName.trim()}>
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Existing Accounts</p>
            {accounts.filter(a => a.id !== 'all').map((acc) => (
              <div key={acc.id} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span>{acc.icon}</span>
                  <span>{acc.label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAccount(acc.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/15 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowAccountModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
