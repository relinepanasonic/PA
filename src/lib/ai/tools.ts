// Tools Jax agents can call. Server-side only; every query is scoped to the signed-in user.
import type { createServerSupabaseClient } from '@/lib/supabase/server';
import { createCalendarEvent, listCalendarEvents } from '@/lib/google-calendar';
import { getHealthDay, wibDate } from '@/lib/health';
import { fetchChart, fetchFundamentals, marketOverview, screenWatchlist, stockNews, technicals, toJK } from '@/lib/stocks';

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
  fitbit_day: {
    name: 'fitbit_day',
    description: "Fitbit data for one day: steps, lowest heart rate and sleep (sleep counts on the day the user woke up). Default is today (WIB).",
    input_schema: { type: 'object', properties: { date: { type: 'string', description: 'YYYY-MM-DD, optional' } } },
  },
  fitbit_recent: {
    name: 'fitbit_recent',
    description: 'Fitbit steps, lowest heart rate and sleep for each of the last N days (max 7), newest first, to see a trend.',
    input_schema: { type: 'object', properties: { days: { type: 'number' } } },
  },
  gym_recent: {
    name: 'gym_recent',
    description: "The user's recent gym sessions with exercises, sets, reps and weight, for the last N days (default 14).",
    input_schema: { type: 'object', properties: { days: { type: 'number' } } },
  },
  list_meals: {
    name: 'list_meals',
    description: 'Meals the user logged between two dates (inclusive).',
    input_schema: range,
  },
  add_meal: {
    name: 'add_meal',
    description: 'Log a meal the user ate. Estimate calories/protein only if the user asked for an estimate.',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack', 'meal'] },
        calories: { type: 'number' },
        protein_g: { type: 'number' },
      },
      required: ['description'],
    },
  },
  market_overview: {
    name: 'market_overview',
    description: 'IHSG (Jakarta Composite) and USD/IDR: price, change today and over one month.',
    input_schema: noArgs,
  },
  stock_screen: {
    name: 'stock_screen',
    description: 'Technical scan of 20 liquid IDX stocks (LQ45 names). Returns the most bullish and the weakest with trend, RSI, support, resistance and volume.',
    input_schema: noArgs,
  },
  stock_technicals: {
    name: 'stock_technicals',
    description: 'Live price, technical indicators and fundamentals for specific IDX tickers (e.g. BBCA, TLKM): trend, SMA20/50, RSI14, support, resistance, 52-week range, volume vs average, plus PER, forward PER, PBV, dividend yield, ROE and EPS when available.',
    input_schema: { type: 'object', properties: { tickers: { type: 'array', items: { type: 'string' }, maxItems: 6 } }, required: ['tickers'] },
  },
  stock_news: {
    name: 'stock_news',
    description: 'Latest news headlines (Google News Indonesia) for a stock, sector or topic. Example: "BBCA saham" or "harga batubara".',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
  portfolio_list: {
    name: 'portfolio_list',
    description: "The user's stock portfolio with buy price, lots, current price and profit/loss. 1 lot = 100 shares.",
    input_schema: noArgs,
  },
  past_picks: {
    name: 'past_picks',
    description: 'Recent BUY/SELL/HOLD ideas saved earlier with their entry price and the current price, to check the track record.',
    input_schema: noArgs,
  },
  save_pick: {
    name: 'save_pick',
    description: 'Save one final BUY, SELL or HOLD recommendation (with entry, target and stop prices in rupiah) to the track record.',
    input_schema: {
      type: 'object',
      properties: {
        ticker: { type: 'string' },
        action: { type: 'string', enum: ['BUY', 'SELL', 'HOLD'] },
        entry_price: { type: 'number' },
        target_price: { type: 'number' },
        stop_price: { type: 'number' },
        rationale: { type: 'string', description: 'One or two sentences.' },
      },
      required: ['ticker', 'action', 'entry_price', 'rationale'],
    },
  },
  finance_categories: {
    name: 'finance_categories',
    description: "List the user's income and expense categories (name, type, tag). Call this before add_transaction if you are unsure which category fits.",
    input_schema: noArgs,
  },
  add_transaction: {
    name: 'add_transaction',
    description:
      'Record ONE income or expense. amount is in rupiah as a plain number (50rb = 50000, 1,5jt = 1500000). For a receipt record the total as one transaction. ' +
      'Pick the closest category name from finance_categories; if none fits use Other. Default date is today (WIB).',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['income', 'expense'] },
        amount: { type: 'number' },
        description: { type: 'string', description: 'Short, e.g. "Makan siang di Warteg" or "Gaji Oktober".' },
        category: { type: 'string', description: 'A category name, optional.' },
        date: { type: 'string', description: 'YYYY-MM-DD, optional' },
        account: { type: 'string', description: 'Bank or wallet name, e.g. "Blu by BCA" or "Cash". Optional.' },
        tag: { type: 'string', enum: ['personal', 'professional'], description: 'Optional, default personal.' },
      },
      required: ['type', 'amount', 'description'],
    },
  },
  list_transactions: {
    name: 'list_transactions',
    description: 'List recent transactions between two dates (inclusive), newest first, with their ids.',
    input_schema: range,
  },
  delete_transaction: {
    name: 'delete_transaction',
    description: 'Delete one transaction by id (use to undo a wrong entry the user asked to remove).',
    input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  savings_summary: {
    name: 'savings_summary',
    description: "The user's Blu accounts and saving pockets (Tabungan): ending balance per pocket for the latest month and the month before, with total. Use it for questions about savings.",
    input_schema: noArgs,
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
    case 'add_schedule':
    case 'calendar_create':
      return addScheduleEverywhere(input, supabase, userId);
    case 'calendar_list': {
      return listCalendarEvents(supabase, userId, `${input.from}T00:00:00+07:00`, `${input.to}T23:59:59+07:00`);
    }
    case 'fitbit_day':
      return getHealthDay(supabase, userId, typeof input.date === 'string' && input.date ? input.date : undefined);
    case 'fitbit_recent': {
      const n = Math.min(Math.max(Number(input.days) || 5, 1), 7);
      const out = [];
      for (let i = 0; i < n; i++) out.push(await getHealthDay(supabase, userId, wibDate(new Date(Date.now() - i * 86400000))));
      return out;
    }
    case 'gym_recent': {
      const since = new Date(Date.now() - (Number(input.days) || 14) * 86400000).toISOString();
      const { data: sessions } = await supabase.from('gym_sessions')
        .select('id,started_at,duration_minutes,notes').eq('user_id', userId).gte('started_at', since).order('started_at', { ascending: false }).limit(20);
      const ids = (sessions ?? []).map((s: any) => s.id);
      const { data: ex } = ids.length
        ? await supabase.from('gym_session_exercises').select('session_id,exercise_name,sets,reps,weight_kg').in('session_id', ids).order('order_index')
        : { data: [] as any[] };
      return (sessions ?? []).map((s: any) => ({ ...s, exercises: (ex ?? []).filter((e: any) => e.session_id === s.id).map(({ session_id, ...rest }: any) => rest) }));
    }
    case 'list_meals': {
      const { data } = await supabase.from('meal_logs').select('id,eaten_at,meal_type,description,calories,protein_g')
        .eq('user_id', userId)
        .gte('eaten_at', `${input.from}T00:00:00+07:00`).lte('eaten_at', `${input.to}T23:59:59+07:00`)
        .order('eaten_at').limit(60);
      return data ?? [];
    }
    case 'add_meal': {
      const { data, error } = await supabase.from('meal_logs').insert({
        user_id: userId,
        description: String(input.description).slice(0, 300),
        meal_type: ['breakfast', 'lunch', 'dinner', 'snack', 'meal'].includes(input.meal_type) ? input.meal_type : 'meal',
        calories: Number.isFinite(Number(input.calories)) && input.calories != null ? Math.round(Number(input.calories)) : null,
        protein_g: Number.isFinite(Number(input.protein_g)) && input.protein_g != null ? Number(input.protein_g) : null,
      }).select('id,eaten_at,meal_type,description,calories').single();
      return error ? { error: error.message } : data;
    }
    case 'market_overview':
      return marketOverview();
    case 'stock_screen':
      return screenWatchlist();
    case 'stock_technicals': {
      const list = (Array.isArray(input.tickers) ? input.tickers : []).slice(0, 6) as string[];
      const [charts, funds] = await Promise.all([Promise.all(list.map((t) => fetchChart(t))), Promise.all(list.map((t) => fetchFundamentals(t)))]);
      return charts.map((c, i) => (c ? { ...technicals(c), fundamentals: funds[i] ?? 'not available' } : { ticker: list[i], error: 'no data' }));
    }
    case 'stock_news':
      return stockNews(String(input.query).slice(0, 100));
    case 'portfolio_list': {
      const { data } = await supabase.from('portfolio_stocks').select('ticker,buy_price,lots').eq('user_id', userId);
      const rows = (data ?? []) as { ticker: string; buy_price: number; lots: number }[];
      const charts = await Promise.all(rows.map((r) => fetchChart(r.ticker, '5d')));
      return rows.map((r, i) => {
        const price = charts[i]?.price ?? null;
        const cost = Number(r.buy_price) * Number(r.lots) * 100;
        return {
          ticker: r.ticker.replace('.JK', ''), lots: r.lots, buyPrice: Number(r.buy_price), price: price ? Math.round(price) : null,
          profitLossPct: price ? Math.round((price / Number(r.buy_price) - 1) * 1000) / 10 : null,
          profitLossRp: price ? Math.round(price * Number(r.lots) * 100 - cost) : null,
        };
      });
    }
    case 'past_picks': {
      const { data } = await supabase.from('stock_picks').select('pick_date,ticker,action,entry_price,target_price,stop_price,rationale')
        .eq('user_id', userId).order('pick_date', { ascending: false }).limit(15);
      const rows = (data ?? []) as any[];
      const charts = await Promise.all(rows.map((r) => fetchChart(r.ticker, '5d')));
      return rows.map((r, i) => ({ ...r, currentPrice: charts[i] ? Math.round(charts[i]!.price) : null,
        sinceEntryPct: charts[i] ? Math.round((charts[i]!.price / Number(r.entry_price) - 1) * 1000) / 10 : null }));
    }
    case 'save_pick': {
      const today = wibDate();
      const ticker = toJK(String(input.ticker)).replace('.JK', '');
      const { data: dup } = await supabase.from('stock_picks').select('id').eq('user_id', userId).eq('pick_date', today).eq('ticker', ticker).eq('action', input.action).limit(1);
      if (dup?.length) return { ok: true, note: 'already saved today' };
      const { error } = await supabase.from('stock_picks').insert({
        user_id: userId, pick_date: today, ticker, action: input.action, entry_price: Number(input.entry_price),
        target_price: input.target_price ? Number(input.target_price) : null,
        stop_price: input.stop_price ? Number(input.stop_price) : null,
        rationale: String(input.rationale).slice(0, 400),
      });
      return error ? { error: error.message } : { ok: true };
    }
    case 'finance_categories': {
      const { data } = await supabase.from('finance_categories').select('name,type,tag').eq('user_id', userId).order('name');
      return data ?? [];
    }
    case 'add_transaction': {
      const amount = Number(input.amount);
      if (!Number.isFinite(amount) || amount <= 0) return { error: 'amount must be a positive number' };
      const type = input.type === 'income' ? 'income' : 'expense';
      const { data: cats } = await supabase.from('finance_categories').select('id,name,type,tag').eq('user_id', userId).eq('type', type);
      const want = String(input.category || '').toLowerCase().trim();
      const cat = (cats ?? []).find((c: any) => c.name.toLowerCase() === want)
        ?? (want ? (cats ?? []).find((c: any) => c.name.toLowerCase().includes(want) || want.includes(c.name.toLowerCase())) : undefined)
        ?? (cats ?? []).find((c: any) => c.name.toLowerCase().includes('other'));
      const account = String(input.account || 'Blu by BCA').slice(0, 40);
      const desc = String(input.description).replace(/^\[.*?\]\s*/, '').slice(0, 200);
      const { data, error } = await supabase.from('finance_transactions').insert({
        user_id: userId,
        type,
        amount,
        tag: input.tag === 'professional' ? 'professional' : (cat?.tag === 'professional' ? 'professional' : 'personal'),
        category_id: cat?.id ?? null,
        description: `[${account}] ${desc}`,
        transaction_date: typeof input.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : wibDate(),
      }).select('id,type,amount,description,transaction_date').single();
      return error ? { error: error.message } : { saved: data, category: cat?.name ?? '(none)' };
    }
    case 'list_transactions': {
      const { data } = await supabase.from('finance_transactions').select('id,type,amount,description,transaction_date,finance_categories(name)')
        .eq('user_id', userId).gte('transaction_date', input.from).lte('transaction_date', input.to)
        .order('transaction_date', { ascending: false }).order('created_at', { ascending: false }).limit(40);
      return data ?? [];
    }
    case 'delete_transaction': {
      const { error } = await supabase.from('finance_transactions').delete().eq('id', input.id).eq('user_id', userId);
      return error ? { error: error.message } : { ok: true };
    }
    case 'savings_summary': {
      const { data: pk } = await supabase.from('savings_pockets').select('id,name,kind,target_amount').eq('user_id', userId);
      const { data: sn } = await supabase.from('savings_snapshots').select('pocket_id,period,income,expense,ending').eq('user_id', userId).order('period', { ascending: false }).limit(200);
      const periods = Array.from(new Set((sn ?? []).map((s: any) => s.period as string))).slice(0, 2);
      if (!periods.length) return { error: 'No savings report uploaded yet. Ask Nico to upload the Blu portfolio PDF on Finance > Tabungan.' };
      const name = new Map((pk ?? []).map((p: any) => [p.id, p]));
      const view = (per: string) => {
        const rows = (sn ?? []).filter((s: any) => s.period === per).map((s: any) => ({
          pocket: name.get(s.pocket_id)?.name, kind: name.get(s.pocket_id)?.kind, ending: Number(s.ending),
          moneyIn: Number(s.income), moneyOut: Number(s.expense), target: name.get(s.pocket_id)?.target_amount ?? null,
        }));
        return { month: per.slice(0, 7), total: rows.reduce((t: number, r: any) => t + r.ending, 0), rows };
      };
      return { latest: view(periods[0]), previous: periods[1] ? view(periods[1]) : null, note: 'moneyIn/moneyOut of a pocket are mostly moves to and from bluAccount, not real income or spending.' };
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

/** One call puts the event in the app's own schedule AND on Google Calendar (when connected), without duplicates. */
async function addScheduleEverywhere(input: any, supabase: Supa, userId: string) {
  const title = String(input.title).slice(0, 200);
  const startISO = `${input.date}T${input.start_time}:00+07:00`;
  const endISO = input.end_time ? `${input.date}T${input.end_time}:00+07:00` : null;

  let app: unknown;
  const { data: dup } = await supabase.from('work_activities').select('id,title,scheduled_at,deadline')
    .eq('user_id', userId).eq('title', title).eq('scheduled_at', startISO).limit(1);
  if (dup?.length) app = { ...dup[0], note: 'already in the app' };
  else {
    const { data, error } = await supabase.from('work_activities').insert({
      user_id: userId, title, scheduled_at: startISO, deadline: endISO,
    }).select('id,title,scheduled_at,deadline').single();
    app = error ? { error: error.message } : data;
  }

  const google = await createCalendarEvent(supabase, userId, {
    title, startISO, endISO: endISO ?? undefined,
    description: input.description ? String(input.description).slice(0, 1000) : undefined,
  });
  return { app, google: 'error' in google ? { skipped: google.error } : google };
}
