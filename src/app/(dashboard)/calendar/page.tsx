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
  GripVertical,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import AddToGoogleCalendar from '@/components/ui/AddToGoogleCalendar';
import InstallPWA from '@/components/pwa/InstallPWA';

type ViewMode = 'daily' | 'month' | 'todos';
type TaskCategory = 'My Tasks' | 'Work' | 'Shopping List';

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
  subtasks: SubtaskItem[];
  isAllDay?: boolean;
  repeat?: string;
  original: Todo | WorkActivity;
}

// Hours 00–23 displayed as "00.00" – "23.00"
const HOURS = Array.from({ length: 24 }, (_, i) => ({
  label: `${String(i).padStart(2, '0')}.00`,
  hour: i,
}));

// Get local date string "YYYY-MM-DD" in user's local timezone
const localDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const todayStr = () => localDateStr(new Date());

// Parse hour from ISO datetime in LOCAL time
const localHourFromISO = (iso: string): number => {
  // "2026-07-10T08:00:00" -> hour 8 (already local if stored without Z)
  const t = iso.split('T')[1];
  if (!t) return 9;
  return parseInt(t.slice(0, 2), 10);
};

// Parse date from ISO datetime in LOCAL time
const localDateFromISO = (iso: string): string => iso.split('T')[0];

const matchesDate = (it: CombinedItem, targetDs: string) => {
  if (!it.dateString) return false;
  if (it.dateString === targetDs) return true;
  const repeat = it.repeat || 'none';
  if (repeat === 'none') return false;
  const itemDate = new Date(it.dateString);
  const targetDate = new Date(targetDs);
  if (targetDate < itemDate) return false; // recurring events start on or after origin date
  if (repeat === 'daily') return true;
  if (repeat === 'weekly') return itemDate.getDay() === targetDate.getDay();
  if (repeat === 'monthly') return itemDate.getDate() === targetDate.getDate();
  if (repeat === 'yearly') return itemDate.getDate() === targetDate.getDate() && itemDate.getMonth() === targetDate.getMonth();
  return false;
};

