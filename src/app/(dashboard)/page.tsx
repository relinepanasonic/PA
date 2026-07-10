'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Todo, WorkActivity } from '@/lib/types/database';
import { AlertTriangle, TrendingUp, TrendingDown, Calendar, CheckCircle2, Clock, ChevronRight, Sparkles, Activity, Volume2, VolumeX, Newspaper, BarChart3 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { SkeletonDashboard } from '@/components/ui/LoadingSkeleton';
import Link from 'next/link';

interface FinanceSummary {
  total_income: number;
  total_expenses: number;
  professional_income: number;
  personal_expenses: number;
}

interface StockData {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

interface NewsItem {
  title: string;
  url: string;
  source: string;
}

import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';

export default function DashboardPage() {
  const [urgentTodos, setUrgentTodos] = useState<Todo[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<WorkActivity[]>([]);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary>({
    total_income: 0,
    total_expenses: 0,
    professional_income: 0,
    personal_expenses: 0,
  });
  const [loading, setLoading] = useState(true);

  // Stocks & News state
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [stocksLoading, setStocksLoading] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  // Voice Brief state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Edit Modal State
  const [editingActivity, setEditingActivity] = useState<WorkActivity | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('09:00');
  const [formPriority, setFormPriority] = useState('medium');
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const fetchDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      // Fetch urgent/overdue todos (limit 5)
      const { data: todos } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .or(`due_date.lte.${today},priority.in.(high,urgent)`)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(5);

      // Fetch today's schedule (limit 10)
      const todayStart = `${today}T00:00:00`;
      const todayEnd = `${today}T23:59:59`;
      const { data: schedule } = await supabase
        .from('work_activities')
        .select('*')
        .eq('user_id', user.id)
        .or(`scheduled_at.gte.${todayStart},deadline.gte.${todayStart}`)
        .or(`scheduled_at.lte.${todayEnd},deadline.lte.${todayEnd}`)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('scheduled_at', { ascending: true })
        .limit(10);

      // Fetch finance summary for current month
      const { data: transactions } = await supabase
        .from('finance_transactions')
        .select('amount, type, tag')
        .eq('user_id', user.id)
        .gte('transaction_date', monthStart)
        .lte('transaction_date', today);

      if (transactions) {
        const summary: FinanceSummary = {
          total_income: 0,
          total_expenses: 0,
          professional_income: 0,
          personal_expenses: 0,
        };
        for (const tx of transactions) {
          const amt = Number(tx.amount);
          if (tx.type === 'income') {
            summary.total_income += amt;
            if (tx.tag === 'professional') summary.professional_income += amt;
          } else {
            summary.total_expenses += amt;
            if (tx.tag === 'personal') summary.personal_expenses += amt;
          }
        }
        setFinanceSummary(summary);
      }

      setUrgentTodos(todos || []);
      setTodaySchedule(schedule || []);
      setLoading(false);
  };

  const fetchStocks = async () => {
    setStocksLoading(true);
    try {
      const res = await fetch('/api/stocks');
      if (res.ok) {
        const data = await res.json();
        setStocks(data.stocks || []);
      }
    } catch (err) {
      console.error('Stocks fetch error:', err);
    }
    setStocksLoading(false);
  };

  const fetchNews = async () => {
    setNewsLoading(true);
    try {
      const res = await fetch('/api/news');
      if (res.ok) {
        const data = await res.json();
        setNews(data.news || []);
      }
    } catch (err) {
      console.error('News fetch error:', err);
    }
    setNewsLoading(false);
  };

  const handlePlayBrief = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    synthRef.current = synth;

    // If already speaking, stop it
    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    // Build the script in exact requested order:
    // Greeting -> 1. Today Schedule -> 2. To Do list -> 3. Hot News -> 4. IDX Watch
    let script = 'Selamat pagi Nico. Berikut adalah ringkasan hari ini dari Jax. ';

    // 1. Today Schedule
    if (todaySchedule.length > 0) {
      script += `Jadwal hari ini ada ${todaySchedule.length} kegiatan. `;
      todaySchedule.forEach((act, idx) => {
        const timeStr = act.scheduled_at
          ? new Date(act.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : '';
        script += `${idx + 1}. ${act.title} ${timeStr ? `pukul ${timeStr}` : ''}. `;
      });
    } else {
      script += 'Jadwal hari ini kosong. ';
    }

    // 2. To Do list
    if (urgentTodos.length > 0) {
      script += `Daftar tugas penting ada ${urgentTodos.length} tugas. `;
      urgentTodos.forEach((todo, idx) => {
        script += `${idx + 1}. ${todo.title}. `;
      });
    } else {
      script += 'Semua tugas penting sudah selesai. ';
    }

    // 3. Hot News
    if (news.length > 0) {
      script += 'Berita utama hari ini. ';
      news.forEach((item, idx) => {
        script += `${idx + 1}. ${item.title}. `;
      });
    }

    // 4. IDX Watch
    if (stocks.length > 0) {
      script += 'Pantauan saham IDX terkini. ';
      stocks.forEach((s) => {
        const direction = s.changePercent >= 0 ? 'naik' : 'turun';
        const absPercent = Math.abs(s.changePercent).toFixed(2);
        script += `${s.ticker.replace('.JK', '')} di harga ${Math.round(s.price)} rupiah, ${direction} ${absPercent} persen. `;
      });
    }

    const utterance = new SpeechSynthesisUtterance(script);
    utterance.lang = 'id-ID';

    // Prefer Indonesian male voice if available in browser
    const voices = synth.getVoices();
    const idVoices = voices.filter(v => v.lang.toLowerCase().includes('id'));
    const maleIdVoice = idVoices.find(v =>
      /male|man|pria|ardi|andika|dika|budi/i.test(v.name)
    ) || idVoices[0];

    if (maleIdVoice) {
      utterance.voice = maleIdVoice;
    }

    // Deep man voice tuning (lower pitch + natural executive speed)
    utterance.pitch = 0.82;
    utterance.rate = 0.96;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    synth.speak(utterance);
  };

  useEffect(() => {
    fetchDashboard();
    fetchStocks();
    fetchNews();

    return () => {
      // Cleanup: stop speech on unmount
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  const openEditActivity = (act: WorkActivity) => {
    setEditingTodo(null);
    setEditingActivity(act);
    setFormTitle(act.title);
    const dateStr = act.scheduled_at ? act.scheduled_at.split('T')[0] : new Date().toISOString().split('T')[0];
    const startT = act.scheduled_at ? act.scheduled_at.split('T')[1]?.slice(0, 5) : '08:00';
    const endT = act.deadline ? act.deadline.split('T')[1]?.slice(0, 5) : '09:00';
    setFormDate(dateStr);
    setFormStartTime(startT || '08:00');
    setFormEndTime(endT || '09:00');
  };

  const openEditTodo = (todo: Todo) => {
    setEditingActivity(null);
    setEditingTodo(todo);
    setFormTitle(todo.title);
    setFormDate(todo.due_date || new Date().toISOString().split('T')[0]);
    setFormPriority(todo.priority);
  };

  const handleSaveActivity = async () => {
    if (!editingActivity || !formTitle.trim()) return;
    setSaving(true);
    const startIso = `${formDate}T${formStartTime}:00`;
    const endIso = `${formDate}T${formEndTime}:00`;
    await supabase.from('work_activities').update({
      title: formTitle,
      scheduled_at: startIso,
      deadline: endIso,
    }).eq('id', editingActivity.id);
    setSaving(false);
    setEditingActivity(null);
    fetchDashboard();
  };

  const handleSaveTodo = async () => {
    if (!editingTodo || !formTitle.trim()) return;
    setSaving(true);
    await supabase.from('todos').update({
      title: formTitle,
      due_date: formDate,
      priority: formPriority as any,
    }).eq('id', editingTodo.id);
    setSaving(false);
    setEditingTodo(null);
    fetchDashboard();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const priorityVariant = (priority: Todo['priority']) => {
    switch (priority) {
      case 'urgent': return 'danger' as const;
      case 'high': return 'warning' as const;
      default: return 'default' as const;
    }
  };

  if (loading) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="p-4 space-y-6 animate-fade-in pb-24">
      {/* Top Welcome Hero Glass Pill with Voice Brief */}
      <div className="glass-card rounded-[28px] p-5 border border-white/15 bg-gradient-to-br from-blue-900/30 via-slate-900/40 to-cyan-900/20 shadow-xl flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-bold uppercase tracking-wider mb-1.5">
            <Sparkles size={12} /> Live Dashboard
          </div>
          <h1 className="text-lg font-bold text-white">Your Daily Brief</h1>
        </div>
        <button
          onClick={handlePlayBrief}
          className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all active:scale-95 ${
            isSpeaking
              ? 'bg-red-500/20 border-red-400/40 text-red-400 animate-pulse'
              : 'bg-blue-500/10 border-blue-400/20 text-blue-400 hover:bg-blue-500/20'
          }`}
          title={isSpeaking ? 'Stop Brief' : 'Play Morning Brief'}
        >
          {isSpeaking ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      {/* ── IDX STOCK TRACKER ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">IDX Watchlist</h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-400 font-medium">Live</span>
        </div>
        {stocksLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map(i => (
              <div key={i} className="glow-card rounded-2xl p-4 border border-white/10 animate-pulse">
                <div className="h-3 bg-white/10 rounded w-16 mb-3" />
                <div className="h-5 bg-white/10 rounded w-24 mb-2" />
                <div className="h-3 bg-white/10 rounded w-14" />
              </div>
            ))}
          </div>
        ) : stocks.length === 0 ? (
          <div className="glow-card rounded-2xl p-5 text-center border border-white/10">
            <p className="text-xs text-slate-400">Unable to load stock data. Try refreshing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {stocks.map((s) => {
              const isUp = s.changePercent >= 0;
              return (
                <div key={s.ticker} className="glow-card rounded-2xl p-4 border border-white/10 bg-gradient-to-br from-slate-900/50 to-slate-800/30">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{s.ticker.replace('.JK', '')}</p>
                  <p className="text-xl font-extrabold text-white font-mono tracking-tight">
                    {new Intl.NumberFormat('id-ID').format(Math.round(s.price))}
                  </p>
                  <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    isUp
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/15 text-red-400 border border-red-500/30'
                  }`}>
                    {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {isUp ? '+' : ''}{s.changePercent.toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── HOT NEWS HEADLINES ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Newspaper size={16} className="text-amber-400" />
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Hot News</h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-400 font-medium">Indonesia</span>
        </div>
        {newsLoading ? (
          <div className="glow-card rounded-2xl p-4 border border-white/10 animate-pulse space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-3.5 bg-white/10 rounded w-full" style={{ width: `${85 - i * 10}%` }} />
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="glow-card rounded-2xl p-5 text-center border border-white/10">
            <p className="text-xs text-slate-400">No news available right now.</p>
          </div>
        ) : (
          <div className="glow-card rounded-2xl p-4 border border-white/10 space-y-2.5">
            {news.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-400/30 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white leading-snug">{item.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{item.source}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Finance Bento Cards */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">This Month Finance</h2>
          <Link href="/finance" className="text-xs text-blue-400 font-semibold flex items-center gap-0.5 hover:underline">
            Ledger <ChevronRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          <div className="glow-card rounded-[28px] p-4.5 bg-gradient-to-br from-emerald-950/30 to-slate-900/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <TrendingUp size={16} className="text-emerald-400" />
              </div>
              <span className="text-xs font-semibold text-slate-300">Income</span>
            </div>
            <p className="text-2xl font-extrabold text-emerald-400 tracking-tight">{formatCurrency(financeSummary.total_income)}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Pro Agency: {formatCurrency(financeSummary.professional_income)}</p>
          </div>
          <div className="glow-card rounded-[28px] p-4.5 bg-gradient-to-br from-red-950/30 to-slate-900/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                <TrendingDown size={16} className="text-red-400" />
              </div>
              <span className="text-xs font-semibold text-slate-300">Expenses</span>
            </div>
            <p className="text-2xl font-extrabold text-red-400 tracking-tight">{formatCurrency(financeSummary.total_expenses)}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Personal: {formatCurrency(financeSummary.personal_expenses)}</p>
          </div>
        </div>
      </section>

      {/* Urgent Tasks Bento Section */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Urgent & Overdue</h2>
          </div>
          <Link href="/todos" className="text-xs text-blue-400 font-semibold flex items-center gap-0.5 hover:underline">
            All Tasks <ChevronRight size={14} />
          </Link>
        </div>
        {urgentTodos.length === 0 ? (
          <div className="glass-card rounded-[28px] p-6 text-center border border-white/10">
            <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">All caught up!</p>
            <p className="text-xs text-slate-400 mt-0.5">No urgent or overdue tasks.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {urgentTodos.map((todo) => (
              <div
                key={todo.id}
                onClick={() => openEditTodo(todo)}
                className="glass-card rounded-2xl p-3.5 flex items-center gap-3 border border-white/10 cursor-pointer hover:bg-white/[0.08] transition-all"
              >
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm ${
                  todo.priority === 'urgent' ? 'bg-red-500 animate-pulse' :
                  todo.priority === 'high' ? 'bg-amber-400' : 'bg-blue-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{todo.title}</p>
                  {todo.due_date && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Due: {new Date(todo.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
                <Badge variant={priorityVariant(todo.priority)} size="sm">
                  {todo.priority}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Today's Schedule Bento Section */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-blue-400" />
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Today&apos;s Schedule</h2>
          </div>
          <Link href="/activities" className="text-xs text-blue-400 font-semibold flex items-center gap-0.5 hover:underline">
            All Activities <ChevronRight size={14} />
          </Link>
        </div>
        {todaySchedule.length === 0 ? (
          <div className="glass-card rounded-[28px] p-6 text-center border border-white/10">
            <Clock size={28} className="text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">Clear Calendar</p>
            <p className="text-xs text-slate-400 mt-0.5">No activities scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {todaySchedule.map((activity) => (
              <div
                key={activity.id}
                onClick={() => openEditActivity(activity)}
                className="glass-card rounded-2xl p-3.5 flex items-center gap-3 border border-white/10 cursor-pointer hover:bg-white/[0.08] transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center flex-shrink-0">
                  <Calendar size={18} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{activity.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {activity.activity_type} · 
                    {activity.scheduled_at 
                      ? new Date(activity.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                      : 'No time set'
                    }
                  </p>
                </div>
                <Badge variant={activity.status === 'in_progress' ? 'warning' : 'accent'} size="sm">
                  {activity.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── EDIT MODAL ──────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!editingActivity || !!editingTodo}
        onClose={() => { setEditingActivity(null); setEditingTodo(null); }}
        title={editingActivity ? 'Edit Today Schedule' : 'Edit Urgent Task'}
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
          />

          {editingActivity && (
            <>
              <Input
                label="Date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="w-full">
                  <label className="block text-xs font-semibold text-slate-300 tracking-wide uppercase mb-1.5 ml-1">Start Time</label>
                  <select
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-400/60 font-mono font-bold"
                  >
                    {Array.from({ length: 48 }, (_, i) => {
                      const h = Math.floor(i / 2);
                      const m = i % 2 === 0 ? '00' : '30';
                      const t = `${String(h).padStart(2, '0')}:${m}`;
                      return <option key={`start-${t}`} value={t} className="bg-slate-900">{t}</option>;
                    })}
                  </select>
                </div>
                <div className="w-full">
                  <label className="block text-xs font-semibold text-slate-300 tracking-wide uppercase mb-1.5 ml-1">End Time</label>
                  <select
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-400/60 font-mono font-bold"
                  >
                    {Array.from({ length: 48 }, (_, i) => {
                      const h = Math.floor(i / 2);
                      const m = i % 2 === 0 ? '00' : '30';
                      const t = `${String(h).padStart(2, '0')}:${m}`;
                      return <option key={`end-${t}`} value={t} className="bg-slate-900">{t}</option>;
                    })}
                  </select>
                </div>
              </div>
            </>
          )}

          {editingTodo && (
            <>
              <Input
                label="Due Date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
              <div className="w-full">
                <label className="block text-xs font-semibold text-slate-300 tracking-wide uppercase mb-1.5 ml-1">Priority</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as any)}
                  className="w-full bg-slate-900 border border-white/15 rounded-2xl px-4 py-3 text-sm text-white font-bold"
                >
                  <option value="low" className="bg-slate-900">Low</option>
                  <option value="medium" className="bg-slate-900">Medium</option>
                  <option value="high" className="bg-slate-900">High</option>
                  <option value="urgent" className="bg-slate-900">Urgent</option>
                </select>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => { setEditingActivity(null); setEditingTodo(null); }}
              className="px-5 py-2.5 rounded-2xl text-sm font-bold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={editingActivity ? handleSaveActivity : handleSaveTodo}
              className="px-6 py-2.5 rounded-2xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-500/25 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
