'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Todo, WorkActivity } from '@/lib/types/database';
import { AlertTriangle, TrendingUp, TrendingDown, Calendar, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { SkeletonDashboard } from '@/components/ui/LoadingSkeleton';
import Link from 'next/link';

interface FinanceSummary {
  total_income: number;
  total_expenses: number;
  professional_income: number;
  personal_expenses: number;
}

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
  const supabase = createClient();

  useEffect(() => {
    async function fetchDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

      // Fetch monthly finance summary
      const { data: incomeData } = await supabase
        .from('finance_transactions')
        .select('amount, tag')
        .eq('user_id', user.id)
        .eq('type', 'income')
        .gte('transaction_date', monthStart)
        .lte('transaction_date', today);

      const { data: expenseData } = await supabase
        .from('finance_transactions')
        .select('amount, tag')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('transaction_date', monthStart)
        .lte('transaction_date', today);

      const totalIncome = (incomeData || []).reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpenses = (expenseData || []).reduce((sum, t) => sum + Number(t.amount), 0);
      const professionalIncome = (incomeData || []).filter(t => t.tag === 'professional').reduce((sum, t) => sum + Number(t.amount), 0);
      const personalExpenses = (expenseData || []).filter(t => t.tag === 'personal').reduce((sum, t) => sum + Number(t.amount), 0);

      setUrgentTodos(todos || []);
      setTodaySchedule(schedule || []);
      setFinanceSummary({ total_income: totalIncome, total_expenses: totalExpenses, professional_income: professionalIncome, personal_expenses: personalExpenses });
      setLoading(false);
    }

    fetchDashboard();
  }, []);

  if (loading) return <SkeletonDashboard />;

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

  const priorityVariant = (p: string) => {
    switch(p) {
      case 'urgent': return 'danger' as const;
      case 'high': return 'warning' as const;
      default: return 'default' as const;
    }
  };

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      {/* Finance Summary Cards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-text-primary">This Month</h2>
          <Link href="/finance" className="text-xs text-accent-light flex items-center gap-0.5 hover:underline">
            Details <ChevronRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="glow-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp size={16} className="text-success" />
              </div>
              <span className="text-xs text-text-muted">Income</span>
            </div>
            <p className="text-xl font-bold text-success">{formatCurrency(financeSummary.total_income)}</p>
            <p className="text-[10px] text-text-muted mt-1">Pro: {formatCurrency(financeSummary.professional_income)}</p>
          </div>
          <div className="glow-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center">
                <TrendingDown size={16} className="text-danger" />
              </div>
              <span className="text-xs text-text-muted">Expenses</span>
            </div>
            <p className="text-xl font-bold text-danger">{formatCurrency(financeSummary.total_expenses)}</p>
            <p className="text-[10px] text-text-muted mt-1">Personal: {formatCurrency(financeSummary.personal_expenses)}</p>
          </div>
        </div>
      </section>

      {/* Urgent Tasks */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-warning" />
            <h2 className="text-base font-semibold text-text-primary">Urgent Tasks</h2>
          </div>
          <Link href="/todos" className="text-xs text-accent-light flex items-center gap-0.5 hover:underline">
            View All <ChevronRight size={14} />
          </Link>
        </div>
        {urgentTodos.length === 0 ? (
          <div className="glass-card p-4 text-center">
            <CheckCircle2 size={24} className="text-success mx-auto mb-2" />
            <p className="text-sm text-text-muted">All caught up! No urgent tasks.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {urgentTodos.map((todo) => (
              <div key={todo.id} className="glass-card p-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  todo.priority === 'urgent' ? 'bg-danger animate-pulse' :
                  todo.priority === 'high' ? 'bg-warning' : 'bg-accent'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{todo.title}</p>
                  {todo.due_date && (
                    <p className="text-[10px] text-text-muted">
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

      {/* Today's Schedule */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-accent-light" />
            <h2 className="text-base font-semibold text-text-primary">Today&apos;s Schedule</h2>
          </div>
          <Link href="/activities" className="text-xs text-accent-light flex items-center gap-0.5 hover:underline">
            View All <ChevronRight size={14} />
          </Link>
        </div>
        {todaySchedule.length === 0 ? (
          <div className="glass-card p-4 text-center">
            <Clock size={24} className="text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-muted">No activities scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todaySchedule.map((activity) => (
              <div key={activity.id} className="glass-card p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Calendar size={18} className="text-accent-light" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{activity.title}</p>
                  <p className="text-[10px] text-text-muted">
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
    </div>
  );
}
