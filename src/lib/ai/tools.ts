// Tools Jax agents can call. Server-side only; every query is scoped to the signed-in user.
import type { createServerSupabaseClient } from '@/lib/supabase/server';
import { createCalendarEvent, listCalendarEvents } from '@/lib/google-calendar';

export type Supa = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

const noArgs = { type: 'object', properties: {}, additionalProperties: false };
const range = {
  type: 'object',
  properties: { from: { type: 'string', description: 'YYYY-MM-DD' }, to: { type: 'string', description: 'YYYY-MM-DD' } },
  required: ['from', 'to'],
};

export const TOOL_DEFS: Record<string, ToolDef> = {
  list_todos: { name: 'list_todos', description: "List the user's open to-do tasks, earliest due date first.", input_schema: noArgs },
  add_todo: {
    name: 'add_todo',
    description: 'Create a new to-do task.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        due_date: { type: 'string', description: 'YYYY-MM-DD, optional' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['title'],
    },
  },
  complete_todo: {
    name: 'complete_todo',
    description: 'Mark a to-do as completed, by its id from list_todos.',
    input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  list_schedule: { name: 'list_schedule', description: 'List schedule activities between two dates (inclusive).', input_schema: range },
  add_schedule: {
    name: 'add_schedule',
    description: 'Add a schedule activity. Times are WIB (+07:00).',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        start_time: { type: 'string', description: 'HH:MM, 24h' },
        end_time: { type: 'string', description: 'HH:MM, 24h, optional' },
      },
      required: ['title', 'date', 'start_time'],
    },
  },
  calendar_list: {
    name: 'calendar_list',
    description: "List events on the user's Google Calendar between two dates (inclusive). Prefer this over list_schedule for real appointments.",
    input_schema: range,
  },
  calendar_create: {
    name: 'calendar_create',
    description: "Create an event on the user's Google Calendar. Times are WIB.",
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        start_time: { type: 'string', description: 'HH:MM, 24h' },
        end_time: { type: 'string', description: 'HH:MM, 24h, optional (default 1 hour)' },
        description: { type: 'string' },
      },
      required: ['title', 'date', 'start_time'],
    },
  },
  finance_summary: { name: 'finance_summary', description: 'Total income and expenses between two dates (inclusive).', input_schema: range },
};

export const toolsFor = (names: string[]): ToolDef[] => names.map((n) => TOOL_DEFS[n]).filter(Boolean);

export async function runTool(name: string, input: any, supabase: Supa, userId: string): Promise<unknown> {
  switch (name) {
    case 'list_todos': {
      const { data } = await supabase.from('todos').select('id,title,due_date,priority')
        .eq('user_id', userId).eq('is_completed', false).order('due_date', { nullsFirst: false }).limit(50);
      return data ?? [];
    }
    case 'add_todo': {
      const { data, error } = await supabase.from('todos').insert({
        user_id: userId,
        title: String(input.title).slice(0, 200),
        due_date: input.due_date || null,
        priority: ['low', 'medium', 'high'].includes(input.priority) ? input.priority : 'medium',
      }).select('id,title,due_date,priority').single();
      return error ? { error: error.message } : data;
    }
    case 'complete_todo': {
      const { error } = await supabase.from('todos')
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq('id', input.id).eq('user_id', userId);
      return error ? { error: error.message } : { ok: true };
    }
    case 'list_schedule': {
      const { data } = await supabase.from('work_activities').select('id,title,scheduled_at,deadline,status')
        .eq('user_id', userId)
        .gte('scheduled_at', `${input.from}T00:00:00+07:00`)
        .lte('scheduled_at', `${input.to}T23:59:59+07:00`)
        .order('scheduled_at').limit(60);
      return data ?? [];
    }
    case 'add_schedule': {
      const { data, error } = await supabase.from('work_activities').insert({
        user_id: userId,
        title: String(input.title).slice(0, 200),
        scheduled_at: `${input.date}T${input.start_time}:00+07:00`,
        deadline: input.end_time ? `${input.date}T${input.end_time}:00+07:00` : null,
      }).select('id,title,scheduled_at,deadline').single();
      return error ? { error: error.message } : data;
    }
    case 'calendar_list': {
      return listCalendarEvents(supabase, userId, `${input.from}T00:00:00+07:00`, `${input.to}T23:59:59+07:00`);
    }
    case 'calendar_create': {
      return createCalendarEvent(supabase, userId, {
        title: String(input.title).slice(0, 200),
        startISO: `${input.date}T${input.start_time}:00+07:00`,
        endISO: input.end_time ? `${input.date}T${input.end_time}:00+07:00` : undefined,
        description: input.description ? String(input.description).slice(0, 1000) : undefined,
      });
    }
    case 'finance_summary': {
      const { data } = await supabase.from('finance_transactions').select('amount,type')
        .eq('user_id', userId).gte('transaction_date', input.from).lte('transaction_date', input.to);
      let income = 0, expense = 0;
      for (const r of data ?? []) {
        if (r.type === 'income') income += Number(r.amount);
        else expense += Number(r.amount);
      }
      return { income, expense, net: income - expense, currency: 'IDR' };
    }
    default:
      return { error: 'unknown tool' };
  }
}
