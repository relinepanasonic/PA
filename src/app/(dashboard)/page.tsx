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

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  const [portfolioSummary, setPortfolioSummary] = useState<Record<string, { avgPrice: number; lots: number }>>({});
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

      // Use LOCAL date string instead of UTC (.toISOString()) so past-midnight local time (e.g. 00:25 WIB) gets today's date correctly
      const today = getLocalDateString();
      const monthStart = `${today.slice(0, 8)}01`;

      const todayStart = `${today}T00:00:00`;
      const todayEnd = `${today}T23:59:59`;

      const [
        { data: rawTodos },
        { data: schedule },
        { data: transactions }
      ] = await Promise.all([
        supabase
          .from('todos')
          .select('*')
          .eq('user_id', user.id)
          .limit(30),
        supabase
          .from('work_activities')
          .select('*')
          .eq('user_id', user.id)
          .or(`and(scheduled_at.gte.${todayStart},scheduled_at.lte.${todayEnd}),and(deadline.gte.${todayStart},deadline.lte.${todayEnd})`)
          .neq('status', 'completed')
          .neq('status', 'cancelled')
          .order('scheduled_at', { ascending: true })
          .limit(10),
        supabase
          .from('finance_transactions')
          .select('amount, type, tag, description')
          .eq('user_id', user.id)
          .gte('transaction_date', monthStart)
          .lte('transaction_date', today)
      ]);

      const sortedTodos = (rawTodos || []).sort((a, b) => {
        if (a.is_completed !== b.is_completed) {
          return a.is_completed ? 1 : -1;
        }
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
      });

      if (transactions) {
        const summary: FinanceSummary = {
          total_income: 0,
          total_expenses: 0,
          professional_income: 0,
          personal_expenses: 0,
        };
        for (const tx of transactions) {
          if (tx.description?.includes('___TRANSFER___')) continue;
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

      setUrgentTodos(sortedTodos);
      setTodaySchedule(schedule || []);
      setLoading(false);
  };

  const fetchStocks = async () => {
    setStocksLoading(true);
    try {
      // 1. Fetch user portfolio holdings to calculate average buy price & get portfolio tickers
      const portRes = await fetch('/api/investasi/portfolio');
      const summaryMap: Record<string, { avgPrice: number; lots: number }> = {};
      let portSymbols: string[] = [];

      if (portRes.ok) {
        const portData = await portRes.json();
        const items = portData.portfolio || [];
        const portMap: Record<string, { totalCost: number; totalLots: number }> = {};
        items.forEach((item: any) => {
          const base = item.ticker.toUpperCase().replace('.JK', '');
          if (!portMap[base]) portMap[base] = { totalCost: 0, totalLots: 0 };
          portMap[base].totalCost += Number(item.buy_price) * Number(item.lots);
          portMap[base].totalLots += Number(item.lots);
        });
        Object.keys(portMap).forEach((base) => {
          summaryMap[base] = {
            avgPrice: Math.round(portMap[base].totalCost / portMap[base].totalLots),
            lots: portMap[base].totalLots,
          };
          portSymbols.push(`${base}.JK`);
        });
      }
      setPortfolioSummary(summaryMap);

      // 2. Fetch live Yahoo Finance prices for default tickers + user portfolio tickers
      const allTickers = Array.from(new Set(['BBCA.JK', 'ELTY.JK', ...portSymbols]));
      const res = await fetch(`/api/stocks?symbols=${allTickers.join(',')}`);
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

    // Build the script with natural conversational pauses (...) so it sounds human, not robotic
    // Greeting -> 1. Today Schedule -> 2. To Do list -> 3. Hot News -> 4. IDX Watch
    let script = 'Selamat Pagi Nico, Jax Disini... Berikut adalah ringkasan hari ini... ';

    // 1. Today Schedule
    if (todaySchedule.length > 0) {
      script += `Pertama, jadwal hari ini ada ${todaySchedule.length} kegiatan... `;
      todaySchedule.forEach((act, idx) => {
        const timeStr = act.scheduled_at
          ? new Date(act.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : '';
        script += `${idx + 1}. ${act.title}${timeStr ? `, pukul ${timeStr}` : ''}... `;
      });
    } else {
      script += 'Pertama, jadwal hari ini kosong... ';
    }

    // 2. To Do list
    if (urgentTodos.length > 0) {
      script += `Kedua, daftar tugas penting ada ${urgentTodos.length} tugas... `;
      urgentTodos.forEach((todo, idx) => {
        script += `${idx + 1}. ${todo.title}... `;
      });
    } else {
      script += 'Kedua, semua tugas penting sudah selesai... ';
    }

    // 3. Hot News
    if (news.length > 0) {
      script += 'Ketiga, berita utama hari ini... ';
      news.forEach((item, idx) => {
        script += `${idx + 1}. ${item.title}... `;
      });
    }

    // 4. IDX Watch
    if (stocks.length > 0) {
      script += 'Keempat, pantauan saham IDX terkini... ';
      stocks.forEach((s) => {
        const direction = s.changePercent >= 0 ? 'naik' : 'turun';
        const absPercent = Math.abs(s.changePercent).toFixed(2);
        script += `${s.ticker.replace('.JK', '')} di harga ${Math.round(s.price)} rupiah, ${direction} ${absPercent} persen... `;
      });
    }

    const utterance = new SpeechSynthesisUtterance(script);
    utterance.lang = 'id-ID';

    // Score and select a soft, natural Indonesian female voice (e.g., Natural / Neural / Gadis / Siti / Google Bahasa Indonesia)
    const voices = synth.getVoices();
    let bestVoice: SpeechSynthesisVoice | null = null;
    let bestScore = -1000;

    for (const v of voices) {
      let score = 0;
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();

      if (lang.includes('id')) score += 50;
      if (name.includes('natural') || name.includes('online') || name.includes('neural')) score += 35;
      // Prioritize Female / Gadis / Siti / Rani / Google Bahasa Indonesia
      if (/female|woman|wanita|gadis|siti|rani/i.test(name)) score += 45;
      // Penalize Male voices
      if (/male|man|pria|ardi|andika|budi|dika/i.test(name)) score -= 50;

      if (score > bestScore && score > 0) {
        bestScore = score;
        bestVoice = v;
      }
    }

    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    // Soft, warm, calm female tone (0.96 pitch ensures smooth softness without sharp/high-pitched tones)
    utterance.pitch = 0.96;
    utterance.rate = 0.94;

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
    const dateStr = act.scheduled_at ? act.scheduled_at.split('T')[0] : getLocalDateString();
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
    setFormDate(todo.due_date || getLocalDateString());
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

  const handleToggleTodo = async (todo: Todo, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !todo.is_completed;
    await supabase.from('todos').update({ is_completed: newStatus }).eq('id', todo.id);
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

      {/* 1. TODAY'S SCHEDULE */}
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

      {/* 2. TO DO LIST */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">To Do List</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-medium">
              {urgentTodos.filter(t => !t.is_completed).length} Pending
            </span>
            <Link href="/todos" className="text-xs text-blue-400 font-semibold flex items-center gap-0.5 hover:underline">
              All Tasks <ChevronRight size={14} />
            </Link>
          </div>
        </div>
        {urgentTodos.length === 0 ? (
          <div className="glass-card rounded-[28px] p-6 text-center border border-white/10">
            <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">All caught up!</p>
            <p className="text-xs text-slate-400 mt-0.5">Your to-do list is clean.</p>
          </div>
        ) : (
          <div className="max-h-[310px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {urgentTodos.map((todo) => (
              <div
                key={todo.id}
                onClick={() => openEditTodo(todo)}
                className={`glass-card rounded-2xl p-3.5 flex items-center gap-3 border transition-all cursor-pointer ${
                  todo.is_completed
                    ? 'border-white/5 bg-white/[0.02] opacity-70'
                    : 'border-white/10 hover:bg-white/[0.08]'
                }`}
              >
                {/* Toggle Completion Button */}
                <button
                  type="button"
                  onClick={(e) => handleToggleTodo(todo, e)}
                  className="p-1 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
                  title={todo.is_completed ? 'Tandai belum selesai' : 'Tandai selesai'}
                >
                  {todo.is_completed ? (
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-400 hover:border-emerald-400 transition-colors" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${todo.is_completed ? 'line-through text-slate-400 font-normal' : 'font-semibold text-white'}`}>
                    {todo.title}
                  </p>
                  {todo.due_date && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Due: {new Date(todo.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>

                {todo.is_completed ? (
                  <Badge variant="success" size="sm">Done</Badge>
                ) : (
                  <Badge variant={priorityVariant(todo.priority)} size="sm">
                    {todo.priority}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. IDX WATCHLIST */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">IDX Watchlist</h2>
          </div>
          <Link
            href="/investasi"
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            <span>Portofolio Saya</span>
            <ChevronRight size={14} />
          </Link>
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
              const baseTicker = s.ticker.toUpperCase().replace('.JK', '');
              const portInfo = portfolioSummary[baseTicker];
              let pnlPercent: number | null = null;
              if (portInfo && portInfo.avgPrice > 0 && s.price > 0) {
                pnlPercent = ((s.price - portInfo.avgPrice) / portInfo.avgPrice) * 100;
              }

              return (
                <div
                  key={s.ticker}
                  className="glow-card rounded-2xl p-3.5 border border-white/15 bg-gradient-to-br from-slate-900/95 via-[#0d1829]/90 to-slate-900 shadow-xl hover:border-blue-400/40 transition-all flex flex-col justify-between"
                >
                  {/* Top Row: Compact Ticker + Lot Badge */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-sm font-extrabold text-white tracking-tight">{baseTicker}</span>
                        <span className="text-[9px] text-slate-500 font-mono">.JK</span>
                      </div>
                      {portInfo && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-400/30 text-blue-300 text-[9px] font-bold">
                          {portInfo.lots} Lot
                        </span>
                      )}
                    </div>

                    {/* Full-width Price Row */}
                    <p className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight mt-1.5">
                      Rp {Math.round(s.price).toLocaleString('id-ID')}
                    </p>

                    {/* Daily Trend Pill positioned lower on the right side */}
                    <div className="flex justify-end mt-1.5">
                      <div
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-extrabold border ${
                          isUp
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/15 text-red-400 border-red-500/30'
                        }`}
                      >
                        {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        <span>{isUp ? '+' : ''}{s.changePercent.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer: Crisp 2-Column Compact Grid */}
                  {portInfo && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 grid grid-cols-2 gap-1">
                      <div>
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                          Avg Price
                        </p>
                        <p className="text-[11px] font-bold text-slate-200 font-mono">
                          Rp {portInfo.avgPrice.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                          Return
                        </p>
                        {pnlPercent !== null ? (
                          <p
                            className={`text-[11px] font-extrabold font-mono ${
                              pnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {pnlPercent >= 0 ? '+' : ''}
                            {pnlPercent.toFixed(2)}%
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400">-</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. HOT NEWS HEADLINES */}
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

      {/* 5. FINANCE BENTO CARDS */}
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
