'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Todo, WorkActivity } from '@/lib/types/database';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Grid,
  Clock,
  Plus,
  CheckCircle2,
  Circle,
  X,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import AddToGoogleCalendar from '@/components/ui/AddToGoogleCalendar';
import InstallPWA from '@/components/pwa/InstallPWA';

type ViewMode = 'daily' | 'month' | 'todos';
type TaskCategory = 'My Tasks' | 'Work' | 'Shopping List' | 'Personal';

interface SubtaskItem {
  id: string;
  title: string;
  completed: boolean;
}

interface CombinedItem {
  id: string;
  title: string;
  description: string;
  dateString: string | null;
  hourStart: number;
  hourEnd: number;
  type: 'todo' | 'activity';
  status: 'planned' | 'in_progress' | 'completed';
  priority: string;
  category?: TaskCategory;
  subtasks: SubtaskItem[];
  original: Todo | WorkActivity;
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => ({
  label: `${String(i + 1).padStart(2, '0')}.00`,
  hour: i + 1,
}));

const getLocalTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default function CalendarStudioPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [items, setItems] = useState<CombinedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const touchStartX = useRef<number | null>(null);

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formType, setFormType] = useState<'activity' | 'todo'>('activity');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('09:00');
  const [formPriority, setFormPriority] = useState('medium');
  const [formCategory, setFormCategory] = useState<TaskCategory>('My Tasks');
  const [formSubtasks, setFormSubtasks] = useState<string[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  // Drag & drop state for Kanban
  const [dragItemId, setDragItemId] = useState<string | null>(null);

  const supabase = createClient();

  const fetchAllItems = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: todos }, { data: activities }] = await Promise.all([
      supabase.from('todos').select('*').eq('user_id', user.id),
      supabase.from('work_activities').select('*').eq('user_id', user.id),
    ]);

    const combined: CombinedItem[] = [];

    (todos || []).forEach((t) => {
      let parsedSubtasks: SubtaskItem[] = [];
      let cleanDesc = t.description || '';
      try {
        if (cleanDesc.includes('___SUBTASKS___')) {
          const [desc, raw] = cleanDesc.split('___SUBTASKS___');
          cleanDesc = desc.trim();
          parsedSubtasks = JSON.parse(raw);
        }
      } catch { /* ignore */ }

      combined.push({
        id: `todo-${t.id}`,
        title: t.title,
        description: cleanDesc,
        dateString: t.due_date || null,
        hourStart: 8, hourEnd: 9,
        type: 'todo',
        status: t.is_completed ? 'completed' : 'planned',
        priority: t.priority || 'medium',
        category: 'My Tasks',
        subtasks: parsedSubtasks,
        original: t,
      });
    });

    (activities || []).forEach((a) => {
      let st: 'planned' | 'in_progress' | 'completed' = 'planned';
      if (a.status === 'in_progress') st = 'in_progress';
      if (a.status === 'completed') st = 'completed';

      let hrStart = 9, hrEnd = 10;
      if (a.scheduled_at) {
        const d = new Date(a.scheduled_at);
        if (!isNaN(d.getHours())) { hrStart = d.getHours(); hrEnd = hrStart + 1; }
      }

      combined.push({
        id: `act-${a.id}`,
        title: a.title,
        description: a.description || '',
        dateString: a.scheduled_at ? a.scheduled_at.split('T')[0]
          : a.deadline ? a.deadline.split('T')[0] : null,
        hourStart: hrStart, hourEnd: hrEnd,
        type: 'activity', status: st, priority: 'high',
        subtasks: [], original: a,
      });
    });

    setItems(combined);
    setLoading(false);
  };

  useEffect(() => { fetchAllItems(); }, []);

  // ── Touch Swipe (Daily View) ─────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() + (diff > 0 ? 1 : -1));
      setCurrentDate(d);
    }
    touchStartX.current = null;
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (item: CombinedItem) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    if (item.type === 'todo') {
      await supabase.from('todos').delete().eq('id', item.original.id);
    } else {
      await supabase.from('work_activities').delete().eq('id', item.original.id);
    }
  };

  // ── Status Move ──────────────────────────────────────────────────────────
  const handleMoveStatus = async (
    item: CombinedItem,
    newStatus: 'planned' | 'in_progress' | 'completed'
  ) => {
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: newStatus } : i));
    if (item.type === 'todo') {
      await supabase.from('todos').update({ is_completed: newStatus === 'completed' }).eq('id', item.original.id);
    } else {
      await supabase.from('work_activities').update({ status: newStatus }).eq('id', item.original.id);
    }
  };

  // ── Drag & Drop (Kanban) ─────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDragItemId(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = async (e: React.DragEvent, targetStatus: 'planned' | 'in_progress' | 'completed') => {
    e.preventDefault();
    if (!dragItemId) return;
    const item = items.find((i) => i.id === dragItemId);
    if (item && item.status !== targetStatus) {
      await handleMoveStatus(item, targetStatus);
    }
    setDragItemId(null);
  };

  // ── Subtasks ─────────────────────────────────────────────────────────────
  const handleToggleSubtask = async (item: CombinedItem, subtaskId: string) => {
    const updated = item.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, subtasks: updated } : i));
    if (item.type === 'todo') {
      const newDesc = `${item.description}___SUBTASKS___${JSON.stringify(updated)}`;
      await supabase.from('todos').update({ description: newDesc }).eq('id', item.original.id);
    }
  };

  // ── Save New Item ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const dateToUse = formDate || getLocalTodayString();

    if (formType === 'todo') {
      const subtaskObjs = formSubtasks.map((st, i) => ({
        id: `st-${Date.now()}-${i}`, title: st, completed: false,
      }));
      const finalDesc = [
        formCategory !== 'My Tasks' ? `[${formCategory}] ` : '',
        formDescription,
        subtaskObjs.length > 0 ? `___SUBTASKS___${JSON.stringify(subtaskObjs)}` : '',
      ].join('');

      await supabase.from('todos').insert({
        user_id: user.id, title: formTitle, description: finalDesc,
        due_date: dateToUse, priority: formPriority, is_completed: false,
      });
    } else {
      const startIso = `${dateToUse}T${formStartTime}:00`;
      await supabase.from('work_activities').insert({
        user_id: user.id, title: formTitle, description: formDescription,
        activity_type: 'livestream', status: 'not_started', scheduled_at: startIso,
      });
    }

    setFormTitle(''); setFormDescription(''); setFormSubtasks([]);
    setSaving(false); setShowModal(false);
    fetchAllItems();
  };

  const openModal = (dateStr?: string, hr?: number) => {
    const today = getLocalTodayString();
    setFormDate(dateStr || today);
    const nowHr = new Date().getHours();
    setFormStartTime(`${String(hr ?? nowHr).padStart(2, '0')}:00`);
    setFormEndTime(`${String((hr ?? nowHr) + 1).padStart(2, '0')}:00`);
    setFormTitle(''); setFormDescription('');
    setFormSubtasks([]); setNewSubtaskInput('');
    setShowModal(true);
  };

  const addSubtask = () => {
    if (!newSubtaskInput.trim()) return;
    setFormSubtasks((p) => [...p, newSubtaskInput.trim()]);
    setNewSubtaskInput('');
  };

  // ── Calendar helpers ─────────────────────────────────────────────────────
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });

  const dailyDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const localToday = getLocalTodayString();
  const isToday = dailyDateStr === localToday;
  const nowHour = new Date().getHours();

  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate);
    if (viewMode === 'daily') d.setDate(d.getDate() + dir);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  // ── Reusable Card Actions (Delete + Status) ──────────────────────────────
  const CardActions = ({ item }: { item: CombinedItem }) => (
    <div className="flex items-center gap-1.5 flex-wrap">
      {item.status !== 'planned' && (
        <button onClick={() => handleMoveStatus(item, 'planned')}
          className="px-2 py-1 rounded-lg bg-white/10 text-[10px] font-semibold text-slate-300 hover:text-white transition-all">
          ← To Do
        </button>
      )}
      {item.status !== 'in_progress' && (
        <button onClick={() => handleMoveStatus(item, 'in_progress')}
          className="px-2 py-1 rounded-lg bg-amber-500/20 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/30 transition-all">
          ⚡ In Progress
        </button>
      )}
      {item.status !== 'completed' && (
        <button onClick={() => handleMoveStatus(item, 'completed')}
          className="px-2 py-1 rounded-lg bg-emerald-500/20 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-all">
          ✓ Done
        </button>
      )}
      <button onClick={() => handleDelete(item)}
        className="ml-auto p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/25 hover:text-red-300 transition-all"
        title="Delete">
        <Trash2 size={13} />
      </button>
    </div>
  );

  return (
    <div className="p-3 sm:p-5 space-y-4 animate-fade-in pb-36 max-w-6xl mx-auto font-sans">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-[28px] px-4 sm:px-6 py-4 border border-white/15 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-400 flex-shrink-0">
              <CalendarIcon size={20} />
            </div>
            <h1 className="text-base sm:text-xl font-extrabold text-white tracking-tight">
              {viewMode === 'daily'
                ? currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                : `${monthName} ${year}`}
            </h1>
          </div>
          <InstallPWA />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
          {/* Nav arrows */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/15 text-white transition-all"><ChevronLeft size={16} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/15 text-xs font-extrabold text-white transition-all">Today</button>
            <button onClick={() => navigate(1)} className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/15 text-white transition-all"><ChevronRight size={16} /></button>
            <button onClick={() => openModal()} className="ml-1 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-extrabold text-white shadow-md flex items-center gap-1 transition-all">
              <Plus size={14} /> Add
            </button>
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-full border border-white/10">
            {([['daily', 'Daily', Clock], ['month', 'Month', Grid], ['todos', 'Todos', CheckSquare]] as const).map(([mode, label, Icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === mode ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                <Icon size={13} /><span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Daily Schedule View ──────────────────────────────────────────── */}
      {viewMode === 'daily' && (
        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
          className="glow-card rounded-[28px] border border-white/15 overflow-hidden bg-slate-950/90 shadow-2xl">
          <div className="divide-y divide-white/[0.06] max-h-[72vh] overflow-y-auto">
            {HOURS_24.map(({ label, hour }) => {
              const hourItems = items.filter((it) =>
                it.dateString === dailyDateStr && it.hourStart === hour
              );
              const isNow = isToday && hour === nowHour;

              return (
                <div key={label} onClick={() => openModal(dailyDateStr, hour)}
                  className={`flex items-stretch min-h-[64px] cursor-pointer group transition-all ${isNow ? 'bg-blue-600/15 border-l-4 border-l-blue-400' : 'hover:bg-white/[0.025]'}`}>

                  {/* Time label */}
                  <div className="w-[72px] p-2 text-xs font-extrabold text-slate-400 border-r border-white/10 flex flex-col items-center justify-center bg-white/[0.01] flex-shrink-0 font-mono">
                    {label}
                    {isNow && <span className="text-[9px] text-blue-400 animate-pulse mt-0.5">NOW</span>}
                  </div>

                  {/* Events */}
                  <div className="flex-1 px-2 py-1.5 flex flex-col justify-center gap-1.5">
                    {hourItems.length === 0 ? (
                      <p className="opacity-0 group-hover:opacity-100 text-[11px] text-slate-500 px-1 transition-opacity flex items-center gap-1">
                        <Plus size={11} /> Add at {label}
                      </p>
                    ) : (
                      hourItems.map((it) => (
                        <div key={it.id} onClick={(e) => e.stopPropagation()}
                          className={`p-2.5 rounded-xl border flex items-start justify-between gap-2 ${
                            it.status === 'completed' ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                            : it.type === 'activity' ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-100'
                            : 'bg-blue-600/35 border-blue-400/45 text-white'
                          }`}>
                          <div>
                            <p className={`text-xs font-extrabold ${it.status === 'completed' ? 'line-through' : ''}`}>{it.title}</p>
                            <p className="text-[10px] opacity-70 font-mono">
                              {String(it.hourStart).padStart(2,'0')}.00–{String(it.hourEnd).padStart(2,'0')}.00
                            </p>
                          </div>
                          <button onClick={() => handleDelete(it)}
                            className="p-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/25 flex-shrink-0 transition-all">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Month Grid View ──────────────────────────────────────────────── */}
      {viewMode === 'month' && (
        <div className="glow-card rounded-[28px] p-4 border border-white/15 bg-slate-950/90 shadow-2xl">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['MON','TUE','WED','THU','FRI','SAT','SUN'].map((d) => (
              <div key={d} className="text-[10px] font-extrabold text-slate-400 text-center py-1.5 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: firstDow === 0 ? 6 : firstDow - 1 }).map((_, i) => (
              <div key={`e-${i}`} className="min-h-[90px] rounded-lg bg-white/[0.01] border border-white/5 opacity-20" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const isTod = ds === localToday;
              const dayItems = items.filter((it) => it.dateString === ds);
              return (
                <div key={ds} onClick={() => openModal(ds, 9)}
                  className={`min-h-[90px] rounded-lg p-2 border cursor-pointer flex flex-col transition-all ${
                    isTod ? 'bg-blue-600/25 border-blue-400/60 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                    : 'bg-white/[0.03] border-white/10 hover:border-blue-400/40 hover:bg-white/[0.06]'
                  }`}>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md self-start ${isTod ? 'bg-blue-500 text-white' : 'text-slate-200'}`}>
                    {day}
                  </span>
                  <div className="space-y-1 mt-1.5">
                    {dayItems.slice(0,3).map((it) => (
                      <div key={it.id}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md truncate border ${
                          it.status === 'completed' ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200 line-through'
                          : it.type === 'activity' ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-100'
                          : 'bg-blue-600/35 border-blue-400/50 text-blue-100'
                        }`}>
                        {it.title}
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-[10px] text-slate-400 font-bold pl-1">+{dayItems.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Todos Kanban View (with Drag & Drop) ────────────────────────── */}
      {viewMode === 'todos' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            { status: 'planned', label: 'To Do', color: 'border-blue-400/30 bg-blue-500/10 text-blue-300' },
            { status: 'in_progress', label: 'In Progress', color: 'border-amber-400/30 bg-amber-500/10 text-amber-300' },
            { status: 'completed', label: 'Completed', color: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' },
          ] as const).map((col) => {
            const colItems = items.filter((it) => it.status === col.status);
            return (
              <div key={col.status}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.status)}
                className={`glass-card rounded-[24px] p-4 border border-white/15 min-h-[300px] flex flex-col transition-all ${
                  dragItemId ? 'ring-1 ring-blue-400/30' : ''
                }`}>
                {/* Column header */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl border mb-3 ${col.color}`}>
                  <span className="text-xs font-extrabold uppercase tracking-wider">{col.label}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/40">{colItems.length}</span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {colItems.map((item) => (
                    <div key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onDragEnd={() => setDragItemId(null)}
                      className={`glow-card rounded-xl p-3.5 border border-white/15 bg-white/[0.05] hover:bg-white/[0.08] transition-all space-y-2 cursor-grab active:cursor-grabbing ${
                        dragItemId === item.id ? 'opacity-50 scale-[0.97]' : ''
                      }`}>

                      {/* Title + GCal */}
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-bold text-white ${item.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                          {item.title}
                        </p>
                        <AddToGoogleCalendar title={item.title} description={item.description} dateString={item.dateString} />
                      </div>

                      {/* Subtasks */}
                      {item.subtasks.length > 0 && (
                        <div className="space-y-1 pt-1.5 border-t border-white/10">
                          {item.subtasks.map((st) => (
                            <div key={st.id} onClick={() => handleToggleSubtask(item, st.id)}
                              className="flex items-center gap-2 cursor-pointer group/sub">
                              {st.completed
                                ? <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                                : <Circle size={14} className="text-slate-400 group-hover/sub:text-blue-400 flex-shrink-0" />
                              }
                              <span className={`text-xs ${st.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>{st.title}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Meta */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
                        <Badge variant={item.type === 'activity' ? 'accent' : 'warning'} size="sm">
                          {item.type === 'activity' ? 'Activity' : 'Task'}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-mono">{item.dateString || '—'}</span>
                      </div>

                      {/* Actions row (status buttons + delete) */}
                      <CardActions item={item} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Schedule Modal ────────────────────────────────────────────── */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={formType === 'activity' ? 'New Activity Session' : 'New Task (Google Tasks)'}>
        <div className="space-y-3 font-sans">

          {/* Type toggle: Activity LEFT | To Do RIGHT */}
          <div className="flex gap-2 p-1 rounded-2xl bg-white/[0.05] border border-white/10">
            <button type="button" onClick={() => setFormType('activity')}
              className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all ${formType === 'activity' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
              Activity Session
            </button>
            <button type="button" onClick={() => setFormType('todo')}
              className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all ${formType === 'todo' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
              Task / To Do
            </button>
          </div>

          {/* Google Tasks category (To Do only) */}
          {formType === 'todo' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">List Category</label>
              <div className="flex flex-wrap gap-1.5">
                {(['My Tasks','Work','Shopping List','Personal'] as TaskCategory[]).map((cat) => (
                  <button key={cat} type="button" onClick={() => setFormCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      formCategory === cat ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                      : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <Input label={formType === 'activity' ? 'Activity Name' : 'Task Title'}
            placeholder={formType === 'activity' ? 'What activity session?' : 'Add a task...'}
            value={formTitle} onChange={(e) => setFormTitle(e.target.value)} autoFocus />

          {/* Date — "Due Date" for todos, "Date" for activities */}
          <Input label={formType === 'todo' ? 'Due Date' : 'Date'} type="date"
            value={formDate} onChange={(e) => setFormDate(e.target.value)} />

          {/* Start & End Time — shown for BOTH types (fix #4) */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time (24h)" type="time" value={formStartTime}
              onChange={(e) => setFormStartTime(e.target.value)} />
            <Input label="End Time (24h)" type="time" value={formEndTime}
              onChange={(e) => setFormEndTime(e.target.value)} />
          </div>

          {/* Subtasks (To Do only) */}
          {formType === 'todo' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Subtasks</label>
              {formSubtasks.length > 0 && (
                <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  {formSubtasks.map((st, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-slate-200">
                      <div className="flex items-center gap-2"><Circle size={12} className="text-slate-400" /><span>{st}</span></div>
                      <button type="button" onClick={() => setFormSubtasks((p) => p.filter((_,idx) => idx !== i))}
                        className="text-slate-500 hover:text-red-400"><X size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input placeholder="Add a subtask..." value={newSubtaskInput}
                  onChange={(e) => setNewSubtaskInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }} />
                <button type="button" onClick={addSubtask}
                  className="px-3 py-2.5 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-200 hover:bg-blue-600/50 text-xs font-bold flex items-center gap-1 flex-shrink-0">
                  <PlusCircle size={14} /> Add
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          <Input label="Notes / Details" placeholder="Add notes..."
            value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />

          {/* Buttons */}
          <div className="flex gap-3 pt-3">
            <Button variant="secondary" fullWidth onClick={() => setShowModal(false)}>Cancel</Button>
            <Button fullWidth isLoading={saving} onClick={handleSave} disabled={!formTitle.trim()}>
              {formType === 'activity' ? 'Save Activity' : 'Save Task'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
