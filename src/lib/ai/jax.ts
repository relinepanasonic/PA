// Jax, the boss agent. One brain for every channel: the in-app chat and WhatsApp.
import { createGoal, ensureTeams, runGoal, TEAM_PROFILES } from '@/lib/ai/office-engine';
import { runTool as libRunTool, toolsFor, type Supa } from '@/lib/ai/tools';

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
  ...toolsFor([
    'list_todos', 'add_todo', 'complete_todo', 'list_schedule', 'add_schedule', 'calendar_list',
    'finance_summary', 'savings_summary', 'finance_categories', 'add_transaction', 'list_transactions', 'delete_transaction', 'add_transfer', 'set_debt',
    'buy_stock', 'sell_stock', 'set_stock_holding', 'list_trades', 'portfolio_list',
    'stock_price', 'stock_technicals', 'stock_news', 'market_overview', 'stock_screen',
  ]),
];

async function runTool(name: string, input: any, supabase: Supa, userId: string): Promise<unknown> {
  if (name === 'ask_team') {
    await ensureTeams(supabase, userId); // syncs the enabled flags with the code
    const { data: team } = await supabase.from('ai_teams').select('id').eq('user_id', userId).eq('slug', input.team).single();
    if (!team) return { error: 'Team not set up yet. Ask Nico to open the Agents page once.' };
    const g = await createGoal(supabase, userId, team.id, String(input.brief));
    if ('error' in g) return g;
    const r = await runGoal(supabase, userId, g.id as string, 40_000);
    if (!r.done) return { status: 'still working', note: 'The team is still busy. Tell Nico the report will be on the Agents page shortly.' };
    return r.error ? { error: r.error } : { report: r.report };
  }
  return libRunTool(name, input, supabase, userId);
}

export type Channel = 'app' | 'whatsapp';

function systemPrompt(channel: Channel) {
  const now = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'short' }).format(new Date());
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const style = channel === 'whatsapp'
    ? `You are chatting with Nico on WhatsApp. Reply in the language he uses (Indonesian by default), short and clear like a helpful assistant texting. ` +
      `Plain text only: you may use *bold* for key numbers and short lines, but no markdown headings, tables or code blocks, and no emoji unless he uses them. Keep it under about 12 lines. `
    : `Reply in the language the user uses (Indonesian by default), in a calm, friendly, concise way: your replies are read aloud, so use short plain sentences and no markdown, tables or emoji. `;
  return (
    `You are Jax, the user's personal AI assistant inside their personal dashboard app. The user is Nico. ` + style +
    `Current date and time (WIB): ${now}. Today is ${today}. ` +
    `You are the boss of the AI office: the teams ask_team can reach (${enabledTeams.map((t) => t.name).join(', ')}) work for you. Delegate planning, reviews and multi-step jobs to the right team with ask_team and then tell Nico the result in your own short words; do quick single actions yourself. Use the tools to read or change the user's to-dos, schedule and finances. ` +
    `Meetings and appointments: add_schedule puts the event in the app and in Google Calendar; use today's date for "hari ini" and work out "besok" and weekdays from today. If the time is missing, ask for it. ` +
    `Prices and news: for "harga BBCA sekarang" use stock_price and give the price, the change today in percent and the time it is from (data can be delayed a little); for news use stock_news with a good search query (a stock code plus "saham", or a topic) and summarise the 3 to 5 most relevant headlines in your own words; for the market use market_overview; never quote a price or headline that a tool did not return. This is information, not financial advice. ` +
    `When Nico tells you (by text, voice or a picture of a receipt, transfer or e-wallet screenshot) about money he spent or received, record it yourself with add_transaction without asking first, then confirm in one short sentence: type, amount in words, category, date. Ask a question only when the amount or whether it is income or expense is truly unclear. If he asks to undo, find it with list_transactions and delete_transaction. Never record the same item twice in one conversation. ` +
    `When Nico says he bought or sold a stock (for example "beli BBCA 10 lot di 9.500" or "jual TLKM 5 lot harga 3.800"), record it right away with buy_stock or sell_stock and confirm in one sentence: ticker, lots, price, and for a sale the profit or loss in rupiah. 1 lot = 100 shares and prices are per share. Ask only if the lots or the price are missing. ` +
    `When Nico corrects or sets what he holds ("ubah BBCA jadi 21 lot rata-rata 6.760,48"), use set_stock_holding, never buy_stock or sell_stock, and tell him what it was before and what it is now. A stock trade is a swap between cash and shares, not income or spending, so do not also add a transaction for it. ` +
    `For money he moves between his own accounts use add_transfer, and when he tells you what he still owes on a card, PayLater or loan use set_debt. ` +
    `Never invent data; if a tool returns nothing, say so. Before adding or completing something, do it only if the user clearly asked.`
  );
}

export interface JaxMessage { role: 'user' | 'assistant'; content: string }
export interface JaxImage { data: string; mediaType: string }

export async function runJax(opts: {
  db: Supa;
  userId: string;
  messages: JaxMessage[];
  image?: JaxImage | null;
  channel?: Channel;
}): Promise<{ ok: true; reply: string } | { ok: false; status: number; error: string; detail?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, status: 501, error: 'agent-disabled' };

  const convo: any[] = opts.messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 4000) }));
  const img = opts.image;
  if (img && typeof img.data === 'string' && img.data.length < 5_500_000 && ['image/jpeg', 'image/png', 'image/webp'].includes(img.mediaType)) {
    const last = convo[convo.length - 1];
    if (last?.role === 'user') {
      last.content = [
        { type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } },
        { type: 'text', text: last.content || 'Catat transaksi dari gambar ini.' },
      ];
    }
  }

  const system = systemPrompt(opts.channel ?? 'app');
  try {
    for (let i = 0; i < 7; i++) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, tools: TOOLS, messages: convo }),
      });
      if (!res.ok) {
        const bodyText = await res.text();
        console.error('Anthropic error', res.status, bodyText);
        return { ok: false, status: 502, error: 'agent-failed', detail: `Anthropic ${res.status}: ${bodyText.replace(/\s+/g, ' ').slice(0, 220)}` };
      }
      const data = await res.json();
      convo.push({ role: 'assistant', content: data.content });

      if (data.stop_reason !== 'tool_use') {
        return { ok: true, reply: (data.content as any[]).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim() };
      }
      const results = [];
      for (const block of data.content as any[]) {
        if (block.type !== 'tool_use') continue;
        const out = await runTool(block.name, block.input, opts.db, opts.userId);
        results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(out) });
      }
      convo.push({ role: 'user', content: results });
    }
    return { ok: true, reply: 'Maaf, permintaannya terlalu rumit. Coba lagi dengan lebih singkat.' };
  } catch (err) {
    console.error('Agent error', err);
    return { ok: false, status: 500, error: 'agent-failed', detail: `Error: ${String((err as Error)?.message || err).slice(0, 220)}` };
  }
}
