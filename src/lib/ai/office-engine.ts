// Jax AI Office engine. Server-side only.
// A goal belongs to a team. The team lead (planner) splits it into subtasks, the team's workers do them
// with the team's tools (to-dos, schedule, finance...), then the lead checks the results and writes one report.
// `tickOffice` does ONE short step per call so it fits inside a serverless function; the page calls it
// repeatedly while work is open.
import { runTool, toolsFor, type Supa } from '@/lib/ai/tools';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

export type AgentKind = 'planner' | 'worker';

export interface RosterEntry {
  name: string;
  title: string;
  kind: AgentKind;
  job_desk: string;
}

export interface TeamProfile {
  slug: string;
  name: string;
  mission: string;
  /** Teams stay off until their tools exist, so they never invent data. */
  enabled: boolean;
  tools: string[];
  roster: RosterEntry[];
  plannerGuide: string;
}

export const TEAM_PROFILES: TeamProfile[] = [
  {
    slug: 'productivity',
    name: 'Productivity',
    mission: 'Plans your day and keeps your to-do list under control.',
    enabled: true,
    tools: ['list_todos', 'add_todo', 'complete_todo', 'list_schedule', 'add_schedule', 'calendar_list', 'calendar_create'],
    roster: [
      { name: 'Sela', kind: 'planner', title: 'Team Lead (plans, checks, reports)', job_desk: 'You are Sela, lead of the Productivity team; Jax is the big boss who sends you jobs. You split the brief into at most 3 subtasks, choose the right agent for each, then check their work and write the final report.' },
      { name: 'Tika', kind: 'worker', title: 'AI Schedule planner', job_desk: 'You are Tika, the schedule planner. Read the existing plans first with calendar_list (Google Calendar) and list_schedule, avoid clashes, leave breaks. Add events only when the brief asks you to put things on the calendar: call add_schedule ONCE per event: it saves the event in the app AND on Google Calendar at the same time (if the google part says skipped, tell Nico to connect Google Calendar). Never call both add_schedule and calendar_create for the same event. Report exactly what you added.' },
      { name: 'Dito', kind: 'worker', title: 'AI To-do coach', job_desk: 'You are Dito, the to-do coach. Read the list with list_todos, group and prioritise it, suggest what to do first, and add or complete tasks with the tools only when the brief asks for it. Report exactly what you changed.' },
    ],
    plannerGuide: 'Typical briefs: plan my day or week, clean up my to-do list, schedule a task, find free time. Use Tika for anything about time and the calendar, Dito for tasks and priorities. Use only one agent when one is enough.',
  },
  {
    slug: 'finance',
    name: 'Menteri Keuangan',
    mission: 'Your finance minister: reviews income, spending and budget.',
    enabled: true,
    tools: ['finance_summary'],
    roster: [
      { name: 'Kemal', kind: 'planner', title: 'Menteri Keuangan (lead)', job_desk: 'You are the finance minister. You split the brief into at most 3 subtasks, then check the numbers and write the final report with clear advice.' },
      { name: 'Dewi', kind: 'worker', title: 'AI Finance analyst', job_desk: 'You are Dewi, the finance analyst. Use finance_summary for each period you need (this month, last month) and compare them. Quote real numbers in rupiah only from the tool results; never estimate.' },
    ],
    plannerGuide: 'Typical briefs: how is my money this month, where am I overspending, how much can I save. Dewi does all number work.',
  },
  {
    slug: 'health',
    name: 'Health',
    mission: 'AI Sleep, AI Workout and AI Meal coaches. Reads your Fitbit every morning.',
    enabled: true,
    tools: ['fitbit_day', 'fitbit_recent', 'gym_recent', 'list_meals', 'add_meal'],
    roster: [
      { name: 'Nara', kind: 'planner', title: 'Health Lead', job_desk: 'You are Nara, lead of the Health team; Jax is the big boss who sends you jobs. Split the brief into at most 3 subtasks for Luna (sleep), Rio (workout) and Sari (meals); use only the coaches the brief needs. For a morning summary use all three. Then check the work and write ONE short summary: how Nico slept and moved, what to do today.' },
      { name: 'Luna', kind: 'worker', title: 'AI Sleep coach', job_desk: 'You are Luna, the sleep coach. Use fitbit_day for today and fitbit_recent for the trend. Report hours slept (convert minutes to hours and minutes), awake time, resting heart rate and how it compares with the last days. Give at most 2 concrete tips. If the data is missing, say Fitbit has no data yet (the watch may not have synced) instead of guessing.' },
      { name: 'Rio', kind: 'worker', title: 'AI Workout coach', job_desk: 'You are Rio, the workout coach. Use gym_recent and fitbit_recent (steps). Say what Nico trained recently, which muscle groups are due, and suggest a workout for today, lighter if sleep was short. Never invent sessions that are not in the data.' },
      { name: 'Sari', kind: 'worker', title: 'AI Meal planner', job_desk: 'You are Sari, the meal planner. Use list_meals for today and yesterday. Summarise what was eaten, then suggest simple Indonesian meals for today that fit the workout and sleep (more protein after training). If nothing is logged, say so and ask Nico to log meals; log a meal with add_meal only when he tells you what he ate.' },
    ],
    plannerGuide: 'Typical briefs: morning health summary, how did I sleep, what should I train, what should I eat. Luna = sleep and recovery, Rio = workouts, Sari = food.',
  },
  {
    slug: 'stocks',
    name: 'Stock Expert',
    mission: 'Daily buy, sell or hold ideas for IDX stocks, with research and a track record.',
    enabled: true,
    tools: ['market_overview', 'stock_screen', 'stock_technicals', 'stock_news', 'portfolio_list', 'past_picks', 'save_pick'],
    roster: [
      { name: 'Bima', kind: 'planner', title: 'Stock Expert Lead', job_desk: 'You are Bima, lead of the Stock Expert team; Jax is the big boss who sends you jobs. For a daily recommendation make exactly 2 subtasks in this order: Ratna first (market, news, portfolio), then Surya (technicals, final picks). Then check their work and write the final report: market mood in one line, then 2 to 4 ideas, each with ticker, BUY or SELL or HOLD, entry range, target, stop loss, and a one-sentence reason, then what to do with the current portfolio, then the track record. End with: Ini analisis AI, bukan nasihat keuangan; keputusan dan risiko ada di kamu.' },
      { name: 'Ratna', kind: 'worker', title: 'AI Research analyst', job_desk: 'You are Ratna, the research analyst. Use market_overview for IHSG and USD/IDR, stock_news for the market and for the stocks in the portfolio, portfolio_list for what Nico holds, and past_picks for the track record. Report: the market mood, the news that matters for his holdings and the sector, how his portfolio is doing, and how earlier picks performed. Quote only numbers and headlines from the tools. For the stocks in the portfolio also call stock_technicals so you can note PER, PBV and dividend yield; quote fundamentals only from the tool and say when they are not available.' },
      { name: 'Surya', kind: 'worker', title: 'AI Technical analyst', job_desk: 'You are Surya, the technical analyst. Use stock_screen to find candidates, stock_technicals (technicals AND fundamentals: PER, PBV, dividend yield, ROE) to check the ones you may recommend (and the portfolio holdings), and stock_news for any candidate you are unsure about. Choose 2 to 4 ideas: BUY candidates need an uptrend or a clear bounce from support with RSI below 70; SELL or HOLD for portfolio stocks in a downtrend or near resistance. For every idea give entry range, target (near resistance), stop loss (below support) in rupiah, all derived from the tool numbers, and a one-sentence reason that mentions valuation (PER or PBV) when the tool provides it. Do not recommend a BUY only because a stock looks cheap on PER: the trend must also agree. Then call save_pick once for every BUY or SELL idea you recommend. Be honest when there is no good setup: saying no clear idea today is a valid answer.' },
    ],
    plannerGuide: 'Typical briefs: daily buy/sell recommendation, check a stock, review my portfolio. Always Ratna before Surya so Surya sees the research.',
  },
];

