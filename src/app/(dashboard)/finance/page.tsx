'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FinanceTransaction, FinanceCategory, FinanceType, FinanceTag } from '@/lib/types/database';
import { Plus, Wallet, TrendingUp, TrendingDown, DollarSign, Tag, Trash2, Edit3, Calendar } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/LoadingSkeleton';

const PAGE_SIZE = 25;

export default function FinancePage() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | FinanceType>('all');
  const [tagFilter, setTagFilter] = useState<'all' | FinanceTag>('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);
  const [saving, setSaving] = useState(false);

  // Summary state
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  // Form state
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<FinanceType>('expense');
  const [formTag, setFormTag] = useState<FinanceTag>('personal');
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
    setCategories(data || []);
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
    setFormCategoryId('');
    setFormDescription('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  const openEdit = (tx: FinanceTransaction) => {
    setEditingTx(tx);
    setFormAmount(String(tx.amount));
    setFormType(tx.type);
    setFormTag(tx.tag);
    setFormCategoryId(tx.category_id || '');
    setFormDescription(tx.description || '');
    setFormDate(tx.transaction_date);
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      amount: parseFloat(formAmount),
      type: formType,
      tag: formTag,
      category_id: formCategoryId || null,
      description: formDescription,
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const netBalance = totalIncome - totalExpenses;
  const filteredCategories = categories.filter(c => c.type === formType);

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Finance</h1>
        <Button onClick={openCreate} size="sm">
          <Plus size={16} /> Add
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glow-card p-3 text-center">
          <TrendingUp size={16} className="text-success mx-auto mb-1" />
          <p className="text-[10px] text-text-muted">Income</p>
          <p className="text-sm font-bold text-success">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="glow-card p-3 text-center">
          <TrendingDown size={16} className="text-danger mx-auto mb-1" />
          <p className="text-[10px] text-text-muted">Expenses</p>
          <p className="text-sm font-bold text-danger">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="glow-card p-3 text-center">
          <DollarSign size={16} className={`${netBalance >= 0 ? 'text-accent-light' : 'text-danger'} mx-auto mb-1`} />
          <p className="text-[10px] text-text-muted">Balance</p>
          <p className={`text-sm font-bold ${netBalance >= 0 ? 'text-accent-light' : 'text-danger'}`}>{formatCurrency(netBalance)}</p>
        </div>
      </div>

      {/* Type Filter */}
      <div className="flex gap-2">
        {(['all', 'income', 'expense'] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setTypeFilter(f); setPage(0); }}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              typeFilter === f
                ? 'bg-accent/20 text-accent-light border border-accent/30'
                : 'bg-surface-light text-text-muted border border-transparent hover:text-text-secondary'
            }`}
          >
            {f === 'all' ? 'All' : f === 'income' ? 'Income' : 'Expenses'}
          </button>
        ))}
      </div>

      {/* Tag Filter */}
      <div className="flex gap-2">
        {(['all', 'professional', 'personal'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTagFilter(t); setPage(0); }}
            className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all ${
              tagFilter === t
                ? 'bg-surface-lighter text-text-primary border border-border-glow'
                : 'bg-surface-light/50 text-text-muted border border-transparent'
            }`}
          >
            {t === 'all' ? 'All Tags' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {loading ? (
        <SkeletonList count={5} />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No transactions"
          description="Start tracking your income and expenses."
          actionLabel="Add Transaction"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div key={tx.id} className="glass-card p-3 flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: tx.finance_categories?.color || (tx.type === 'income' ? '#10b981' : '#ef4444') }}
              />
              <div className="flex-1 min-w-0" onClick={() => openEdit(tx)}>
                <p className="text-sm font-medium text-text-primary truncate">
                  {tx.description || tx.finance_categories?.name || (tx.type === 'income' ? 'Income' : 'Expense')}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-text-muted">
                    {new Date(tx.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <Badge variant={tx.tag === 'professional' ? 'accent' : 'muted'} size="sm">
                    {tx.tag}
                  </Badge>
                </div>
              </div>
              <p className={`text-sm font-bold flex-shrink-0 ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
              </p>
              <button
                onClick={() => deleteTx(tx.id)}
                className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors flex-shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingTx ? 'Edit Transaction' : 'New Transaction'}
      >
        <div className="space-y-4">
          {/* Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Type</label>
            <div className="flex rounded-xl overflow-hidden border border-border">
              <button
                onClick={() => setFormType('income')}
                className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                  formType === 'income' ? 'bg-success/20 text-success' : 'bg-surface-light text-text-muted'
                }`}
              >
                Income
              </button>
              <button
                onClick={() => setFormType('expense')}
                className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                  formType === 'expense' ? 'bg-danger/20 text-danger' : 'bg-surface-light text-text-muted'
                }`}
              >
                Expense
              </button>
            </div>
          </div>

          <Input
            id="tx-amount"
            type="number"
            label="Amount"
            placeholder="0.00"
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            icon={<DollarSign size={16} />}
          />

          {/* Tag Toggle */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Tag</label>
            <div className="flex rounded-xl overflow-hidden border border-border">
              <button
                onClick={() => setFormTag('personal')}
                className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                  formTag === 'personal' ? 'bg-accent/20 text-accent-light' : 'bg-surface-light text-text-muted'
                }`}
              >
                Personal
              </button>
              <button
                onClick={() => setFormTag('professional')}
                className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                  formTag === 'professional' ? 'bg-accent/20 text-accent-light' : 'bg-surface-light text-text-muted'
                }`}
              >
                Professional
              </button>
            </div>
          </div>

          <Select
            id="tx-category"
            label="Category"
            options={[
              { value: '', label: 'Select category...' },
              ...filteredCategories.map(c => ({ value: c.id, label: c.name })),
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
              {editingTx ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
