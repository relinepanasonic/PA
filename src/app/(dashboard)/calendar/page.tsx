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

const HOURS_24 = [
  { label: '01.00', hour: 1 },
  { label: '02.00', hour: 2 },
  { label: '03.00', hour: 3 },
  { label: '04.00', hour: 4 },
  { label: '05.00', hour: 5 },
  { label: '06.00', hour: 6 },
  { label: '07.00', hour: 7 },
  { label: '08.00', hour: 8 },
  { label: '09.00', hour: 9 },
  { label: '10.00', hour: 10 },
  { label: '11.00', hour: 11 },
  { label: '12.00', hour: 12 },
  { label: '13.00', hour: 13 },
  { label: '14.00', hour: 14 },
  { label: '15.00', hour: 15 },
  { label: '16.00', hour: 16 },
  { label: '17.00', hour: 17 },
  { label: '18.00', hour: 18 },
  { label: '19.00', hour: 19 },
  { label: '20.00', hour: 20 },
  { label: '21.00', hour: 21 },
  { label: '22.00', hour: 22 },
  { label: '23.00', hour: 23 },
  { label: '24.00', hour: 24 },
];

const getLocalTodayString = () => {
  const now = new Date();
  const yr = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const dy = String(now.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
};

export default function CalendarStudioPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [items, setItems] = useState<CombinedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Touch Swipe navigation state
  const touchStartX = useRef<number | null>(null);

  // Modal Form State
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

  // Subtasks in New Task Modal (Req #5: Google Tasks style subtasks)
  const [formSubtasks, setFormSubtasks] = useState<string[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  const supabase = createClient();

  const fetchAllItems = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: todos } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id);

    const { data: activities } = await supabase
      .from('work_activities')
      .select('*')
      .eq('user_id', user.id);

    const combined: CombinedItem[] = [];

    if (todos) {
      todos.forEach((t) => {
        // Parse subtasks stored in description if formatted as JSON or lines
        let parsedSubtasks: SubtaskItem[] = [];
        let cleanDesc = t.description || '';

        try {
          if (cleanDesc.includes('___SUBTASKS___')) {
            const parts = cleanDesc.split('___SUBTASKS___');
            cleanDesc = parts[0].trim();
            parsedSubtasks = JSON.parse(parts[1]);
          }
        } catch {
          // ignore parsing fallback
        }

        combined.push({
          id: `todo-${t.id}`,
          title: t.title,
          description: cleanDesc,
          dateString: t.due_date || null,
          hourStart: 8,
          hourEnd: 9,
          type: 'todo',
          status: t.is_completed ? 'completed' : 'planned',
          priority: t.priority || 'medium',
          category: 'My Tasks',
          subtasks: parsedSubtasks,
          original: t,
        });
      });
    }

    if (activities) {
      activities.forEach((a) => {
        let st: 'planned' | 'in_progress' | 'completed' = 'planned';
        if (a.status === 'in_progress') st = 'in_progress';
        if (a.status === 'completed') st = 'completed';

        let hrStart = 9;
        let hrEnd = 10;
        if (a.scheduled_at) {
          const dateObj = new Date(a.scheduled_at);
          if (!isNaN(dateObj.getHours())) {
            hrStart = dateObj.getHours();
            hrEnd = hrStart + 1;
          }
        }

        combined.push({
          id: `act-${a.id}`,
          title: a.title,
          description: a.description || '',
          dateString: a.scheduled_at
            ? a.scheduled_at.split('T')[0]
            : a.deadline
            ? a.deadline.split('T')[0]
            : null,
          hourStart: hrStart,
          hourEnd: hrEnd,
          type: 'activity',
          status: st,
          priority: 'high',
          subtasks: [],
          original: a,
        });
      });
    }

    setItems(combined);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllItems();
  }, [supabase]);

  // Touch Swipe Navigation for Daily View
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    const threshold = 50;
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        const next = new Date(currentDate);
        next.setDate(currentDate.getDate() + 1);
        setCurrentDate(next);
      } else {
        const prev = new Date(currentDate);
        prev.setDate(currentDate.getDate() - 1);
        setCurrentDate(prev);
      }
    }
    touchStartX.current = null;
  };

  const handleMoveStatus = async (
    item: CombinedItem,
    newStatus: 'planned' | 'in_progress' | 'completed'
  ) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
    );

    if (item.type === 'todo') {
      const todoId = item.original.id;
      await supabase
        .from('todos')
        .update({ is_completed: newStatus === 'completed' })
        .eq('id', todoId);
    } else {
      const actId = item.original.id;
      await supabase
        .from('work_activities')
        .update({ status: newStatus })
        .eq('id', actId);
    }
  };

  // Toggle Subtask Checkbox (Req #5)
  const handleToggleSubtask = async (item: CombinedItem, subtaskId: string) => {
    const updatedSubtasks = item.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, subtasks: updatedSubtasks } : i
      )
    );

    if (item.type === 'todo') {
      const serializedDesc = `${item.description}___SUBTASKS___${JSON.stringify(
        updatedSubtasks
      )}`;
      await supabase
        .from('todos')
        .update({ description: serializedDesc })
        .eq('id', item.original.id);
    }
  };

  const handleSaveSchedule = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const localDateToUse = formDate || getLocalTodayString();

    if (formType === 'todo') {
      const subtaskObjects = formSubtasks.map((st, i) => ({
        id: `st-${Date.now()}-${i}`,
        title: st,
        completed: false,
      }));

      const finalDesc =
        subtaskObjects.length > 0
          ? `${
              formCategory !== 'My Tasks' ? `[${formCategory}] ` : ''
            }${formDescription}___SUBTASKS___${JSON.stringify(subtaskObjects)}`
          : formCategory !== 'My Tasks'
          ? `[${formCategory}] ${formDescription}`
          : formDescription;

      await supabase.from('todos').insert({
        user_id: user.id,
        title: formTitle,
        description: finalDesc,
        due_date: localDateToUse,
        priority: formPriority,
        is_completed: false,
      });
    } else {
      const startIso = `${localDateToUse}T${formStartTime}:00`;
      await supabase.from('work_activities').insert({
        user_id: user.id,
        title: formTitle,
        description: formDescription,
        activity_type: 'livestream',
        status: 'not_started',
        scheduled_at: startIso,
      });
    }

    setFormTitle('');
    setFormDescription('');
    setFormSubtasks([]);
    setSaving(false);
    setShowModal(false);
    fetchAllItems();
  };

  const openNewScheduleModal = (dateStr?: string, hrStart?: number) => {
    setFormDate(dateStr || getLocalTodayString());
    if (hrStart) {
      setFormStartTime(`${String(hrStart).padStart(2, '0')}:00`);
      setFormEndTime(`${String(hrStart + 1).padStart(2, '0')}:00`);
    } else {
      const currentHr = new Date().getHours();
      setFormStartTime(`${String(currentHr).padStart(2, '0')}:00`);
      setFormEndTime(`${String((currentHr + 1) % 24).padStart(2, '0')}:00`);
    }
    setFormTitle('');
    setFormDescription('');
    setFormSubtasks([]);
    setNewSubtaskInput('');
    setShowModal(true);
  };

  const addSubtaskItem = () => {
    if (!newSubtaskInput.trim()) return;
    setFormSubtasks((prev) => [...prev, newSubtaskInput.trim()]);
    setNewSubtaskInput('');
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });

  const dailyDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
    currentDate.getDate()
  ).padStart(2, '0')}`;
  const localTodayStr = getLocalTodayString();
  const isToday = dailyDateStr === localTodayStr;
  const currentNowHour = new Date().getHours();

  const prevStep = () => {
    if (viewMode === 'daily') {
      const prev = new Date(currentDate);
      prev.setDate(currentDate.getDate() - 1);
      setCurrentDate(prev);
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const nextStep = () => {
    if (viewMode === 'daily') {
      const next = new Date(currentDate);
      next.setDate(currentDate.getDate() + 1);
      setCurrentDate(next);
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const goToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 animate-fade-in pb-36 max-w-6xl mx-auto font-sans">
      {/* STUDIO 2-TIER CLEAN HEADER BAR (Req #2: 100% Readable Date Title, Zero Truncation!) */}
      <div className="glass-card rounded-[28px] p-4 sm:p-6 border border-white/15 shadow-xl space-y-3.5">
        {/* Tier 1: Full Clear Date Title + Install PWA Button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-400 flex-shrink-0">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h1 className="text-base sm:text-2xl font-extrabold text-white tracking-tight">
                {viewMode === 'daily'
                  ? currentDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : `${monthName} ${year}`}
              </h1>
            </div>
          </div>
          <InstallPWA />
        </div>

        {/* Tier 2: Navigation Arrows + Today + Add + View Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            <button
              onClick={prevStep}
              className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/15 text-white transition-all"
              aria-label="Previous"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={goToday}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/15 text-xs font-extrabold text-white transition-all"
            >
              Today
            </button>
            <button
              onClick={nextStep}
              className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/15 text-white transition-all"
              aria-label="Next"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => openNewScheduleModal()}
              className="ml-1 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-extrabold text-white shadow-md flex items-center gap-1"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {/* View Switcher Pills */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-full border border-white/10">
            <button
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                viewMode === 'daily'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock size={13} />
              <span>Daily</span>
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid size={13} />
              <span>Month</span>
            </button>
            <button
              onClick={() => setViewMode('todos')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                viewMode === 'todos'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckSquare size={13} />
              <span>Todos</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. DAILY SCHEDULE VIEW */}
      {viewMode === 'daily' && (
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="glow-card rounded-[28px] border border-white/15 overflow-hidden bg-slate-950/90 shadow-2xl"
        >
          <div className="divide-y divide-white/[0.06] max-h-[720px] overflow-y-auto">
            {HOURS_24.map(({ label, hour }) => {
              const hourItems = items.filter(
                (it) =>
                  it.dateString === dailyDateStr &&
                  (it.hourStart === hour || (hour === 9 && !it.hourStart))
              );

              const isNowHour = isToday && hour === currentNowHour;

              return (
                <div
                  key={label}
                  onClick={() => openNewScheduleModal(dailyDateStr, hour)}
                  className={`flex items-stretch min-h-[66px] transition-all cursor-pointer group ${
                    isNowHour
                      ? 'bg-blue-600/15 border-l-4 border-l-blue-400 shadow-[inset_0_0_25px_rgba(59,130,246,0.2)]'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="w-20 sm:w-24 p-2.5 text-xs font-extrabold text-slate-300 border-r border-white/10 flex flex-col items-center justify-center bg-white/[0.015] flex-shrink-0 font-mono">
                    <span>{label}</span>
                    {isNowHour && (
                      <span className="text-[10px] font-extrabold text-blue-400 animate-pulse mt-0.5">
                        ● NOW
                      </span>
                    )}
                  </div>

                  <div className="flex-1 p-2 flex flex-col justify-center gap-2">
                    {hourItems.length === 0 ? (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-[11px] text-slate-500 font-medium px-2">
                        <Plus size={12} /> Click to schedule at {label}
                      </div>
                    ) : (
                      hourItems.map((it) => (
                        <div
                          key={it.id}
                          onClick={(e) => e.stopPropagation()}
                          className={`p-3 rounded-2xl border shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-transform active:scale-[0.99] ${
                            it.status === 'completed'
                              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200 line-through'
                              : it.type === 'activity'
                              ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-100'
                              : 'bg-gradient-to-r from-blue-600/45 to-indigo-600/35 border-blue-400/50 text-white shadow-[0_4px_15px_rgba(59,130,246,0.25)]'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold opacity-90">
                                {String(it.hourStart).padStart(2, '0')}.00 –{' '}
                                {String(it.hourEnd).padStart(2, '0')}.00
                              </span>
                              <Badge
                                variant={
                                  it.type === 'activity' ? 'accent' : 'warning'
                                }
                                size="sm"
                              >
                                {it.type === 'activity' ? 'Activity' : 'Task'}
                              </Badge>
                            </div>
                            <h3 className="text-sm font-extrabold tracking-tight">
                              {it.title}
                            </h3>
                          </div>

                          <AddToGoogleCalendar
                            title={it.title}
                            description={it.description}
                            dateString={it.dateString}
                          />
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

      {/* 2. MONTHLY CALENDAR GRID (Req #3: Studio Architectural RECTANGLES, NOT Ovals!) */}
      {viewMode === 'month' && (
        <div className="glow-card rounded-[32px] p-4 sm:p-6 border border-white/15 bg-slate-950/90 shadow-2xl">
          <div className="grid grid-cols-7 gap-2 text-center mb-3">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d) => (
              <div
                key={d}
                className="text-xs font-extrabold text-slate-400 uppercase tracking-wider py-1.5"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {Array.from({
              length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1,
            }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[90px] sm:min-h-[125px] rounded-lg bg-white/[0.015] border border-white/5 opacity-20"
              />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(
                2,
                '0'
              )}-${String(dayNum).padStart(2, '0')}`;
              const isTodayCell = dateStr === localTodayStr;
              const dayItems = items.filter((it) => it.dateString === dateStr);

              return (
                <div
                  key={dateStr}
                  onClick={() => openNewScheduleModal(dateStr, 9)}
                  className={`min-h-[90px] sm:min-h-[125px] rounded-lg p-2 sm:p-3 border transition-all cursor-pointer flex flex-col justify-between ${
                    isTodayCell
                      ? 'bg-blue-600/25 border-blue-400/70 shadow-[0_0_25px_rgba(59,130,246,0.35)]'
                      : 'bg-white/[0.035] border-white/10 hover:border-blue-400/40 hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-extrabold px-2.5 py-0.5 rounded-md ${
                        isTodayCell
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'text-slate-200'
                      }`}
                    >
                      {dayNum}
                    </span>
                    <Plus
                      size={14}
                      className="text-slate-500 hover:text-white transition-colors"
                    />
                  </div>

                  {/* Rectangular event badges spanning crisp width */}
                  <div className="space-y-1.5 mt-2 overflow-hidden">
                    {dayItems.slice(0, 3).map((it) => (
                      <div
                        key={it.id}
                        className={`text-[11px] sm:text-xs font-bold px-2 py-1 rounded-md truncate border block ${
                          it.status === 'completed'
                            ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200 line-through'
                            : it.type === 'activity'
                            ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-100'
                            : 'bg-blue-600/35 border-blue-400/50 text-blue-100'
                        }`}
                      >
                        <span className="truncate">{it.title}</span>
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-[10px] font-bold text-slate-400 pl-1">
                        +{dayItems.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. TODOS VIEW (Kanban Board with Google Tasks Subtasks Checklists!) */}
      {viewMode === 'todos' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(
            [
              {
                status: 'planned',
                label: 'To Do / Planned',
                color: 'border-blue-400/30 bg-blue-500/10 text-blue-300',
              },
              {
                status: 'in_progress',
                label: 'In Progress',
                color: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
              },
              {
                status: 'completed',
                label: 'Completed',
                color:
                  'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
              },
            ] as const
          ).map((col) => {
            const colItems = items.filter((it) => it.status === col.status);

            return (
              <div
                key={col.status}
                className="glass-card rounded-[28px] p-4 border border-white/15 min-h-[400px] flex flex-col"
              >
                <div
                  className={`flex items-center justify-between px-3.5 py-2 rounded-2xl border mb-3 ${col.color}`}
                >
                  <span className="text-xs font-extrabold uppercase tracking-wider">
                    {col.label}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/40">
                    {colItems.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {colItems.map((item) => (
                    <div
                      key={item.id}
                      className="glow-card rounded-2xl p-4 border border-white/15 bg-white/[0.05] hover:bg-white/[0.08] transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm font-bold text-white ${
                            item.status === 'completed'
                              ? 'line-through text-slate-400'
                              : ''
                          }`}
                        >
                          {item.title}
                        </p>
                        <AddToGoogleCalendar
                          title={item.title}
                          description={item.description}
                          dateString={item.dateString}
                        />
                      </div>

                      {/* Requirement #5: Interactive Subtasks Checklist (Google Tasks UI) */}
                      {item.subtasks && item.subtasks.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-white/10">
                          {item.subtasks.map((st) => (
                            <div
                              key={st.id}
                              onClick={() => handleToggleSubtask(item, st.id)}
                              className="flex items-center gap-2 cursor-pointer group/sub"
                            >
                              {st.completed ? (
                                <CheckCircle2
                                  size={15}
                                  className="text-emerald-400 flex-shrink-0"
                                />
                              ) : (
                                <Circle
                                  size={15}
                                  className="text-slate-400 group-hover/sub:text-blue-400 flex-shrink-0"
                                />
                              )}
                              <span
                                className={`text-xs ${
                                  st.completed
                                    ? 'line-through text-slate-500'
                                    : 'text-slate-200'
                                }`}
                              >
                                {st.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <Badge
                          variant={
                            item.type === 'activity' ? 'accent' : 'warning'
                          }
                          size="sm"
                        >
                          {item.type === 'activity' ? 'Activity' : 'Task'}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.dateString || 'No Date'}
                        </span>
                      </div>

                      {/* Requirement #4: Instant 1-tap Status Move Buttons for phone & desktop */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {item.status !== 'planned' && (
                          <button
                            onClick={() => handleMoveStatus(item, 'planned')}
                            className="px-2.5 py-1 rounded-lg bg-white/10 text-[10px] font-semibold text-slate-300 hover:text-white"
                          >
                            ← To Do
                          </button>
                        )}
                        {item.status !== 'in_progress' && (
                          <button
                            onClick={() =>
                              handleMoveStatus(item, 'in_progress')
                            }
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/30"
                          >
                            ⚡ In Progress
                          </button>
                        )}
                        {item.status !== 'completed' && (
                          <button
                            onClick={() => handleMoveStatus(item, 'completed')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/30"
                          >
                            ✓ Done
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* COMPREHENSIVE SCHEDULE & TO DO FORM MODAL WITH SUBTASKS */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={
          formType === 'activity'
            ? 'New Activity Session (24h)'
            : 'New Task & Subtasks (Google Tasks Style)'
        }
      >
        <div className="space-y-3.5 font-sans">
          <div className="flex gap-2 p-1 rounded-2xl bg-white/[0.05] border border-white/10">
            <button
              type="button"
              onClick={() => setFormType('activity')}
              className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all ${
                formType === 'activity'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Activity Session
            </button>
            <button
              type="button"
              onClick={() => setFormType('todo')}
              className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all ${
                formType === 'todo'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Task / To Do
            </button>
          </div>

          {formType === 'todo' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                List Category (Google Tasks)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    'My Tasks',
                    'Work',
                    'Shopping List',
                    'Personal',
                  ] as TaskCategory[]
                ).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      formCategory === cat
                        ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                        : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Input
            label={formType === 'activity' ? 'Activity Name' : 'Task Title'}
            placeholder={
              formType === 'activity'
                ? 'What activity session?'
                : 'Add a task...'
            }
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            autoFocus
          />

          <Input
            label="Date"
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
          />

          {/* Requirement #5: Google Tasks Subtasks Checklist Builder */}
          {formType === 'todo' && (
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-300">
                Subtasks Checklist (Google Tasks)
              </label>

              {formSubtasks.length > 0 && (
                <div className="space-y-1.5 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                  {formSubtasks.map((st, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs text-slate-200"
                    >
                      <div className="flex items-center gap-2">
                        <Circle size={13} className="text-slate-400" />
                        <span>{st}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFormSubtasks((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                        className="text-slate-500 hover:text-red-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add a subtask (e.g. Buy flip flops)..."
                  value={newSubtaskInput}
                  onChange={(e) => setNewSubtaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSubtaskItem();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addSubtaskItem}
                  className="px-3.5 py-2.5 rounded-2xl bg-blue-600/30 border border-blue-400/40 text-blue-200 hover:bg-blue-600/50 text-xs font-bold transition-all flex items-center gap-1 flex-shrink-0"
                >
                  <PlusCircle size={15} /> Add
                </button>
              </div>
            </div>
          )}

          <Input
            label="Details / Notes"
            placeholder="Add details..."
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
          />

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              isLoading={saving}
              onClick={handleSaveSchedule}
              disabled={!formTitle.trim()}
            >
              {formType === 'activity' ? 'Save Activity' : 'Save Task'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