export interface OfficeAgent { id: string; team_id: string; name: string; title: string; kind: AgentKind; model: string; job_desk: string; enabled: boolean }
export interface OfficeTeam { id: string; slug: string; name: string; mission: string; enabled: boolean; agents: OfficeAgent[] }
export interface OfficeTask {
  id: string; team_id: string; parent_id: string | null; kind: 'goal' | 'subtask'; seq: number; title: string; instructions: string;
  agent_id: string | null; status: 'queued' | 'planning' | 'running' | 'reporting' | 'done' | 'failed';
  result: string | null; error: string | null; model_used: string | null; tokens_in: number; tokens_out: number; created_at: string;
}
export interface OfficeEvent { id: string; goal_id: string | null; agent_id: string | null; message: string; created_at: string }

// ── Anthropic ───────────────────────────────────────────────────────────────
interface ClaudeResult { content: any[]; stop_reason: string; tokensIn: number; tokensOut: number }

async function claude(opts: { system: string; messages: any[]; tools?: any[]; toolChoice?: any; maxTokens?: number }): Promise<ClaudeResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set in Vercel.');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 1500,
      system: opts.system,
      messages: opts.messages,
      ...(opts.tools?.length ? { tools: opts.tools } : {}),
      ...(opts.toolChoice ? { tool_choice: opts.toolChoice } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const d = await res.json();
  return { content: d.content, stop_reason: d.stop_reason, tokensIn: d.usage?.input_tokens ?? 0, tokensOut: d.usage?.output_tokens ?? 0 };
}

