export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';
export type FinanceType = 'income' | 'expense' | 'transfer';
export type FinanceTag = 'professional' | 'personal';
export type WorkActivityType = 'livestream' | 'campaign' | 'milestone' | 'meeting' | 'deadline' | 'other';
export type ActivityStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description: string;
  due_date: string | null;
  priority: TodoPriority;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceCategory {
  id: string;
  user_id: string;
  name: string;
  type: FinanceType;
  tag: FinanceTag;
  color: string;
  icon: string;
  created_at: string;
}

export interface FinanceTransaction {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  type: FinanceType;
  tag: FinanceTag;
  description: string;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  // Joined
  finance_categories?: FinanceCategory;
}

export interface WorkActivity {
  id: string;
  user_id: string;
  title: string;
  description: string;
  activity_type: WorkActivityType;
  scheduled_at: string | null;
  deadline: string | null;
  status: ActivityStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SportActivity {
  id: string;
  user_id: string;
  sport_type: string;
  title: string;
  description: string;
  activity_date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string;
  result: string;
  opponent: string;
  is_win: boolean | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GymSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  notes: string;
  created_at: string;
}

export interface GymSessionExercise {
  id: string;
  session_id: string;
  user_id: string;
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  weight_kg: number;
  order_index: number;
  notes: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      todos: {
        Row: Todo;
        Insert: Omit<Todo, 'id' | 'created_at' | 'updated_at' | 'completed_at'> & { id?: string };
        Update: Partial<Omit<Todo, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      finance_categories: {
        Row: FinanceCategory;
        Insert: Omit<FinanceCategory, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<FinanceCategory, 'id' | 'user_id' | 'created_at'>>;
      };
      finance_transactions: {
        Row: FinanceTransaction;
        Insert: Omit<FinanceTransaction, 'id' | 'created_at' | 'updated_at' | 'finance_categories'> & { id?: string };
        Update: Partial<Omit<FinanceTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'finance_categories'>>;
      };
      work_activities: {
        Row: WorkActivity;
        Insert: Omit<WorkActivity, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<WorkActivity, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      sport_activities: {
        Row: SportActivity;
        Insert: Omit<SportActivity, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<SportActivity, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      portfolio_stocks: {
        Row: PortfolioStock;
        Insert: Omit<PortfolioStock, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<PortfolioStock, 'id' | 'user_id' | 'created_at'>>;
      };
      gym_sessions: {
        Row: GymSession;
        Insert: Omit<GymSession, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<GymSession, 'id' | 'user_id' | 'created_at'>>;
      };
      gym_session_exercises: {
        Row: GymSessionExercise;
        Insert: Omit<GymSessionExercise, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<GymSessionExercise, 'id' | 'user_id' | 'created_at'>>;
      };
    };
  };
}

export interface PortfolioStock {
  id: string;
  user_id: string;
  ticker: string;
  buy_price: number;
  lots: number;
  created_at: string;
}
