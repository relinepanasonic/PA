'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Todo, WorkActivity } from '@/lib/types/database';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Columns,
  Grid,
  Clock,
  Plus,
  Sparkles,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import AddToGoogleCalendar from '@/components/ui/AddToGoogleCalendar';

type ViewMode = 'week' | 'month' | 'kanban';

interface CombinedItem {
  id: string;
  title: string;
  dateString: string | null;
  hourStart: number; // e.g. 9 for 09:00
  type: 'todo' | 'activity';
  status: 'planned' | 'in_progress' | 'completed';
  original: Todo | WorkActivity;
}

const HOURS = [
  '06:00 - 07:00',
  '07:00 - 08:00',
  '08:00 - 09:00',
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '12:00 - 13:00',
  '13:00 - 14:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00',
  '17:00 - 18:00',
  '18:00 - 19:00',
  '19:00 - 20:00',
  '20:00 - 21:00',
  '21:00 - 22:00',
];

export default function CalendarKanbanPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [items, setItems] = useState<CombinedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag state for Kanban
  const [draggedItem, setDraggedItem] = useState<CombinedItem | null>(null);

  // Modal for quick task creation on a specific date/hour
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');

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
          dateString: t.due_date || null,
          hourStart: 9, // default morning
          type: 'todo',
          status: t.is_completed ? 'completed' : 'planned',
          original: t,
        });
      });
    }

    if (activities) {
      activities.forEach((a) => {
        let st: 'planned' | 'in_progress' | 'completed' = 'planned';
        if (a.status === 'in_progress') st = 'in_progress';
        if (a.status === 'completed') st = 'completed';

        let hr = 10;
        if (a.scheduled_at) {
          const dateObj = new Date(a.scheduled_at);
          if (!isNaN(dateObj.getHours())) hr = dateObj.getHours();
        }

        combined.push({
          id: `act-${a.id}`,
          title: a.title,
          dateString: a.scheduled_at
            ? a.scheduled_at.split('T')[0]
            : a.deadline
            ? a.deadline.split('T')[0]
            : null,
          hourStart: hr,
          type: 'activity',
          status: st,
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

  const handleQuickCreate = async () => {
    if (!newTitle.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('todos').insert({
      user_id: user.id,
      title: newTitle,
      due_date: selectedDate || new Date().toISOString().split('T')[0],
      priority: 'medium',
      is_completed: false,
    });

    setNewTitle('');
    setShowModal(false);
    fetchAllItems();
  };

  // Week calculations
  const getStartOfWeek = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    return new Date(d.setDate(diff));
  };

  const startOfWeek = getStartOfWeek(new Date(currentDate));
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
      {/* Top Header Controls */}
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
                {viewMode === 'week' ? 'Weekly Time-Block Schedule' : 'Calendar & Kanban Sync'}
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
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              viewMode === 'kanban'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns size={13} />
            <span>Kanban Board</span>
          </button>
        </div>
      </div>

      {/* 1. WEEKLY TIME-BLOCK SCHEDULE VIEW (Hours on Left, Days on Top) */}
      {viewMode === 'week' && (
        <div className="glow-card rounded-[28px] border border-white/15 overflow-hidden bg-slate-950/80">
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Day Headers Row */}
              <div className="grid grid-cols-8 border-b border-white/10 bg-white/[0.02]">
                <div className="p-3 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider border-r border-white/10">
                  Time / Sesi
                </div>
                {weekDays.map((d, idx) => {
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
                        className={`text-sm font-extrabold mt-0.5 inline-block px-2 py-0.5 rounded-full ${
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

              {/* Hour Grid Rows */}
              <div className="divide-y divide-white/[0.06]">
                {HOURS.map((hrLabel, hIdx) => {
                  const currentHourNum = 6 + hIdx;

                  return (
                    <div key={hrLabel} className="grid grid-cols-8 min-h-[70px]">
                      {/* Left Hour Label */}
                      <div className="p-2 text-[11px] font-bold text-slate-400 border-r border-white/10 flex items-center justify-center bg-white/[0.01]">
                        {hrLabel}
                      </div>

                      {/* Day Cells for this Hour */}
                      {weekDays.map((d) => {
                        const dateStr = d.toISOString().split('T')[0];
                        const cellItems = items.filter(
                          (it) =>
                            it.dateString === dateStr &&
                            (it.hourStart === currentHourNum ||
                              (currentHourNum === 9 && !it.hourStart))
                        );

                        return (
                          <div
                            key={`${dateStr}-${currentHourNum}`}
                            onClick={() => {
                              setSelectedDate(dateStr);
                              setShowModal(true);
                            }}
                            className="p-1 border-r border-white/[0.06] last:border-r-0 hover:bg-white/[0.04] transition-colors cursor-pointer flex flex-col justify-start gap-1 relative group"
                          >
                            {cellItems.map((it) => (
                              <div
                                key={it.id}
                                onClick={(e) => e.stopPropagation()}
                                className={`text-[11px] font-bold px-2 py-1.5 rounded-xl border truncate shadow-sm flex items-center justify-between ${
                                  it.status === 'completed'
                                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200 line-through'
                                    : it.type === 'activity'
                                    ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200'
                                    : 'bg-blue-600/30 border-blue-400/40 text-blue-100'
                                }`}
                              >
                                <span className="truncate">{it.title}</span>
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
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
              <div
                key={d}
                className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[75px] sm:min-h-[100px] rounded-2xl bg-white/[0.02] border border-white/5 opacity-30"
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
                  onClick={() => {
                    setSelectedDate(dateStr);
                    setShowModal(true);
                  }}
                  className={`min-h-[85px] sm:min-h-[110px] rounded-2xl p-1.5 sm:p-2 border transition-all cursor-pointer flex flex-col justify-between ${
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(dateStr);
                        setShowModal(true);
                      }}
                      className="text-slate-500 hover:text-white"
                      title="Add task to this date"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="space-y-1 mt-1.5 overflow-hidden">
                    {dayItems.slice(0, 3).map((it) => (
                      <div
                        key={it.id}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-lg truncate border flex items-center justify-between ${
                          it.status === 'completed'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 line-through'
                            : it.type === 'activity'
                            ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                            : 'bg-blue-500/20 border-blue-400/30 text-blue-200'
                        }`}
                      >
                        <span className="truncate">{it.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. KANBAN BOARD VIEW */}
      {viewMode === 'kanban' && (
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
                          dateString={item.dateString}
                        />
                      </div>

                      <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-white/10">
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

      {/* Quick Add Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Add Task for ${selectedDate}`}
      >
        <Input
          label="Task Title"
          placeholder="What needs to be done?"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          autoFocus
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
            onClick={handleQuickCreate}
            disabled={!newTitle.trim()}
          >
            Save to Calendar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
