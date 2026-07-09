'use client';
import { useState, useEffect } from 'react';
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
  Sparkles,
  Edit3,
  AlignLeft,
  Calendar,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import AddToGoogleCalendar from '@/components/ui/AddToGoogleCalendar';

type ViewMode = 'week' | 'month' | 'todos';

interface CombinedItem {
  id: string;
  title: string;
  description: string;
  dateString: string | null;
  hourStart: number; // e.g. 8 for 08.00
  hourEnd: number; // e.g. 9 for 09.00
  type: 'todo' | 'activity';
  status: 'planned' | 'in_progress' | 'completed';
  priority: string;
  original: Todo | WorkActivity;
}

const HOURS = [
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
];

export default function CalendarUnifiedPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [items, setItems] = useState<CombinedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag-and-Drop state
  const [draggedItem, setDraggedItem] = useState<CombinedItem | null>(null);

  // Full Schedule Form Modal state
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formType, setFormType] = useState<'todo' | 'activity'>('todo');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('09:00');
  const [formPriority, setFormPriority] = useState('medium');

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
        combined.push({
          id: `todo-${t.id}`,
          title: t.title,
          description: t.description || '',
          dateString: t.due_date || null,
          hourStart: 9, // default 09.00
          hourEnd: 10,
          type: 'todo',
          status: t.is_completed ? 'completed' : 'planned',
          priority: t.priority || 'medium',
          original: t,
        });
      });
    }

    if (activities) {
      activities.forEach((a) => {
        let st: 'planned' | 'in_progress' | 'completed' = 'planned';
        if (a.status === 'in_progress') st = 'in_progress';
        if (a.status === 'completed') st = 'completed';

        let hrStart = 10;
        let hrEnd = 11;
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

  // Handle Drag and Drop onto Day / Hour Slot
  const handleDropSlot = async (targetDateStr: string, targetHour: number) => {
    if (!draggedItem) return;

    // Optimistically update
    setItems((prev) =>
      prev.map((it) =>
        it.id === draggedItem.id
          ? { ...it, dateString: targetDateStr, hourStart: targetHour, hourEnd: targetHour + 1 }
          : it
      )
    );

    if (draggedItem.type === 'todo') {
      const todoId = draggedItem.original.id;
      await supabase
        .from('todos')
        .update({ due_date: targetDateStr })
        .eq('id', todoId);
    } else {
      const actId = draggedItem.original.id;
      const scheduledIso = `${targetDateStr}T${String(targetHour).padStart(2, '0')}:00:00`;
      await supabase
        .from('work_activities')
        .update({ scheduled_at: scheduledIso })
        .eq('id', actId);
    }

    setDraggedItem(null);
  };

  // Status changes for Todos view
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

  // Save new schedule item (Full form with start - end | Notes)
  const handleSaveSchedule = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    if (formType === 'todo') {
      await supabase.from('todos').insert({
        user_id: user.id,
        title: formTitle,
        description: formDescription,
        due_date: formDate || new Date().toISOString().split('T')[0],
        priority: formPriority,
        is_completed: false,
      });
    } else {
      const startIso = `${formDate || new Date().toISOString().split('T')[0]}T${formStartTime}:00`;
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
    setSaving(false);
    setShowModal(false);
    fetchAllItems();
  };

  const openNewScheduleModal = (dateStr?: string, hrStart?: number) => {
    setFormDate(dateStr || new Date().toISOString().split('T')[0]);
    if (hrStart) {
      setFormStartTime(`${String(hrStart).padStart(2, '0')}:00`);
      setFormEndTime(`${String(hrStart + 1).padStart(2, '0')}:00`);
    } else {
      setFormStartTime('08:00');
      setFormEndTime('09:00');
    }
    setFormTitle('');
    setFormDescription('');
    setShowModal(true);
  };

  // Week starts Monday
  const getStartOfWeekMonday = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    return new Date(d.setDate(diff));
  };

  const startOfWeek = getStartOfWeekMonday(new Date(currentDate));
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + i);
    return dayDate;
  });

  // Month calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });

  const prevStep = () => {
    if (viewMode === 'week') {
      const prev = new Date(currentDate);
      prev.setDate(currentDate.getDate() - 7);
      setCurrentDate(prev);
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const nextStep = () => {
    if (viewMode === 'week') {
      const next = new Date(currentDate);
      next.setDate(currentDate.getDate() + 7);
      setCurrentDate(next);
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const goToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="p-3 sm:p-5 space-y-4 animate-fade-in pb-28 max-w-6xl mx-auto">
      {/* Top Header & Navigation */}
      <div className="glass-card rounded-[28px] p-4 border border-white/15 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                {viewMode === 'week'
                  ? `${weekDays[0].toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })} – ${weekDays[6].toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}`
                  : `${monthName} ${year}`}
              </h1>
              <p className="text-[11px] text-slate-400">
                24-Hour Format Schedule & Unified Todos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={prevStep}
              className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/15 text-white transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={goToday}
              className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/15 text-xs font-semibold text-white transition-all"
            >
              Today
            </button>
            <button
              onClick={nextStep}
              className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/15 text-white transition-all"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => openNewScheduleModal()}
              className="ml-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md flex items-center gap-1"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950/70 p-1.5 rounded-full border border-white/10 w-full sm:w-auto justify-center">
          <button
            onClick={() => setViewMode('week')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              viewMode === 'week'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock size={13} />
            <span>Week Schedule</span>
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              viewMode === 'month'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid size={13} />
            <span>Month Grid</span>
          </button>
          <button
            onClick={() => setViewMode('todos')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
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

      {/* 1. WEEK SCHEDULE VIEW (Monday to Sunday, 08.00 - 22.00, Drag & Drop Kanban Cards) */}
      {viewMode === 'week' && (
        <div className="glow-card rounded-[28px] border border-white/15 overflow-hidden bg-slate-950/80">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              {/* Day Headers Row (Monday to Sunday) */}
              <div className="grid grid-cols-8 border-b border-white/10 bg-white/[0.03]">
                <div className="p-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-r border-white/10 flex items-center justify-center">
                  Time (24h)
                </div>
                {weekDays.map((d) => {
                  const dateStr = d.toISOString().split('T')[0];
                  const isToday =
                    new Date().toISOString().split('T')[0] === dateStr;
                  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

                  return (
                    <div
                      key={dateStr}
                      className={`p-3 text-center border-r border-white/10 last:border-r-0 ${
                        isToday ? 'bg-blue-600/15' : ''
                      }`}
                    >
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {dayNames[d.getDay()]}
                      </div>
                      <div
                        className={`text-sm font-extrabold mt-0.5 inline-block px-2.5 py-0.5 rounded-full ${
                          isToday
                            ? 'bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.6)]'
                            : 'text-white'
                        }`}
                      >
                        {d.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hour Grid Rows (08.00 | 09.00 | 10.00 ...) */}
              <div className="divide-y divide-white/[0.06]">
                {HOURS.map(({ label, hour }) => {
                  return (
                    <div key={label} className="grid grid-cols-8 min-h-[76px]">
                      {/* Left 24-Hour Label */}
                      <div className="p-2 text-xs font-extrabold text-slate-300 border-r border-white/10 flex items-center justify-center bg-white/[0.015]">
                        {label}
                      </div>

                      {/* Day Cells for this Hour */}
                      {weekDays.map((d) => {
                        const dateStr = d.toISOString().split('T')[0];
                        const cellItems = items.filter(
                          (it) =>
                            it.dateString === dateStr &&
                            (it.hourStart === hour || (hour === 9 && !it.hourStart))
                        );

                        return (
                          <div
                            key={`${dateStr}-${hour}`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDropSlot(dateStr, hour)}
                            onClick={() => openNewScheduleModal(dateStr, hour)}
                            className="p-1.5 border-r border-white/[0.06] last:border-r-0 hover:bg-white/[0.05] transition-colors cursor-pointer flex flex-col justify-start gap-1.5 relative group"
                          >
                            {cellItems.map((it) => (
                              <div
                                key={it.id}
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  setDraggedItem(it);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className={`text-[11px] font-bold p-2 rounded-xl border shadow-md transition-transform active:scale-95 cursor-grab active:cursor-grabbing flex flex-col gap-1 ${
                                  it.status === 'completed'
                                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200 line-through'
                                    : it.type === 'activity'
                                    ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200'
                                    : 'bg-blue-600/35 border-blue-400/50 text-white'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="truncate">{it.title}</span>
                                  <span className="text-[9px] font-mono opacity-80">
                                    {String(it.hourStart).padStart(2, '0')}.00
                                  </span>
                                </div>
                                {it.description && (
                                  <p className="text-[9px] text-slate-300 truncate font-normal">
                                    {it.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MONTH GRID VIEW */}
      {viewMode === 'month' && (
        <div className="glow-card rounded-[28px] p-3 sm:p-5 border border-white/15">
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d) => (
              <div
                key={d}
                className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({
              length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1,
            }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[85px] rounded-2xl bg-white/[0.02] border border-white/5 opacity-30"
              />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(
                2,
                '0'
              )}-${String(dayNum).padStart(2, '0')}`;
              const isToday =
                new Date().toISOString().split('T')[0] === dateStr;
              const dayItems = items.filter((it) => it.dateString === dateStr);

              return (
                <div
                  key={dateStr}
                  onClick={() => openNewScheduleModal(dateStr, 9)}
                  className={`min-h-[90px] rounded-2xl p-1.5 border transition-all cursor-pointer flex flex-col justify-between ${
                    isToday
                      ? 'bg-blue-600/15 border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                      : 'bg-white/[0.04] border-white/10 hover:border-blue-400/30 hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isToday ? 'bg-blue-500 text-white' : 'text-slate-300'
                      }`}
                    >
                      {dayNum}
                    </span>
                    <Plus size={13} className="text-slate-500" />
                  </div>

                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayItems.slice(0, 3).map((it) => (
                      <div
                        key={it.id}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-lg truncate border bg-blue-500/20 border-blue-400/30 text-blue-200"
                      >
                        {it.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. TODOS VIEW (Unified Kanban / Todo List) */}
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
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedItem) {
                    handleMoveStatus(draggedItem, col.status);
                    setDraggedItem(null);
                  }
                }}
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

                <div className="space-y-2.5 flex-1">
                  {colItems.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => setDraggedItem(item)}
                      className="glow-card rounded-2xl p-3.5 border border-white/15 bg-white/[0.05] hover:bg-white/[0.08] transition-all cursor-grab active:cursor-grabbing"
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

                      {item.description && (
                        <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
                        <Badge
                          variant={item.type === 'activity' ? 'accent' : 'warning'}
                          size="sm"
                        >
                          {item.type === 'activity' ? 'Activity' : 'Task'}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.dateString || 'No Date'} •{' '}
                          {String(item.hourStart).padStart(2, '0')}.00 (24h)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-2.5">
                        {item.status !== 'planned' && (
                          <button
                            onClick={() => handleMoveStatus(item, 'planned')}
                            className="px-2 py-1 rounded-lg bg-white/10 text-[10px] font-semibold text-slate-300 hover:text-white"
                          >
                            ← To Do
                          </button>
                        )}
                        {item.status !== 'in_progress' && (
                          <button
                            onClick={() =>
                              handleMoveStatus(item, 'in_progress')
                            }
                            className="px-2 py-1 rounded-lg bg-amber-500/20 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/30"
                          >
                            ⚡ In Progress
                          </button>
                        )}
                        {item.status !== 'completed' && (
                          <button
                            onClick={() => handleMoveStatus(item, 'completed')}
                            className="px-2 py-1 rounded-lg bg-emerald-500/20 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/30"
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

      {/* COMPREHENSIVE SCHEDULE FORM MODAL (Start - End | Notes | 24-hour format) */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="New Schedule / Task (24-Hour Format)"
      >
        <div className="space-y-3.5">
          {/* Type Switcher */}
          <div className="flex gap-2 p-1 rounded-2xl bg-white/[0.05] border border-white/10">
            <button
              type="button"
              onClick={() => setFormType('todo')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                formType === 'todo'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400'
              }`}
            >
              Task / Todo
            </button>
            <button
              type="button"
              onClick={() => setFormType('activity')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                formType === 'activity'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400'
              }`}
            >
              Activity Session
            </button>
          </div>

          <Input
            label="Title / Activity Name"
            placeholder="What are you scheduling?"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            autoFocus
          />

          <Input
            label="Date (YYYY-MM-DD)"
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
          />

          {/* 24-Hour Start / End Time */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Time (24h e.g. 08:00)"
              type="time"
              value={formStartTime}
              onChange={(e) => setFormStartTime(e.target.value)}
            />
            <Input
              label="End Time (24h e.g. 09:00)"
              type="time"
              value={formEndTime}
              onChange={(e) => setFormEndTime(e.target.value)}
            />
          </div>

          <Input
            label="Notes / Description"
            placeholder="Add details, room location, or checklist..."
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
          />

          <Select
            label="Priority"
            options={[
              { label: 'Low', value: 'low' },
              { label: 'Medium', value: 'medium' },
              { label: 'High', value: 'high' },
            ]}
            value={formPriority}
            onChange={(e) => setFormPriority(e.target.value)}
          />

          <div className="flex gap-3 pt-3">
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
              Save Schedule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
