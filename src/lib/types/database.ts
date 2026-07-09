export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';
export type FinanceType = 'income' | 'expense';
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
    };
  };
}