const textOf = (content: any[]) => content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();

const todayWib = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const nowWib = () => new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'short' }).format(new Date());

const baseRules = () =>
  `The user is Nico. Reply in the language of the brief (Indonesian by default), short and concrete, no emoji. ` +
  `Now (WIB): ${nowWib()}. Today is ${todayWib()}. Never invent data: use only tool results and the brief; if something is missing, say so.`;

// ── Setup & state ───────────────────────────────────────────────────────────
export async function ensureTeams(db: Supa, userId: string) {
  const { data: have } = await db.from('ai_teams').select('id,slug').eq('user_id', userId);
  const slugs = new Set((have ?? []).map((t: any) => t.slug));
  // rename: the old Productivity lead was called Jax; Jax is the big boss now
  for (const t of (have ?? []) as { id: string; slug: string }[]) {
    if (t.slug === 'productivity') await db.from('ai_agents').update({ name: 'Sela' }).eq('team_id', t.id).eq('name', 'Jax');
  }
  // existing teams: keep job descriptions in step with the code
  for (const t of (have ?? []) as { id: string; slug: string }[]) {
    const p = TEAM_PROFILES.find((x) => x.slug === t.slug);
    if (!p) continue;
    for (const r of p.roster) await db.from('ai_agents').update({ title: r.title, job_desk: r.job_desk }).eq('team_id', t.id).eq('name', r.name);
  }
  for (const p of TEAM_PROFILES) {
    if (slugs.has(p.slug)) continue;
    const { data: team } = await db.from('ai_teams')
      .insert({ user_id: userId, slug: p.slug, name: p.name, mission: p.mission, enabled: p.enabled })
      .select('id').single();
    if (!team) continue;
    await db.from('ai_agents').insert(p.roster.map((r) => ({
      user_id: userId, team_id: team.id, name: r.name, title: r.title, kind: r.kind, job_desk: r.job_desk, model: MODEL,
    })));
  }
  // keep enabled flags in step with the code (e.g. when a team gets its tools)
  for (const p of TEAM_PROFILES) await db.from('ai_teams').update({ enabled: p.enabled }).eq('user_id', userId).eq('slug', p.slug);
}

export async function getOfficeState(db: Supa, userId: string) {
  await ensureTeams(db, userId);
  const [{ data: teams }, { data: agents }, { data: tasks }, { data: events }] = await Promise.all([
    db.from('ai_teams').select('*').eq('user_id', userId).order('created_at'),
    db.from('ai_agents').select('*').eq('user_id', userId).order('created_at'),
    db.from('ai_tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(120),
    db.from('ai_events').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(40),
  ]);
  const order = TEAM_PROFILES.map((p) => p.slug);
  const teamViews: OfficeTeam[] = ((teams ?? []) as any[])
    .sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug))
    .map((t) => ({ ...t, agents: ((agents ?? []) as OfficeAgent[]).filter((a) => a.team_id === t.id) }));
  const { data: prof } = await db.from('profiles').select('gcal_refresh_token').eq('id', userId).single();
  return {
    teams: teamViews, tasks: (tasks ?? []) as OfficeTask[], events: (events ?? []) as OfficeEvent[],
    keyConfigured: !!process.env.ANTHROPIC_API_KEY,
    calendarConnected: !!(prof as any)?.gcal_refresh_token,
  };
}

async function log(db: Supa, userId: string, goalId: string | null, agentId: string | null, message: string) {
  await db.from('ai_events').insert({ user_id: userId, goal_id: goalId, agent_id: agentId, message });
}

