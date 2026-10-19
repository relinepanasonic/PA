'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, Wallet, HeartPulse, TrendingUp, Send, Loader2, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import type { OfficeTeam, OfficeTask, OfficeEvent } from '@/lib/ai/office-engine';

interface State {
  teams: OfficeTeam[];
  tasks: OfficeTask[];
  events: OfficeEvent[];
  keyConfigured: boolean;
}

const ICONS: Record<string, typeof Briefcase> = { productivity: Briefcase, finance: Wallet, health: HeartPulse, stocks: TrendingUp };
const PLACEHOLDERS: Record<string, string> = {
  productivity: 'Contoh: Susun jadwal besok dan prioritaskan to-do saya.',
  finance: 'Contoh: Bandingkan pengeluaran bulan ini dengan bulan lalu.',
};
const OPEN = ['queued', 'planning', 'running', 'reporting'];

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

export default function AiOfficePage() {
  const [state, setState] = useState<State | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [brief, setBrief] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const running = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/ai-office/state', { cache: 'no-store' });
    if (!res.ok) return null;
    const s: State = await res.json();
    setState(s);
    setTeamId((cur) => cur ?? s.teams.find((t) => t.enabled)?.id ?? s.teams[0]?.id ?? null);
    return s;
  }, []);

  // Keep ticking while any goal is open (one short step per call).
  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      for (let i = 0; i < 40; i++) {
        const res = await fetch('/api/ai-office/tick', { method: 'POST' });
        const json = await res.json().catch(() => ({}));
        await load();
        if (!res.ok || !json.worked) break;
      }
    } finally {
      running.current = false;
    }
  }, [load]);

  useEffect(() => {
    load().then((s) => {
      if (s?.tasks.some((t) => t.kind === 'goal' && OPEN.includes(t.status))) pump();
    });
  }, [load, pump]);

  const send = async () => {
    if (!teamId || !brief.trim() || sending) return;
    setSending(true);
    setError(null);
    const res = await fetch('/api/ai-office/goal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, text: brief }),
    });
    const json = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setError(json.error || 'Could not send the brief.');
      return;
    }
    setBrief('');
    await load();
    pump();
  };

  const team = state?.teams.find((t) => t.id === teamId);
  const goals = (state?.tasks ?? []).filter((t) => t.kind === 'goal' && t.team_id === teamId);
  const busy = goals.some((g) => OPEN.includes(g.status));

  return (
    <div className="p-4 pb-28 md:pb-8 max-w-3xl mx-auto animate-fade-in">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-cyan-300 mb-3 hover:underline">
        <ArrowLeft size={14} /> Jax
      </Link>
      <h1 className="text-xl font-bold text-white">AI Office · Mission Control</h1>
      <p className="text-sm text-slate-400 mt-1 mb-4">Brief a team. The lead plans the work, the agents do it, and the lead checks it before you get the report.</p>

      {state && !state.keyConfigured && (
        <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          Add <b>ANTHROPIC_API_KEY</b> in Vercel to switch the agents on.
        </div>
      )}

      {/* Team picker */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {(state?.teams ?? []).map((t) => {
          const Icon = ICONS[t.slug] ?? Briefcase;
          const active = t.id === teamId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTeamId(t.id)}
              className={`text-left rounded-2xl border p-3.5 transition-all ${
                active ? 'border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.2)]' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
              } ${t.enabled ? '' : 'opacity-60'}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Icon size={18} className={active ? 'text-cyan-300' : 'text-slate-300'} />
                {!t.enabled && <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase text-slate-400"><Lock size={10} /> soon</span>}
              </div>
              <p className="text-sm font-bold text-white">{t.name}</p>
              <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{t.mission}</p>
              <p className="text-[10px] font-mono text-cyan-300/70 mt-2">{t.agents.length} agents</p>
            </button>
          );
        })}
      </div>

      {team && (
        <>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {team.agents.map((a) => (
              <span key={a.id} className="text-[10px] px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-slate-300">
                <b className="text-white">{a.name}</b> · {a.title}
              </span>
            ))}
          </div>

          {/* Brief */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 mb-5">
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={4}
              disabled={!team.enabled}
              placeholder={team.enabled ? PLACEHOLDERS[team.slug] ?? 'Describe what you want done.' : 'This team is coming next.'}
              className="w-full resize-none bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
            />
            {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
            <button
              type="button"
              onClick={send}
              disabled={!team.enabled || !brief.trim() || sending || !state?.keyConfigured}
              className="w-full h-11 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-100 text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {sending || busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {busy ? 'Team is working' : `Send to ${team.agents.find((a) => a.kind === 'planner')?.name ?? 'lead'}`}
            </button>
          </div>

          {/* Reports */}
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Reports</h2>
          <div className="space-y-2 mb-6">
            {goals.length === 0 && <p className="text-xs text-slate-500">No briefs yet.</p>}
            {goals.map((g) => {
              const open = expanded === g.id;
              const subs = (state?.tasks ?? []).filter((t) => t.parent_id === g.id).sort((a, b) => a.seq - b.seq);
              return (
                <div key={g.id} className="rounded-2xl border border-white/10 bg-white/[0.03]">
                  <button type="button" onClick={() => setExpanded(open ? null : g.id)} className="w-full flex items-center gap-3 p-3.5 text-left">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${g.status === 'done' ? 'bg-emerald-400' : g.status === 'failed' ? 'bg-red-400' : 'bg-orange-400 animate-pulse'}`} />
                    <span className="flex-1 min-w-0 text-sm text-white truncate">{g.title}</span>
                    <span className="text-[10px] font-mono uppercase text-slate-400">{g.status}</span>
                    {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </button>
                  {open && (
                    <div className="px-3.5 pb-3.5 space-y-3 text-sm">
                      {g.result && <p className="text-slate-100 whitespace-pre-wrap leading-relaxed">{g.result}</p>}
                      {g.error && <p className="text-red-400 text-xs">{g.error}</p>}
                      {subs.length > 0 && (
                        <div className="border-t border-white/10 pt-2.5 space-y-2">
                          {subs.map((s) => (
                            <div key={s.id}>
                              <p className="text-[11px] font-bold text-cyan-300">
                                {team.agents.find((a) => a.id === s.agent_id)?.name ?? 'Agent'} · {s.title}
                              </p>
                              <p className="text-xs text-slate-400 whitespace-pre-wrap">{s.result ?? s.error ?? s.status}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] font-mono text-slate-500">{g.tokens_in + g.tokens_out} tokens</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Activity */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Activity</h2>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5 max-h-64 overflow-y-auto">
        {(state?.events ?? []).length === 0 && <p className="p-3.5 text-xs text-slate-500">Nothing yet.</p>}
        {(state?.events ?? []).map((e) => (
          <div key={e.id} className="flex gap-3 px-3.5 py-2.5 text-xs">
            <span className="font-mono text-slate-500 shrink-0">{timeOf(e.created_at)}</span>
            <span className="text-slate-200">{e.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
