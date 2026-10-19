'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Todo, WorkActivity } from '@/lib/types/database';
import { AlertTriangle, Moon, Footprints, Flame,  TrendingUp, TrendingDown, Calendar, CheckCircle2, Clock, ChevronRight, Sparkles, Activity, Volume2, VolumeX, Newspaper, BarChart3, Brain, Heart, DollarSign } from 'lucide-react';
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
import AddToGoogleCalendar from '@/components/ui/AddToGoogleCalendar';
import JarvisCore, { notifyVoiceWord } from '@/components/ui/JarvisCore';

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DashboardPage() {
  const [briefTab, setBriefTab] = useState<'productivity' | 'health' | 'money'>('productivity');
  const [fitbitData, setFitbitData] = useState<any>(null);
  const [loadingFitbit, setLoadingFitbit] = useState(false);

  useEffect(() => {
    if (briefTab === 'health' && !fitbitData && !loadingFitbit) {
      setLoadingFitbit(true);
      fetch('/api/fitbit/data')
        .then(res => res.json())
        .then(data => {
          if (!data.error) setFitbitData(data);
          setLoadingFitbit(false);
        })
        .catch(() => setLoadingFitbit(false));
    }
  }, [briefTab]);
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
          .eq('is_completed', false)
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

      const sortedTodos = (rawTodos || [])
        .filter((t) => !t.is_completed)
        .sort((a, b) => {
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

  const cloudAudioRef = useRef<HTMLAudioElement | null>(null);
  const cloudStopRef = useRef(false);

  const stopCloudVoice = () => {
    cloudStopRef.current = true;
    cloudAudioRef.current?.pause();
    cloudAudioRef.current = null;
  };

  // Split into <=~800 char chunks on "..." / sentence ends, fetch each as MP3, play in order.
  const playCloudVoice = async (script: string): Promise<boolean> => {
    const parts = script.split(/(?<=\.\.\.|[.!?])\s+/);
    const chunks: string[] = [];
    let cur = '';
    for (const p of parts) {
      if ((cur + ' ' + p).length > 800 && cur) { chunks.push(cur); cur = p; }
      else cur = cur ? cur + ' ' + p : p;
    }
    if (cur) chunks.push(cur);

    const fetchChunk = async (text: string): Promise<string | null> => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) return null;
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      } catch {
        return null;
      }
    };

    cloudStopRef.current = false;
    let next: Promise<string | null> = fetchChunk(chunks[0]);
    for (let i = 0; i < chunks.length; i++) {
      const url = await next;
      if (cloudStopRef.current) return true;
      if (!url) return i > 0; // nothing played yet -> let the browser voice take over
      if (i + 1 < chunks.length) next = fetchChunk(chunks[i + 1]);
      await new Promise<void>((resolve) => {
        const audio = new Audio(url);
        cloudAudioRef.current = audio;
        // Pulse the HUD orb while the voice plays
        const pulse = setInterval(() => notifyVoiceWord(), 160);
        const done = () => { clearInterval(pulse); URL.revokeObjectURL(url); resolve(); };
        audio.onended = done;
        audio.onerror = done;
        audio.play().catch(done);
      });
    }
    if (!cloudStopRef.current) setIsSpeaking(false);
    return true;
  };

  const [activeCat, setActiveCat] = useState<'schedule' | 'stocks' | 'health' | 'news' | null>(null);

  // Read one category aloud. Tapping the active category again stops it.
  const handlePlayBrief = async (category: 'schedule' | 'stocks' | 'health' | 'news') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    synthRef.current = synth;

    const wasSpeaking = isSpeaking;
    synth.cancel();
    stopCloudVoice();
    setIsSpeaking(false);
    if (wasSpeaking && activeCat === category) {
      setActiveCat(null);
      return;
    }
    setActiveCat(category);

    let script = '';

    if (category === 'schedule') {
      script = 'Jax disini... Berikut jadwal dan tugas kamu hari ini... ';
      if (todaySchedule.length > 0) {
        script += `Jadwal hari ini ada ${todaySchedule.length} kegiatan... `;
        todaySchedule.forEach((act, idx) => {
          const timeStr = act.scheduled_at
            ? new Date(act.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            : '';
          script += `${idx + 1}. ${act.title}${timeStr ? `, pukul ${timeStr}` : ''}... `;
        });
      } else {
        script += 'Jadwal hari ini kosong... ';
      }
      if (urgentTodos.length > 0) {
        script += `Daftar tugas penting ada ${urgentTodos.length} tugas... `;
        urgentTodos.forEach((todo, idx) => {
          script += `${idx + 1}. ${todo.title}... `;
        });
      } else {
        script += 'Semua tugas penting sudah selesai... ';
      }
    } else if (category === 'stocks') {
      script = 'Jax disini... Berikut pantauan saham IDX terkini... ';
      if (stocks.length > 0) {
        stocks.forEach((s) => {
          const direction = s.changePercent >= 0 ? 'naik' : 'turun';
          const absPercent = Math.abs(s.changePercent).toFixed(2);
          script += `${s.ticker.replace('.JK', '')} di harga ${Math.round(s.price)} rupiah, ${direction} ${absPercent} persen... `;
        });
      } else {
        script += 'Data saham belum tersedia... ';
      }
    } else if (category === 'news') {
      script = 'Jax disini... Berikut berita utama hari ini... ';
      if (news.length > 0) {
        news.forEach((item, idx) => {
          script += `${idx + 1}. ${item.title}... `;
        });
      } else {
        script += 'Belum ada berita terbaru... ';
      }
    } else {
      script = 'Jax disini... Berikut data kesehatan kamu hari ini... ';
      let data = fitbitData;
      if (!data) {
        try {
          const res = await fetch('/api/fitbit/data');
          const json = await res.json();
          if (!json.error) {
            data = json;
            setFitbitData(json);
          }
        } catch {
          /* handled below */
        }
      }
      if (!data) {
        script += 'Fitbit belum terhubung atau datanya belum bisa diambil... ';
      } else {
        if (data.sleep) {
          const h = Math.floor(data.sleep.totalMinutesAsleep / 60);
          const m = data.sleep.totalMinutesAsleep % 60;
          script += `Tidur semalam ${h} jam ${m} menit... `;
        } else {
          script += 'Data tidur belum tersedia... ';
        }
        if (data.steps) script += `Langkah hari ini ${data.steps} langkah... `;
        if (data.heartRate?.restingHeartRate) script += `Detak jantung terendah ${data.heartRate.restingHeartRate} bpm... `;
      }
    }

    // Preferred: natural male Indonesian neural voice from the server (/api/tts).
    // Falls back to the browser voice below if it isn't configured or fails.
    setIsSpeaking(true);
    playCloudVoice(script).then((ok) => {
      if (ok) return;
      speakWithBrowser(script, synth);
    });
  };

  const speakWithBrowser = (script: string, synth: SpeechSynthesis) => {
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.lang = 'id-ID';

    // Pick a natural Indonesian male voice: Edge's neural "Ardi" first, then
    // Windows "Andika", then any male id-ID voice. Indonesian voices read the
    // English words (news titles, tickers) with a natural Indonesian accent.
    const voices = synth.getVoices();
    let bestVoice: SpeechSynthesisVoice | null = null;
    let bestScore = 0;

    for (const v of voices) {
      let score = 0;
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase().replace('_', '-');

      if (lang.startsWith('id') || lang.startsWith('in-')) score += 60;
      if (/natural|online|neural/.test(name)) score += 40;
      if (/ardi/.test(name)) score += 60;
      if (/andika|pria|male|\bman\b/.test(name)) score += 40;
      if (/female|woman|wanita|gadis|siti|rani|gadis|damayanti/.test(name)) score -= 80;

      if (score > bestScore) {
        bestScore = score;
        bestVoice = v;
      }
    }

    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    // Deeper, calm, unhurried male delivery
    utterance.pitch = bestVoice && /ardi|andika|male|pria/i.test(bestVoice.name) ? 0.95 : 0.8;
    utterance.rate = 0.98;

    utterance.onboundary = () => notifyVoiceWord();
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
    const [y, m, d] = formDate.split('-').map(Number);
    const [sHr, sMin] = formStartTime.split(':').map(Number);
    const [eHr, eMin] = formEndTime.split(':').map(Number);
    const startIso = new Date(y, m - 1, d, sHr || 0, sMin || 0, 0).toISOString();
    const endIso = new Date(y, m - 1, d, eHr || 0, eMin || 0, 0).toISOString();

    const origMeta = (editingActivity.metadata as Record<string, any>) || {};
    await supabase.from('work_activities').update({
      title: formTitle,
      scheduled_at: startIso,
      deadline: endIso,
      metadata: {
        ...origMeta,
        start_time: formStartTime,
        end_time: formEndTime,
      },
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
    if (newStatus) {
      setUrgentTodos((prev) => prev.filter((t) => t.id !== todo.id));
    }
    await supabase.from('todos').update({
      is_completed: newStatus,
      completed_at: newStatus ? new Date().toISOString() : null,
    }).eq('id', todo.id);
    fetchDashboard();
  };

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return `Rp ${formatted}`;
  };

  const formatActivityTime = (activity: WorkActivity) => {
    const meta = activity.metadata as Record<string, any> | null;
    if (meta?.all_day) return 'All Day';
    if (meta?.start_time) {
      const endStr = meta.end_time ? ` - ${meta.end_time}` : '';
      return `${meta.start_time}${endStr}`;
    }
    if (activity.scheduled_at) {
      return new Date(activity.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return 'No time set';
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


  // Calendar helpers
  const calToday = new Date();
  const calYear = calToday.getFullYear();
  const calMonth = calToday.getMonth();
  const calFirstDay = new Date(calYear, calMonth, 1).getDay();
  const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const scheduledDays = new Set(
    todaySchedule.map(a => a.scheduled_at ? new Date(a.scheduled_at).getDate() : null).filter(Boolean) as number[]
  );
  const todoDueDays = new Set(
    urgentTodos.filter(t => !t.is_completed && t.due_date).map(t => new Date(t.due_date!).getDate())
  );

  const categories = [
    { key: 'schedule' as const, label: 'Schedule', icon: Calendar },
    { key: 'stocks' as const, label: 'Saham', icon: BarChart3 },
    { key: 'health' as const, label: 'Health', icon: Moon },
    { key: 'news' as const, label: 'News', icon: Newspaper },
  ];

  return (
    <div className="flex flex-col h-[calc(100dvh-5.5rem)] md:h-[calc(100dvh-2rem)] p-3 animate-fade-in">
      <div className="relative flex-1 min-h-0 rounded-[28px] bg-black border border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(34,211,238,0.15)]">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.08),transparent_65%)]" />
        <JarvisCore speaking={isSpeaking} fill />
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3">
        {categories.map(({ key, label, icon: Icon }) => {
          const active = activeCat === key && isSpeaking;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handlePlayBrief(key)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border text-[11px] font-bold tracking-wide transition-all active:scale-95 ${
                active
                  ? 'bg-orange-500/20 border-orange-400/50 text-orange-300 animate-pulse'
                  : 'bg-cyan-500/10 border-cyan-400/25 text-cyan-300 hover:bg-cyan-500/20'
              }`}
            >
              <Icon size={20} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