export async function createGoal(db: Supa, userId: string, teamId: string, text: string) {
  const brief = text.trim().slice(0, 4000);
  if (!brief) return { error: 'Empty brief' };
  const { data: team } = await db.from('ai_teams').select('id,name,enabled').eq('id', teamId).eq('user_id', userId).single();
  if (!team) return { error: 'Team not found' };
  if (!team.enabled) return { error: `${team.name} is not ready yet.` };
  const { data: goal, error } = await db.from('ai_tasks')
    .insert({ user_id: userId, team_id: teamId, kind: 'goal', title: brief.slice(0, 80), instructions: brief })
    .select('id').single();
  if (error || !goal) return { error: error?.message || 'Could not create goal' };
  await log(db, userId, goal.id, null, `New brief for ${team.name}: "${brief.slice(0, 100)}"`);
  return { id: goal.id };
}

async function setTask(db: Supa, id: string, patch: Record<string, unknown>) {
  await db.from('ai_tasks').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
}

// ── One step of work ────────────────────────────────────────────────────────
export async function tickOffice(db: Supa, userId: string, goalId?: string): Promise<{ worked: boolean }> {
  let q = db.from('ai_tasks').select('*')
    .eq('user_id', userId).eq('kind', 'goal').in('status', ['queued', 'planning', 'running', 'reporting']);
  if (goalId) q = q.eq('id', goalId);
  const { data: open } = await q.order('created_at').limit(1);
  const goal = open?.[0] as OfficeTask | undefined;
  if (!goal) return { worked: false };

  const { data: team } = await db.from('ai_teams').select('*').eq('id', goal.team_id).single();
  const { data: agents } = await db.from('ai_agents').select('*').eq('team_id', goal.team_id);
  const profile = TEAM_PROFILES.find((p) => p.slug === team?.slug);
  const lead = (agents as OfficeAgent[] | null)?.find((a) => a.kind === 'planner');
  if (!team || !profile || !lead) {
    await setTask(db, goal.id, { status: 'failed', error: 'Team is not set up.' });
    return { worked: true };
  }

  try {
    if (goal.status === 'queued' || goal.status === 'planning') await planGoal(db, userId, goal, profile, agents as OfficeAgent[], lead);
    else if (goal.status === 'running') await runNextSubtask(db, userId, goal, profile, agents as OfficeAgent[], lead);
    else await writeReport(db, userId, goal, lead);
  } catch (e: any) {
    const msg = String(e?.message || e).slice(0, 300);
    await setTask(db, goal.id, { status: 'failed', error: msg });
    await log(db, userId, goal.id, lead.id, `Failed: ${msg}`);
  }
  return { worked: true };
}

/** Runs one goal step by step until it is done or the time budget runs out (used when Jax delegates from chat). */
export async function runGoal(db: Supa, userId: string, goalId: string, budgetMs: number): Promise<{ done: boolean; report?: string | null; error?: string | null }> {
  const start = Date.now();
  while (Date.now() - start < budgetMs) {
    const { data: g } = await db.from('ai_tasks').select('status,result,error').eq('id', goalId).single();
    if (!g) return { done: true, error: 'Goal not found' };
    if (g.status === 'done') return { done: true, report: g.result };
    if (g.status === 'failed') return { done: true, error: g.error };
    await tickOffice(db, userId, goalId);
  }
  return { done: false };
}

async function planGoal(db: Supa, userId: string, goal: OfficeTask, profile: TeamProfile, agents: OfficeAgent[], lead: OfficeAgent) {
  await setTask(db, goal.id, { status: 'planning' });
  await log(db, userId, goal.id, lead.id, `${lead.name} is planning.`);
  const workers = agents.filter((a) => a.kind === 'worker' && a.enabled);
  const r = await claude({
    system: `${lead.job_desk}\n${profile.plannerGuide}\nYour agents:\n${workers.map((w) => `- ${w.name}: ${w.title}`).join('\n')}\n${baseRules()}`,
    messages: [{ role: 'user', content: `Brief:\n${goal.instructions}\n\nRespond by calling the make_plan tool now. Do not write any other text.` }],
    tools: [{
      name: 'make_plan',
      description: 'Split the brief into subtasks (max 3), each given to one agent.',
      input_schema: {
        type: 'object',
        properties: {
          subtasks: {
            type: 'array', minItems: 1, maxItems: 3,
            items: {
              type: 'object',
              properties: {
                agent: { type: 'string', enum: workers.map((w) => w.name) },
                title: { type: 'string' },
                instructions: { type: 'string', description: 'Complete instructions for the agent, including every fact from the brief it needs.' },
              },
              required: ['agent', 'title', 'instructions'],
            },
          },
        },
        required: ['subtasks'],
      },
    }],
  });
  const plan = r.content.find((b: any) => b.type === 'tool_use')?.input?.subtasks as { agent: string; title: string; instructions: string }[] | undefined;
  if (!plan?.length) throw new Error('The lead produced no subtasks.');
  await db.from('ai_tasks').insert(plan.slice(0, 3).map((s, i) => ({
    user_id: userId, team_id: goal.team_id, parent_id: goal.id, kind: 'subtask', seq: i,
    title: String(s.title).slice(0, 120), instructions: String(s.instructions).slice(0, 4000),
    agent_id: workers.find((w) => w.name === s.agent)?.id ?? workers[0]?.id ?? null,
  })));
  await setTask(db, goal.id, { status: 'running', tokens_in: goal.tokens_in + r.tokensIn, tokens_out: goal.tokens_out + r.tokensOut, model_used: MODEL });
  await log(db, userId, goal.id, lead.id, `Plan ready: ${plan.length} subtask${plan.length > 1 ? 's' : ''}.`);
}

