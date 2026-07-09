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
  Plus,
  CheckCircle2,
  Clock,
  Briefcase,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import AddToGoogleCalendar from '@/components/ui/AddToGoogleCalendar';

type ViewMode = 'month' | 'kanban';

interface CombinedItem {
  id: string;
  title: string;
  dateString: string | null;
  type: 'todo' | 'activity';
  status: 'planned' | 'in_progress' | 'completed';
  original: Todo | WorkActivity;
}

export default function CalendarKanbanPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [items, setItems] = useState<CombinedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag state for Kanban
  const [draggedItem, setDraggedItem] = useState<CombinedItem | null>(null);

  // Modal for quick task creation on a specific date
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

        combined.push({
          id: `act-${a.id}`,
          title: a.title,
          dateString: a.scheduled_at ? a.scheduled_at.split('T')[0] : a.deadline ? a.deadline.split('T')[0] : null,
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

  // Update status (Kanban drop / tap move)
  const handleMoveStatus = async (item: CombinedItem, newStatus: 'planned' | 'in_progress' | 'completed') => {
    // Optimistic UI update
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

  // Quick create on a date
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

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  const goToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="p-4 space-y-5 animate-fade-in pb-28">
      {/* Top Google Calendar Dark Mode Header */}
      <div className="glass-card rounded-[28px] p-4.5 border border-white/15 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-white tracking-tight">
                {monthName} {year}
              </h1>
              <p className="text-[11px] text-slate-400">Google Calendar & Kanban Sync</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/15 text-white transition-all"
              title="Previous Month"
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
              onClick={nextMonth}
              className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/15 text-white transition-all"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-2 bg-slate-950/60 p-1.5 rounded-full border border-white/10 w-full sm:w-auto justify-center">
          <button
            onClick={() => setViewMode('month')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              viewMode === 'month'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid size={14} />
            <span>Calendar</span>
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              viewMode === 'kanban'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns size={14} />
            <span>Kanban Board</span>
          </button>
        </div>
      </div>

      {/* MONTH GRID VIEW */}
      {viewMode === 'month' && (
        <div className="glow-card rounded-[28px] p-3 sm:p-5 border border-white/15">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
              <div key={d} className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[75px] sm:min-h-[100px] rounded-2xl bg-white/[0.02] border border-white/5 opacity-30" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
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

                  {/* Rendered Block Cards */}
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
                    {dayItems.length > 3 && (
                      <div className="text-[9px] font-bold text-slate-400 text-center">
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

      {/* KANBAN BOARD VIEW (DRAG & DROP + TOUCH MOVE) */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(
            [
              { status: 'planned', label: 'To Do / Planned', color: 'border-blue-400/30 bg-blue-500/10 text-blue-300' },
              { status: 'in_progress', label: 'In Progress', color: 'border-amber-400/30 bg-amber-500/10 text-amber-300' },
              { status: 'completed', label: 'Completed', color: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' },
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
                {/* Kanban Column Title Header */}
                <div className={`flex items-center justify-between px-3.5 py-2 rounded-2xl border mb-3 ${col.color}`}>
                  <span className="text-xs font-extrabold uppercase tracking-wider">{col.label}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/40">
                    {colItems.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="space-y-2.5 flex-1">
                  {colItems.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => setDraggedItem(item)}
                      className="glow-card rounded-2xl p-3.5 border border-white/15 bg-white/[0.05] hover:bg-white/[0.08] transition-all cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-bold text-white ${item.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                          {item.title}
                        </p>
                        <AddToGoogleCalendar
                          title={item.title}
                          dateString={item.dateString}
                        />
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
                        <Badge variant={item.type === 'activity' ? 'accent' : 'warning'} size="sm">
                          {item.type === 'activity' ? 'Activity' : 'Task'}
                        </Badge>
                        {item.dateString && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {item.dateString}
                          </span>
                        )}
                      </div>

                      {/* Quick Mobile Touch Mover Buttons */}
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
                            onClick={() => handleMoveStatus(item, 'in_progress')}
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
          placeholder="What needs to be done on this day?"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          autoFocus
        />
        <div className="flex gap-3 pt-4">
          <Button variant="secondary" fullWidth onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button fullWidth onClick={handleQuickCreate} disabled={!newTitle.trim()}>
            Save to Calendar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