const computeOverlappingColumns = (dayItems: CombinedItem[]) => {
  const sorted = [...dayItems].sort((a, b) => a.hourStart - b.hourStart);
  return sorted.map((it, idx, arr) => {
    const overlapping = arr.filter(
      (other) => Math.max(it.hourStart, other.hourStart) < Math.min(it.hourEnd, other.hourEnd)
    );
    const colIdx = overlapping.findIndex((o) => o.id === it.id);
    const totalCols = Math.max(1, overlapping.length);
    return { it, colIdx: Math.max(0, colIdx), totalCols };
  });
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [items, setItems] = useState<CombinedItem[]>([]);

  // Touch swipe
  const touchStartX = useRef<number | null>(null);

  // Drag state for both daily and kanban
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);

  // Scroll ref for Daily view auto-scroll to 08.00
  const dailyScrollRef = useRef<HTMLDivElement | null>(null);

  // Modal & editing state
  const [editingItem, setEditingItem] = useState<CombinedItem | null>(null);
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
  const [formRepeat, setFormRepeat] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [formAllDay, setFormAllDay] = useState(false);
  const [formSubtasks, setFormSubtasks] = useState<string[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  const supabase = createClient();

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: todos }, { data: activities }] = await Promise.all([
      supabase.from('todos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200),
      supabase.from('work_activities').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200),
    ]);

    const combined: CombinedItem[] = [];

    (todos || []).forEach((t) => {
      let subtasks: SubtaskItem[] = [];
      let desc = t.description || '';
      let kanbanStatus: CombinedItem['status'] = t.is_completed ? 'completed' : 'planned';

      try {
        if (desc.includes('___STATUS___')) {
          const match = desc.match(/___STATUS___(planned|in_progress|completed)/);
          if (match) {
            kanbanStatus = match[1] as CombinedItem['status'];
          }
        }
        if (desc.includes('___SUBTASKS___')) {
          const match = desc.match(/___SUBTASKS___(\[.*\])/);
          if (match) {
            subtasks = JSON.parse(match[1]);
          }
        }
        desc = desc.replace(/___STATUS___[^\s_]+/g, '').replace(/___SUBTASKS___\[.*\]/g, '').trim();
      } catch { /* ignore */ }

      if (t.is_completed && kanbanStatus !== 'in_progress') kanbanStatus = 'completed';

      combined.push({
        id: `todo-${t.id}`,
        title: t.title,
        description: desc,
        dateString: t.due_date || null,
        hourStart: 8, hourEnd: 9,
        type: 'todo',
        status: kanbanStatus,
        priority: t.priority || 'medium',
        subtasks,
        original: t,
      });
    });

    (activities || []).forEach((a) => {
      let st: CombinedItem['status'] = 'planned';
      if (a.status === 'in_progress') st = 'in_progress';
      if (a.status === 'completed') st = 'completed';

      let hrStart = 9;
      let hrEnd = 10;
      let ds: string | null = null;
      if (a.scheduled_at) {
        hrStart = localHourFromISO(a.scheduled_at);
        ds = localDateFromISO(a.scheduled_at);
      } else if (a.deadline) {
        ds = localDateFromISO(a.deadline);
      }

      const meta = a.metadata as Record<string, any> | null;
      if (meta && typeof meta.hour_end === 'number') {
        hrEnd = meta.hour_end;
      } else if (a.deadline && a.scheduled_at) {
        const deadlineHr = localHourFromISO(a.deadline);
        if (deadlineHr > hrStart) hrEnd = deadlineHr;
        else hrEnd = hrStart + 1;
      } else {
        hrEnd = hrStart + 1;
      }
      if (hrEnd <= hrStart) hrEnd = hrStart + 1;

      combined.push({
        id: `act-${a.id}`,
        title: a.title,
        description: a.description || '',
        dateString: ds,
        hourStart: hrStart,
        hourEnd: hrEnd,
        type: 'activity',
        status: st,
        priority: 'high',
        subtasks: [],
        isAllDay: meta?.all_day || false,
        repeat: meta?.repeat || 'none',
        original: a,
      });
    });

    setItems(combined);
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (viewMode === 'daily' && dailyScrollRef.current) {
      dailyScrollRef.current.scrollTop = 8 * 64; // Auto-scroll to 08.00
    }
  }, [viewMode, currentDate]);

  // ── Swipe navigation ─────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) navigate(diff > 0 ? 1 : -1);
    touchStartX.current = null;
  };

  const navigate = (dir: -1 | 1) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'daily') d.setDate(d.getDate() + dir);
      else d.setMonth(d.getMonth() + dir);
      return d;
    });
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (item: CombinedItem) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    setItems((p) => p.filter((i) => i.id !== item.id));
    if (item.type === 'todo') {
      await supabase.from('todos').delete().eq('id', item.original.id);
    } else {
      await supabase.from('work_activities').delete().eq('id', item.original.id);
    }
  };

  // ── Status move ──────────────────────────────────────────────────────────
  const handleMoveStatus = async (item: CombinedItem, newStatus: CombinedItem['status']) => {
    setItems((p) => p.map((i) => i.id === item.id ? { ...i, status: newStatus } : i));
    if (item.type === 'todo') {
      let baseDesc = item.description || '';
      baseDesc = baseDesc.replace(/___STATUS___[^\s_]+/g, '').replace(/___SUBTASKS___\[.*\]/g, '').trim();

      const encodedDesc = `${baseDesc}___STATUS___${newStatus}${item.subtasks?.length ? `___SUBTASKS___${JSON.stringify(item.subtasks)}` : ''}`;
      await supabase.from('todos').update({
        is_completed: newStatus === 'completed',
        description: encodedDesc,
      }).eq('id', item.original.id);
    } else {
      await supabase.from('work_activities').update({ status: newStatus }).eq('id', item.original.id);
    }
  };

  // ── Daily drag-and-drop: move between hour slots ─────────────────────────
  const handleDailyDragStart = (e: React.DragEvent, itemId: string) => {
    setDragItemId(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleHourDragOver = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverHour(hour);
  };
  const handleHourDrop = async (e: React.DragEvent, targetHour: number, targetDate: string) => {
    e.preventDefault();
    setDragOverHour(null);
    if (!dragItemId) return;

    const item = items.find((i) => i.id === dragItemId);
    if (!item || item.type !== 'activity') { setDragItemId(null); return; }

    // Update local state immediately
    setItems((p) => p.map((i) =>
      i.id === dragItemId ? { ...i, hourStart: targetHour, hourEnd: Math.min(targetHour + 1, 23), dateString: targetDate } : i
    ));

    // Persist to DB
    const newIso = `${targetDate}T${String(targetHour).padStart(2, '0')}:00:00`;
    await supabase.from('work_activities').update({ scheduled_at: newIso }).eq('id', item.original.id);

    setDragItemId(null);
  };

  // ── Kanban drag-and-drop: move between columns ───────────────────────────
  const handleKanbanDragStart = (e: React.DragEvent, itemId: string) => {
    setDragItemId(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleKanbanDrop = async (e: React.DragEvent, targetStatus: CombinedItem['status']) => {
    e.preventDefault();
    if (!dragItemId) return;
    const item = items.find((i) => i.id === dragItemId);
    if (item && item.status !== targetStatus) await handleMoveStatus(item, targetStatus);
    setDragItemId(null);
  };

  // ── Subtask toggle ───────────────────────────────────────────────────────
  const handleToggleSubtask = async (item: CombinedItem, subtaskId: string) => {
    const updated = item.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    setItems((p) => p.map((i) => i.id === item.id ? { ...i, subtasks: updated } : i));
    if (item.type === 'todo') {
      const fullDesc = `${item.description}___STATUS___${item.status}___SUBTASKS___${JSON.stringify(updated)}`;
      await supabase.from('todos')
        .update({ description: fullDesc })
        .eq('id', item.original.id);
    }
  };

  // ── Save new item ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const dateToUse = formDate || todayStr();

    if (editingItem) {
      const orig = editingItem.original as any;
      if (formType === 'todo') {
        const fullDesc = `${formDescription}___STATUS___${editingItem.status}${editingItem.subtasks?.length ? `___SUBTASKS___${JSON.stringify(editingItem.subtasks)}` : ''}`;
        await supabase.from('todos').update({
          title: formTitle,
          description: fullDesc,
          due_date: dateToUse,
          priority: formPriority,
        }).eq('id', orig.id);
      } else {
        const startHr = formAllDay ? 0 : (parseInt(formStartTime.split(':')[0], 10) || 9);
        let endHr = formAllDay ? 24 : (parseInt(formEndTime.split(':')[0], 10) || (startHr + 1));
        if (endHr <= startHr) endHr = startHr + 1;

        const startIso = `${dateToUse}T${formAllDay ? '00:00' : formStartTime}:00`;
        const endIso = `${dateToUse}T${formAllDay ? '23:59' : formEndTime}:00`;

        await supabase.from('work_activities').update({
          title: formTitle,
          description: formDescription,
          scheduled_at: startIso,
          deadline: endIso,
          metadata: {
            ...orig.metadata,
            start_time: formStartTime,
            end_time: formEndTime,
            hour_start: startHr,
            hour_end: endHr,
            all_day: formAllDay,
            repeat: formRepeat,
          },
        }).eq('id', orig.id);
      }
    } else if (formType === 'todo') {
      const subtaskObjs = formSubtasks.map((st, i) => ({
        id: `st-${Date.now()}-${i}`, title: st, completed: false,
      }));
      const finalDesc = [
        formCategory !== 'My Tasks' ? `[${formCategory}] ` : '',
        formDescription,
        subtaskObjs.length > 0 ? `___SUBTASKS___${JSON.stringify(subtaskObjs)}` : '',
      ].join('');

      const { error } = await supabase.from('todos').insert({
        user_id: user.id, title: formTitle, description: finalDesc,
        due_date: dateToUse, priority: formPriority, is_completed: false,
      });
      if (error) console.error('Todo insert error:', error);
    } else {
      const startHr = formAllDay ? 0 : (parseInt(formStartTime.split(':')[0], 10) || 9);
      let endHr = formAllDay ? 24 : (parseInt(formEndTime.split(':')[0], 10) || (startHr + 1));
      if (endHr <= startHr) endHr = startHr + 1;

      const startIso = `${dateToUse}T${formAllDay ? '00:00' : formStartTime}:00`;
      const endIso = `${dateToUse}T${formAllDay ? '23:59' : formEndTime}:00`;

      const { error } = await supabase.from('work_activities').insert({
        user_id: user.id,
        title: formTitle,
        description: formDescription,
        activity_type: 'livestream',
        status: 'planned',
        scheduled_at: startIso,
        deadline: endIso,
        metadata: {
          start_time: formStartTime,
          end_time: formEndTime,
          hour_start: startHr,
          hour_end: endHr,
          all_day: formAllDay,
          repeat: formRepeat,
        },
      });
      if (error) console.error('Activity insert error:', error.message, error.details);
    }

    setEditingItem(null);
    setFormTitle(''); setFormDescription(''); setFormSubtasks([]);
    setSaving(false); setShowModal(false);
    await fetchAll();
  };

  const openModal = (dateStr?: string, hr?: number) => {
    setEditingItem(null);
    setFormDate(dateStr || todayStr());
    const h = hr ?? new Date().getHours();
    setFormStartTime(`${String(h).padStart(2, '0')}:00`);
    setFormEndTime(`${String(Math.min(h + 1, 23)).padStart(2, '0')}:00`);
    setFormTitle(''); setFormDescription('');
    setFormRepeat('none'); setFormAllDay(false);
    setFormSubtasks([]); setNewSubtaskInput('');
    setShowModal(true);
  };

  const openEditModal = (item: CombinedItem) => {
    setEditingItem(item);
    setFormType(item.type);
    setFormTitle(item.title);
    setFormDescription(item.description || '');
    setFormDate(item.dateString || todayStr());
    setFormStartTime(`${String(item.hourStart).padStart(2, '0')}:00`);
    setFormEndTime(`${String(item.hourEnd).padStart(2, '0')}:00`);
    const meta = (item.original as any).metadata || {};
    setFormRepeat(meta.repeat || 'none');
    setFormAllDay(meta.all_day || false);
    setShowModal(true);
  };

  const addSubtask = () => {
    if (!newSubtaskInput.trim()) return;
    setFormSubtasks((p) => [...p, newSubtaskInput.trim()]);
    setNewSubtaskInput('');
  };

  // ── Calendar computed values ─────────────────────────────────────────────
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });
  const dailyDs = localDateStr(currentDate);
  const todayDsStr = todayStr();
  const isToday = dailyDs === todayDsStr;
  const nowHour = new Date().getHours();

  // Card status action buttons
  const StatusActions = ({ item }: { item: CombinedItem }) => (
    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
      {item.type === 'todo' ? (
        <div className="flex items-center gap-1 flex-wrap">
          {item.status !== 'planned' && (
            <button onClick={(e) => { e.stopPropagation(); handleMoveStatus(item, 'planned'); }}
              className="px-2 py-1 rounded-lg bg-white/10 text-[10px] font-semibold text-slate-300 hover:text-white transition-all">← To Do</button>
          )}
          {item.status !== 'in_progress' && (
            <button onClick={(e) => { e.stopPropagation(); handleMoveStatus(item, 'in_progress'); }}
              className="px-2 py-1 rounded-lg bg-amber-500/20 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/30 transition-all">⚡ Progress</button>
          )}
          {item.status !== 'completed' && (
            <button onClick={(e) => { e.stopPropagation(); handleMoveStatus(item, 'completed'); }}
              className="px-2 py-1 rounded-lg bg-emerald-500/20 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-all">✓ Done</button>
          )}
        </div>
      ) : <div />}
      <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
        <AddToGoogleCalendar title={item.title} description={item.description} dateString={item.dateString} />
        <button onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/25 transition-all" title="Delete">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-3 sm:p-5 space-y-4 animate-fade-in pb-36 max-w-6xl mx-auto font-sans">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-[28px] px-4 sm:px-6 py-4 border border-white/15 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-400 flex-shrink-0">
              <CalendarIcon size={20} />
            </div>
            <h1 className="text-sm sm:text-xl font-extrabold text-white tracking-tight truncate">
              {viewMode === 'daily'
                ? currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                : `${monthName} ${year}`}
            </h1>
          </div>
          <InstallPWA />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/15 text-white transition-all"><ChevronLeft size={16} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/15 text-xs font-extrabold text-white">Today</button>
            <button onClick={() => navigate(1)} className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/15 text-white transition-all"><ChevronRight size={16} /></button>
            <button onClick={() => openModal()}
              className="ml-1 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-extrabold text-white shadow-md flex items-center gap-1">
              <Plus size={14} /> Add
            </button>
          </div>
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-full border border-white/10">
            {([
              ['daily', 'Daily', Clock],
              ['month', 'Month', Grid],
              ['todos', 'Todos', CheckSquare],
            ] as const).map(([mode, label, Icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === mode ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                <Icon size={13} /><span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── DAILY SCHEDULE VIEW ─────────────────────────────────────────────── */}
      {viewMode === 'daily' && (() => {
        const matchingItems = items.filter((it) => matchesDate(it, dailyDs));
        const allDayItems = matchingItems.filter((it) => it.isAllDay);
        const timedItems = matchingItems.filter((it) => !it.isAllDay);
        const layoutColumns = computeOverlappingColumns(timedItems);

        return (
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="glow-card rounded-[28px] border border-white/15 overflow-hidden bg-slate-950/90 shadow-2xl flex flex-col"
          >
            {/* All-Day Activity Banner (Google Calendar Style) */}
            {allDayItems.length > 0 && (
              <div className="p-3 bg-slate-900/90 border-b border-white/10 flex items-center gap-3">
                <span className="text-xs font-extrabold text-slate-400 uppercase w-[60px] flex-shrink-0 text-center font-mono">
                  All Day
                </span>
                <div className="flex-1 flex flex-wrap gap-2">
                  {allDayItems.map((it) => (
                    <div
                      key={it.id}
                      onClick={() => openEditModal(it)}
                      className="px-3 py-1.5 rounded-xl bg-teal-500/25 border border-teal-400/40 text-teal-100 text-xs font-extrabold cursor-pointer flex items-center gap-2 hover:bg-teal-500/40 transition-all shadow-sm"
                    >
                      <span>{it.title}</span>
                      <AddToGoogleCalendar title={it.title} description={it.description} dateString={it.dateString} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 24-Hour Timeline Grid (Auto-scrolled to 08:00 on top) */}
            <div ref={dailyScrollRef} className="relative divide-y divide-white/[0.06] max-h-[72vh] overflow-y-auto">
              {/* Background 24-Hour Slots Grid */}
              {HOURS.map(({ label, hour }) => {
                const isNow = isToday && hour === nowHour;
                const isDragTarget = dragOverHour === hour && dragItemId !== null;

                return (
                  <div
                    key={hour}
                    onDragOver={(e) => handleHourDragOver(e, hour)}
                    onDragLeave={() => setDragOverHour(null)}
                    onDrop={(e) => handleHourDrop(e, hour, dailyDs)}
                    onClick={() => openModal(dailyDs, hour)}
                    className={`flex items-stretch h-16 cursor-pointer group transition-all ${
                      isDragTarget ? 'bg-blue-500/25 border-l-4 border-l-blue-300'
                      : isNow ? 'bg-blue-600/15 border-l-4 border-l-blue-400'
                      : 'hover:bg-white/[0.025]'
                    }`}
                  >
                    {/* Time label */}
                    <div className="w-[68px] h-full flex flex-col items-center justify-center border-r border-white/10 bg-white/[0.01] flex-shrink-0">
                      <span className="text-xs font-extrabold text-slate-400 font-mono">{label}</span>
                      {isNow && <span className="text-[9px] text-blue-400 animate-pulse font-bold">NOW</span>}
                      {isDragTarget && <span className="text-[9px] text-blue-300 font-bold">DROP</span>}
                    </div>

                    {/* Clickable slot prompt */}
                    <div className="flex-1 px-3 flex items-center">
                      <p className="opacity-0 group-hover:opacity-100 text-[11px] text-slate-500 transition-opacity flex items-center gap-1">
                        <Plus size={12} /> Add at {label}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Absolute Spanning & Side-by-Side Unified Cards Overlay */}
              <div className="absolute top-0 left-[68px] right-0 bottom-0 pointer-events-none">
                {layoutColumns.map(({ it, colIdx, totalCols }) => {
                  const durationHours = Math.max(1, it.hourEnd - it.hourStart);
                  const topPx = it.hourStart * 64 + 3;
                  const heightPx = durationHours * 64 - 6;

                  // Side by side calculation for overlapping events
                  const widthPercent = 100 / totalCols;
                  const leftPercent = colIdx * widthPercent;

                  return (
                    <div
                      key={it.id}
                      draggable={it.type === 'activity'}
                      onDragStart={(e) => { e.stopPropagation(); handleDailyDragStart(e, it.id); }}
                      onDragEnd={() => { setDragItemId(null); setDragOverHour(null); }}
                      onClick={(e) => { e.stopPropagation(); openEditModal(it); }}
                      style={{
                        top: `${topPx}px`,
                        height: `${heightPx}px`,
                        left: `calc(${leftPercent}% + 6px)`,
                        width: `calc(${widthPercent}% - 12px)`,
                      }}
                      className={`absolute p-3 rounded-2xl border-l-4 border shadow-xl pointer-events-auto flex flex-col justify-between overflow-hidden transition-all cursor-pointer ${
                        dragItemId === it.id ? 'opacity-40 scale-[0.98]'
                        : it.status === 'completed'
                          ? 'bg-emerald-500/20 border-l-emerald-400 border-emerald-400/30 text-emerald-100'
                        : it.type === 'activity'
                          ? 'bg-teal-600/35 border-l-teal-400 border-teal-400/30 text-teal-50 backdrop-blur-md hover:bg-teal-600/45'
                        : 'bg-sky-500/25 border-l-sky-400 border-sky-400/30 text-sky-100 backdrop-blur-md hover:bg-sky-500/35'
                      }`}
                    >
                      {/* Top Header: Title + Notes + Delete */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {it.type === 'activity' && <GripVertical size={14} className="text-teal-300/70 flex-shrink-0" />}
                          <div className="min-w-0">
                            <p className={`text-sm font-extrabold truncate ${it.status === 'completed' ? 'line-through opacity-70' : ''}`}>
                              {it.title}
                            </p>
                            {it.description && (
                              <p className="text-[11px] opacity-80 line-clamp-1 mt-0.5">
                                {it.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(it); }}
                          className="p-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/40 transition-colors flex-shrink-0"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Bottom Footer: Status actions (for Todos) + GCal button on Bottom Right */}
                      <div className="flex items-center justify-between gap-2 pt-2 mt-auto">
                        {it.type === 'todo' ? (
                          <div className="flex items-center gap-1.5">
                            {it.status !== 'planned' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMoveStatus(it, 'planned'); }}
                                className="px-2 py-0.5 rounded bg-black/30 text-[10px] font-bold hover:bg-black/50 transition-all"
                              >
                                ← To Do
                              </button>
                            )}
                            {it.status !== 'in_progress' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMoveStatus(it, 'in_progress'); }}
                                className="px-2 py-0.5 rounded bg-amber-500/30 text-amber-200 text-[10px] font-bold hover:bg-amber-500/40 transition-all"
                              >
                                ⚡ Progress
                              </button>
                            )}
                            {it.status !== 'completed' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMoveStatus(it, 'completed'); }}
                                className="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200 text-[10px] font-bold hover:bg-emerald-500/40 transition-all"
                              >
                                ✓ Done
                              </button>
                            )}
                          </div>
                        ) : <div />}
                        <div className="ml-auto flex-shrink-0">
                          <AddToGoogleCalendar title={it.title} description={it.description} dateString={it.dateString} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MONTH GRID VIEW (Compact Google Calendar style — readable on mobile) */}
      {viewMode === 'month' && (
        <div className="glow-card rounded-[28px] p-3 border border-white/15 bg-slate-950/90 shadow-2xl">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1.5">
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <div key={`${d}-${i}`} className="text-[11px] font-extrabold text-slate-400 text-center py-1 uppercase">{d}</div>
            ))}
          </div>

          {/* Day cells — compact rows, readable event pills */}
          <div className="grid grid-cols-7 gap-px bg-white/[0.05] rounded-xl overflow-hidden border border-white/10">
            {/* Empty offset cells for first week */}
            {Array.from({ length: firstDow === 0 ? 6 : firstDow - 1 }).map((_, i) => (
              <div key={`e-${i}`} className="bg-slate-950/95 min-h-[70px]" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isTod = ds === todayDsStr;
              const dayItems = items.filter((it) => it.dateString === ds);

              return (
                <div
                  key={ds}
                  onClick={() => openModal(ds, 9)}
                  className={`relative min-h-[70px] p-1.5 cursor-pointer flex flex-col transition-all ${
                    isTod ? 'bg-blue-900/40' : 'bg-slate-950/95 hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Day number */}
                  <span className={`text-xs font-extrabold leading-none mb-1 ${
                    isTod ? 'w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px]' : 'text-slate-300'
                  }`}>
                    {day}
                  </span>

                  {/* Event pills — full width, readable text */}
                  <div className="space-y-0.5 overflow-hidden">
                    {dayItems.slice(0, 2).map((it) => (
                      <div
                        key={it.id}
                        onClick={(e) => { e.stopPropagation(); openEditModal(it); }}
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded truncate leading-tight cursor-pointer ${
                          it.status === 'completed'
                            ? 'bg-emerald-500/25 text-emerald-200'
                            : it.type === 'activity'
                            ? 'bg-teal-500/35 text-teal-100'
                            : 'bg-sky-500/35 text-sky-100'
                        }`}
                      >
                        {it.title}
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <div className="text-[9px] text-slate-400 font-bold px-1">+{dayItems.length - 2}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TODOS KANBAN VIEW (drag-drop between columns) ─────────────────── */}
      {viewMode === 'todos' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            { status: 'planned', label: 'To Do', accent: 'border-blue-400/30 bg-blue-500/10 text-blue-300' },
            { status: 'in_progress', label: 'In Progress', accent: 'border-amber-400/30 bg-amber-500/10 text-amber-300' },
            { status: 'completed', label: 'Completed', accent: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' },
          ] as const).map((col) => {
            const colItems = items.filter((it) => it.status === col.status);
            return (
              <div
                key={col.status}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={(e) => handleKanbanDrop(e, col.status)}
                className={`glass-card rounded-[24px] p-4 border border-white/15 min-h-[300px] flex flex-col transition-all ${
                  dragItemId ? 'ring-1 ring-blue-400/25' : ''
                }`}
              >
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl border mb-3 ${col.accent}`}>
                  <span className="text-xs font-extrabold uppercase tracking-wider">{col.label}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/40">{colItems.length}</span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {colItems.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleKanbanDragStart(e, item.id)}
                      onDragEnd={() => setDragItemId(null)}
                      onClick={() => openEditModal(item)}
                      className={`glow-card rounded-xl p-3.5 border border-white/15 bg-white/[0.05] hover:bg-white/[0.08] transition-all space-y-2 cursor-pointer ${
                        dragItemId === item.id ? 'opacity-50 scale-[0.97]' : ''
                      }`}
                    >
                      <div className="flex items-start gap-1.5 w-full">
                        <GripVertical size={14} className="text-slate-500 mt-0.5 flex-shrink-0" />
                        <p className={`text-sm font-bold text-white break-words ${item.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                          {item.title}
                        </p>
                      </div>

                      {/* Subtasks */}
                      {item.subtasks.length > 0 && (
                        <div className="space-y-1 pt-1.5 border-t border-white/10">
                          {item.subtasks.map((st) => (
                            <div key={st.id} onClick={() => handleToggleSubtask(item, st.id)}
                              className="flex items-center gap-2 cursor-pointer group/sub">
                              {st.completed
                                ? <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                                : <Circle size={14} className="text-slate-400 group-hover/sub:text-blue-400 flex-shrink-0" />}
                              <span className={`text-xs ${st.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>{st.title}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <Badge variant={item.type === 'activity' ? 'accent' : 'warning'} size="sm">
                          {item.type === 'activity' ? 'Activity' : 'Task'}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-mono">{item.dateString || '—'}</span>
                      </div>

                      <StatusActions item={item} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ADD MODAL ───────────────────────────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={formType === 'activity' ? 'New Activity Session' : 'New Task'}
      >
        <div className="space-y-3 font-sans">
          {/* Activity LEFT | To Do RIGHT */}
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

          {/* Task category (To Do only) */}
          {formType === 'todo' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">List Category</label>
              <div className="flex flex-wrap gap-1.5">
                {(['My Tasks', 'Work', 'Shopping List'] as TaskCategory[]).map((cat) => (
                  <button key={cat} type="button" onClick={() => setFormCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      formCategory === cat ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <Input
            label={formType === 'activity' ? 'Activity Name' : 'Task Title'}
            placeholder={formType === 'activity' ? 'What activity session?' : 'Add a task...'}
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            autoFocus
          />

          {/* Date fields — different layout per type */}
          {formType === 'activity' ? (
            <>
              {/* Activity: Date + All Day Toggle + Start/End + Repeat */}
              <Input
                label="Date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />

              <div className="flex items-center gap-2 px-1">
                <input
                  type="checkbox"
                  id="allDayCheck"
                  checked={formAllDay}
                  onChange={(e) => setFormAllDay(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-slate-900 text-teal-500 focus:ring-teal-400"
                />
                <label htmlFor="allDayCheck" className="text-xs font-bold text-slate-200 cursor-pointer">
                  All Day activity
                </label>
              </div>

              {!formAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="w-full">
                    <label className="block text-xs font-semibold text-slate-300 tracking-wide uppercase mb-1.5 ml-1">Start Time</label>
                    <select
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full bg-slate-900 border border-white/15 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono font-bold"
                    >
                      {Array.from({ length: 48 }, (_, i) => {
                        const h = Math.floor(i / 2);
                        const m = i % 2 === 0 ? '00' : '30';
                        const t = `${String(h).padStart(2, '0')}:${m}`;
                        return <option key={`start-${t}`} value={t} className="bg-slate-900 text-white">{t}</option>;
                      })}
                    </select>
                  </div>
                  <div className="w-full">
                    <label className="block text-xs font-semibold text-slate-300 tracking-wide uppercase mb-1.5 ml-1">End Time</label>
                    <select
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full bg-slate-900 border border-white/15 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono font-bold"
                    >
                      {Array.from({ length: 48 }, (_, i) => {
                        const h = Math.floor(i / 2);
                        const m = i % 2 === 0 ? '00' : '30';
                        const t = `${String(h).padStart(2, '0')}:${m}`;
                        return <option key={`end-${t}`} value={t} className="bg-slate-900 text-white">{t}</option>;
                      })}
                    </select>
                  </div>
                </div>
              )}

              {/* Repeat options */}
              <div className="w-full">
                <label className="block text-xs font-semibold text-slate-300 tracking-wide uppercase mb-1.5 ml-1">Repeat</label>
                <select
                  value={formRepeat}
                  onChange={(e) => setFormRepeat(e.target.value as any)}
                  className="w-full bg-slate-900 border border-white/15 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-400/60 transition-all font-bold"
                >
                  <option value="none" className="bg-slate-900">Do not repeat</option>
                  <option value="daily" className="bg-slate-900">Daily</option>
                  <option value="weekly" className="bg-slate-900">Weekly</option>
                  <option value="monthly" className="bg-slate-900">Monthly</option>
                  <option value="yearly" className="bg-slate-900">Yearly</option>
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Todo: Due Date + single optional time */}
              <Input
                label="Due Date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
              <div className="w-full">
                <label className="block text-xs font-semibold text-slate-300 tracking-wide uppercase mb-1.5 ml-1">Due Time (Optional)</label>
                <select
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono font-bold"
                >
                  {Array.from({ length: 48 }, (_, i) => {
                    const h = Math.floor(i / 2);
                    const m = i % 2 === 0 ? '00' : '30';
                    const t = `${String(h).padStart(2, '0')}:${m}`;
                    return <option key={`due-${t}`} value={t} className="bg-slate-900 text-white">{t}</option>;
                  })}
                </select>
              </div>
            </>
          )}

          {/* Subtasks (To Do only) */}
          {formType === 'todo' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Subtasks</label>
              {formSubtasks.length > 0 && (
                <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  {formSubtasks.map((st, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-slate-200">
                      <div className="flex items-center gap-2"><Circle size={12} className="text-slate-400" /><span>{st}</span></div>
                      <button type="button" onClick={() => setFormSubtasks((p) => p.filter((_, idx) => idx !== i))}
                        className="text-slate-500 hover:text-red-400"><X size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input placeholder="Add a subtask..."
                  value={newSubtaskInput}
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
