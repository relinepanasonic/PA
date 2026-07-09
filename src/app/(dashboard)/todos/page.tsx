'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Todo, TodoPriority } from '@/lib/types/database';
import { Plus, CheckSquare, Search, Calendar, Flag, Trash2, Edit3 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import AddToGoogleCalendar from '@/components/ui/AddToGoogleCalendar';
import { SkeletonList } from '@/components/ui/LoadingSkeleton';

const PAGE_SIZE = 20;

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const sortOptions = [
  { value: 'due_date', label: 'Due Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'created_at', label: 'Created' },
];

const priorityVariant = (p: TodoPriority) => {
  const map = { urgent: 'danger', high: 'warning', medium: 'accent', low: 'muted' } as const;
  return map[p];
};

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sortBy, setSortBy] = useState('due_date');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [search, setSearch] = useState('');
  
  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formPriority, setFormPriority] = useState<TodoPriority>('medium');
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from('todos')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    if (filter === 'active') query = query.eq('is_completed', false);
    if (filter === 'completed') query = query.eq('is_completed', true);
    if (search) query = query.ilike('title', `%${search}%`);

    // Sort
    if (sortBy === 'due_date') {
      query = query.order('due_date', { ascending: true, nullsFirst: false });
    } else if (sortBy === 'priority') {
      query = query.order('priority', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, count } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    setTodos(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [filter, sortBy, page, search]);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  const openCreate = () => {
    setEditingTodo(null);
    setFormTitle('');
    setFormDescription('');
    setFormDueDate('');
    setFormPriority('medium');
    setShowModal(true);
  };

  const openEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setFormTitle(todo.title);
    setFormDescription(todo.description || '');
    setFormDueDate(todo.due_date || '');
    setFormPriority(todo.priority);
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingTodo) {
      await supabase
        .from('todos')
        .update({
          title: formTitle,
          description: formDescription,
          due_date: formDueDate || null,
          priority: formPriority,
        })
        .eq('id', editingTodo.id);
    } else {
      await supabase.from('todos').insert({
        user_id: user.id,
        title: formTitle,
        description: formDescription,
        due_date: formDueDate || null,
        priority: formPriority,
        is_completed: false,
      });
    }

    setSaving(false);
    setShowModal(false);
    fetchTodos();
  };

  const toggleComplete = async (todo: Todo) => {
    const now = new Date().toISOString();
    await supabase
      .from('todos')
      .update({
        is_completed: !todo.is_completed,
        completed_at: !todo.is_completed ? now : null,
      })
      .eq('id', todo.id);
    fetchTodos();
  };

  const deleteTodo = async (id: string) => {
    await supabase.from('todos').delete().eq('id', id);
    fetchTodos();
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Tasks</h1>
        <Button onClick={openCreate} size="sm">
          <Plus size={16} /> Add
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search tasks..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        icon={<Search size={16} />}
      />

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'active', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(0); }}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === f
                ? 'bg-accent/20 text-accent-light border border-accent/30'
                : 'bg-surface-light text-text-muted border border-transparent hover:text-text-secondary'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div className="ml-auto">
          <Select
            options={sortOptions}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          />
        </div>
      </div>

      {/* Todo List */}
      {loading ? (
        <SkeletonList count={5} />
      ) : todos.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={filter === 'completed' ? 'No completed tasks' : 'No tasks yet'}
          description={filter === 'completed' ? 'Complete some tasks to see them here.' : 'Create your first task to get started.'}
          actionLabel={filter !== 'completed' ? 'Add Task' : undefined}
          onAction={filter !== 'completed' ? openCreate : undefined}
        />
      ) : (
        <div className="space-y-2">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className={`glass-card p-3 flex items-start gap-3 transition-all ${
                todo.is_completed ? 'opacity-60' : ''
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleComplete(todo)}
                className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  todo.is_completed
                    ? 'bg-success border-success text-white'
                    : 'border-text-muted hover:border-accent'
                }`}
              >
                {todo.is_completed && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0" onClick={() => openEdit(todo)}>
                <p className={`text-sm font-medium truncate ${
                  todo.is_completed ? 'line-through text-text-muted' : 'text-text-primary'
                }`}>
                  {todo.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {todo.due_date && (
                    <span className={`text-[10px] flex items-center gap-1 ${
                      isOverdue(todo.due_date) && !todo.is_completed ? 'text-danger' : 'text-text-muted'
                    }`}>
                      <Calendar size={10} />
                      {new Date(todo.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <Badge variant={priorityVariant(todo.priority)} size="sm">
                    {todo.priority}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <AddToGoogleCalendar
                  title={todo.title}
                  description={todo.description || ''}
                  dateString={todo.due_date}
                />
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingTodo ? 'Edit Task' : 'New Task'}
      >
        <div className="space-y-4">
          <Input
            id="todo-title"
            label="Title"
            placeholder="What needs to be done?"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            icon={<Edit3 size={16} />}
          />
          <Input
            id="todo-desc"
            label="Description"
            placeholder="Add details (optional)"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
          />
          <Input
            id="todo-date"
            type="date"
            label="Due Date"
            value={formDueDate}
            onChange={(e) => setFormDueDate(e.target.value)}
            icon={<Calendar size={16} />}
          />
          <Select
            id="todo-priority"
            label="Priority"
            options={priorityOptions}
            value={formPriority}
            onChange={(e) => setFormPriority(e.target.value as TodoPriority)}
          />
          <div className="flex gap-3 pt-4 pb-2 border-t border-white/10 mt-4">
            <Button variant="secondary" fullWidth onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button fullWidth isLoading={saving} onClick={handleSave} disabled={!formTitle.trim()}>
              {editingTodo ? 'Update Task' : 'Save Task'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