async function runNextSubtask(db: Supa, userId: string, goal: OfficeTask, profile: TeamProfile, agents: OfficeAgent[], lead: OfficeAgent) {
  const { data: subs } = await db.from('ai_tasks').select('*').eq('parent_id', goal.id).order('seq');
  const next = (subs as OfficeTask[] | null)?.find((s) => s.status === 'queued' || s.status === 'running');
  if (!next) {
    await setTask(db, goal.id, { status: 'reporting' });
    return;
  }
  const agent = agents.find((a) => a.id === next.agent_id);
  await setTask(db, next.id, { status: 'running' });
  await log(db, userId, goal.id, agent?.id ?? null, `${agent?.name ?? 'Agent'} is working: ${next.title}`);

  const tools = toolsFor(profile.tools);
  const earlier = ((subs ?? []) as OfficeTask[]).filter((s) => s.status === 'done' && s.result)
    .map((s) => `${agents.find((a) => a.id === s.agent_id)?.name ?? 'Teammate'} (${s.title}):\n${s.result}`).join('\n\n');
  const convo: any[] = [{ role: 'user', content: `Overall brief from Nico:\n${goal.instructions}\n\n${earlier ? `Work already done by your teammates:\n${earlier}\n\n` : ''}Your subtask:\n${next.instructions}` }];
  let tin = 0, tout = 0, out = '';
  for (let i = 0; i < 6; i++) {
    const r = await claude({ system: `${agent?.job_desk ?? ''}\n${baseRules()}`, messages: convo, tools });
    tin += r.tokensIn; tout += r.tokensOut;
    convo.push({ role: 'assistant', content: r.content });
    if (r.stop_reason !== 'tool_use') { out = textOf(r.content); break; }
    const results = [];
    for (const b of r.content) {
      if (b.type !== 'tool_use') continue;
      if (!profile.tools.includes(b.name)) { results.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify({ error: 'tool not allowed' }) }); continue; }
      const res = await runTool(b.name, b.input, db, userId);
      results.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(res) });
    }
    convo.push({ role: 'user', content: results });
  }
  if (!out) out = 'No result.';
  await setTask(db, next.id, { status: 'done', result: out, model_used: MODEL, tokens_in: tin, tokens_out: tout });
  await setTask(db, goal.id, { tokens_in: goal.tokens_in + tin, tokens_out: goal.tokens_out + tout });
  await log(db, userId, goal.id, agent?.id ?? null, `${agent?.name ?? 'Agent'} finished: ${next.title}`);
}

async function writeReport(db: Supa, userId: string, goal: OfficeTask, lead: OfficeAgent) {
  await log(db, userId, goal.id, lead.id, `${lead.name} is checking the work and writing the report.`);
  const { data: subs } = await db.from('ai_tasks').select('*').eq('parent_id', goal.id).order('seq');
  const work = ((subs ?? []) as OfficeTask[]).map((s) => `## ${s.title}\n${s.result ?? s.error ?? '(no result)'}`).join('\n\n');
  const r = await claude({
    system: `${lead.job_desk}\nYou are the quality check. Compare the agents' work with the brief: remove anything unsupported by real data, fix contradictions, then write ONE final report for Nico: a short summary first, then clear next steps. Plain text, no markdown tables.\n${baseRules()}`,
    messages: [{ role: 'user', content: `Brief:\n${goal.instructions}\n\nAgents' work:\n${work}` }],
    maxTokens: 1800,
  });
  await setTask(db, goal.id, { status: 'done', result: textOf(r.content), tokens_in: goal.tokens_in + r.tokensIn, tokens_out: goal.tokens_out + r.tokensOut });
  await log(db, userId, goal.id, lead.id, 'Report delivered.');
}
