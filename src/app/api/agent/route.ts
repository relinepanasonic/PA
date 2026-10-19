import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createGoal, runGoal, TEAM_PROFILES } from '@/lib/ai/office-engine';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Jax: Claude as the in-app agent. Needs ANTHROPIC_API_KEY (optional ANTHROPIC_MODEL).
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

const enabledTeams = TEAM_PROFILES.filter((t) => t.enabled);

const TOOLS = [
  {
    name: 'ask_team',
    description:
      'Delegate a bigger job to one of your AI teams and get their finished report back. ' +
      enabledTeams.map((t) => `${t.slug}: ${t.mission}`).join(' | ') + ' ' +
      'Include every fact the team needs in the brief. Use it for planning, reviews and multi-step work; do simple single actions yourself with the other tools.',
    input_schema: {
      type: 'object',
      properties: {
        team: { type: 'string', enum: enabledTeams.map((t) => t.slug) },
        brief: { type: 'string', description: 'The complete job description for the team.' },
      },
      required: ['team', 'brief'],
    },
  },
  {
    name: 'list_todos',
    description: 'List the user\'s open (not completed) to-do tasks, earliest due date first.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
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
  {
    name: 'complete_todo',
    description: 'Mark a to-do as completed, by its id from list_todos.',
    input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'list_schedule',
    description: 'List schedule activities between two dates (inclusive), YYYY-MM-DD.',
    input_schema: {
      type: 'object',
      properties: { from: { type: 'string' }, to: { type: 'string' } },
      required: ['from', 'to'],
    },
  },
  {
    name: 'add_schedule',
    description: 'Add a schedule activity. Times are Western Indonesia Time (WIB, +07:00).',
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
  {
    name: 'finance_summary',
    description: 'Total income and expenses between two dates (inclusive), YYYY-MM-DD.',
    input_schema: {
      type: 'object',
      properties: { from: { type: 'string' }, to: { type: 'string' } },
      required: ['from', 'to'],
    },
  },
];

type Supa = Awaited<ReturnType<typeof createServerSupabaseClient>>;

async function runTool(name: string, input: any, supabase: Supa, userId: string): Promise<unknown> {
  switch (name) {
    case 'ask_team': {
      const { data: team } = await supabase.from('ai_teams').select('id').eq('user_id', userId).eq('slug', input.team).single();
      if (!team) return { error: 'Team not set up yet. Ask Nico to open the Agents page once.' };
      const g = await createGoal(supabase, userId, team.id, String(input.brief));
      if ('error' in g) return g;
      const r = await runGoal(supabase, userId, g.id as string, 40_000);
      if (!r.done) return { status: 'still working', note: 'The team is still busy. Tell Nico the report will be on the Agents page shortly.' };
      return r.error ? { error: r.error } : { report: r.report };
    }
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
      const start = `${input.date}T${input.start_time}:00+07:00`;
      const end = input.end_time ? `${input.date}T${input.end_time}:00+07:00` : null;
      const { data, error } = await supabase.from('work_activities').insert({
        user_id: userId,
        title: String(input.title).slice(0, 200),
        scheduled_at: start,
        deadline: end,
      }).select('id,title,scheduled_at,deadline').single();
      return error ? { error: error.message } : data;
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

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'agent-disabled' }, { status: 501 });

  const { messages } = await request.json();
  if (!Array.isArray(messages) || !messages.length || messages.length > 30) {
    return NextResponse.json({ error: 'Bad messages' }, { status: 400 });
  }

  const now = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'short',
  }).format(new Date());
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

  const system =
    `You are Jax, the user's personal AI assistant inside their personal dashboard app. ` +
    `The user is Nico. Reply in the language the user uses (Indonesian by default), in a calm, friendly, concise way: ` +
    `your replies are read aloud, so use short plain sentences and no markdown, tables or emoji. ` +
    `Current date and time (WIB): ${now}. Today is ${today}. ` +
    `You are the boss of the AI office: the teams ask_team can reach (${enabledTeams.map((t) => t.name).join(', ')}) work for you. Delegate planning, reviews and multi-step jobs to the right team with ask_team and then tell Nico the result in your own short words; do quick single actions yourself. Use the tools to read or change the user's to-dos, schedule and finances. Never invent data; if a tool returns nothing, say so. ` +
    `Before adding or completing something, do it only if the user clearly asked.`;

  const convo: any[] = messages.map((m: any) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content).slice(0, 4000),
  }));

  try {
    for (let i = 0; i < 6; i++) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, tools: TOOLS, messages: convo }),
      });
      if (!res.ok) {
        console.error('Anthropic error', res.status, await res.text());
        return NextResponse.json({ error: 'agent-failed' }, { status: 502 });
      }
      const data = await res.json();
      convo.push({ role: 'assistant', content: data.content });

      if (data.stop_reason !== 'tool_use') {
        const reply = (data.content as any[]).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
        return NextResponse.json({ reply });
      }

      const results = [];
      for (const block of data.content as any[]) {
        if (block.type !== 'tool_use') continue;
        const out = await runTool(block.name, block.input, supabase, user.id);
        results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(out) });
      }
      convo.push({ role: 'user', content: results });
    }
    return NextResponse.json({ reply: 'Maaf, permintaannya terlalu rumit. Coba lagi dengan lebih singkat.' });
  } catch (err) {
    console.error('Agent error', err);
    return NextResponse.json({ error: 'agent-failed' }, { status: 500 });
  }
}
