// Google Calendar helpers. Server-side only. Tokens live on the user's profiles row.
import type { Supa } from '@/lib/ai/tools';

const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const TZ = 'Asia/Jakarta';

export const googleClient = () => ({
  id: process.env.GOOGLE_CLIENT_ID || process.env.FITBIT_CLIENT_ID,
  secret: process.env.GOOGLE_CLIENT_SECRET || process.env.FITBIT_CLIENT_SECRET,
});

export interface CalendarEvent {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  description?: string;
}

type Failure = { error: string };

/** Returns a valid access token (refreshing it when close to expiry), or an error. */
export async function getCalendarAccessToken(db: Supa, userId: string): Promise<{ token: string } | Failure> {
  const { data: p } = await db.from('profiles')
    .select('gcal_access_token, gcal_refresh_token, gcal_token_expires_at').eq('id', userId).single();
  if (!p?.gcal_access_token) return { error: 'Google Calendar belum terhubung.' };

  const expires = p.gcal_token_expires_at ? new Date(p.gcal_token_expires_at).getTime() : 0;
  if (expires > Date.now() + 5 * 60 * 1000) return { token: p.gcal_access_token };
  if (!p.gcal_refresh_token) return { error: 'Google Calendar perlu dihubungkan ulang.' };

  const c = googleClient();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: c.id!, client_secret: c.secret!, grant_type: 'refresh_token', refresh_token: p.gcal_refresh_token,
    }).toString(),
  });
  if (!res.ok) return { error: 'Google Calendar perlu dihubungkan ulang.' };
  const d = await res.json();
  await db.from('profiles').update({
    gcal_access_token: d.access_token,
    gcal_token_expires_at: new Date(Date.now() + d.expires_in * 1000).toISOString(),
  }).eq('id', userId);
  return { token: d.access_token };
}

const toEvent = (e: any): CalendarEvent => ({
  id: e.id,
  title: e.summary || '(no title)',
  start: e.start?.dateTime || e.start?.date || null,
  end: e.end?.dateTime || e.end?.date || null,
  description: e.description,
});

const call = async (db: Supa, userId: string, path: string, init: RequestInit & { query?: Record<string, string> } = {}): Promise<any> => {
  const t = await getCalendarAccessToken(db, userId);
  if ('error' in t) return t;
  const url = new URL(API + path);
  Object.entries(init.query ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, {
    method: init.method,
    body: init.body,
    headers: { Authorization: `Bearer ${t.token}`, 'Content-Type': 'application/json' },
  });
  if (res.status === 204) return { ok: true };
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { error: json?.error?.message || `Google Calendar error ${res.status}` };
  return json;
};

export async function listCalendarEvents(db: Supa, userId: string, fromISO: string, toISO: string): Promise<CalendarEvent[] | Failure> {
  const r = await call(db, userId, '', {
    query: { timeMin: fromISO, timeMax: toISO, singleEvents: 'true', orderBy: 'startTime', maxResults: '100', timeZone: TZ },
  });
  if (r.error) return r;
  return ((r.items ?? []) as any[]).map(toEvent);
}

export async function createCalendarEvent(
  db: Supa, userId: string,
  e: { title: string; startISO: string; endISO?: string; description?: string },
): Promise<CalendarEvent | Failure> {
  const end = e.endISO || new Date(new Date(e.startISO).getTime() + 60 * 60 * 1000).toISOString();
  const r = await call(db, userId, '', {
    method: 'POST',
    body: JSON.stringify({
      summary: e.title, description: e.description,
      start: { dateTime: e.startISO, timeZone: TZ }, end: { dateTime: end, timeZone: TZ },
    }),
  });
  return r.error ? r : toEvent(r);
}

export async function updateCalendarEvent(
  db: Supa, userId: string, id: string,
  e: { title?: string; startISO?: string; endISO?: string; description?: string },
): Promise<CalendarEvent | Failure> {
  const body: Record<string, unknown> = {};
  if (e.title) body.summary = e.title;
  if (e.description) body.description = e.description;
  if (e.startISO) body.start = { dateTime: e.startISO, timeZone: TZ };
  if (e.endISO) body.end = { dateTime: e.endISO, timeZone: TZ };
  const r = await call(db, userId, `/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
  return r.error ? r : toEvent(r);
}

export async function deleteCalendarEvent(db: Supa, userId: string, id: string): Promise<{ ok: true } | Failure> {
  const r = await call(db, userId, `/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return r.error ? r : { ok: true };
}
