// The 08:00 WhatsApp morning brief, as THREE short messages (Fonnte's Free package refuses long ones):
//   1. today's schedule and to-dos   2. BBCA price   3. five headlines
// Built from plain data, no AI call, so it is cheap and always on time. No emoji: they are rejected on the free package.
import type { Supa } from '@/lib/ai/tools';
import { listCalendarEvents } from '@/lib/google-calendar';
import { fetchChart, stockNews } from '@/lib/stocks';
import { wibDate } from '@/lib/health';

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
const rp = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');
const shortDate = (d: string) => new Date(`${d}T00:00:00+07:00`).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short' });
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

// Headline only: drop the " - Source name" Google News adds at the end.
const cleanHeadline = (t: string) => clip(t.replace(/\s+[-–|]\s+[^-–|]{2,40}$/, '').trim(), 100);

async function businessHeadlines(n: number): Promise<string[]> {
  try {
    const res = await fetch('https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=id&gl=ID&ceid=ID:id', { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
    if (res.ok) {
      const xml = await res.text();
      const titles = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) =>
        (m[1].match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] ?? '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()).filter(Boolean);
      if (titles.length) return titles.slice(0, n).map(cleanHeadline);
    }
  } catch { /* fall back to a search below */ }
  return (await stockNews('ekonomi bisnis Indonesia hari ini')).map((x) => cleanHeadline(x.title)).slice(0, n);
}

export async function buildMorningBrief(db: Supa, userId: string): Promise<string[]> {
  const today = wibDate();
  const from = `${today}T00:00:00+07:00`, to = `${today}T23:59:59+07:00`;
  const dayName = new Date(`${today}T12:00:00+07:00`).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long' });

  const [appRes, googleRes, todoRes, chart, news] = await Promise.all([
    db.from('work_activities').select('title,scheduled_at').eq('user_id', userId).gte('scheduled_at', from).lte('scheduled_at', to).order('scheduled_at'),
    listCalendarEvents(db, userId, from, to),
    db.from('todos').select('title,due_date').eq('user_id', userId).eq('is_completed', false).order('due_date', { ascending: true, nullsFirst: false }).limit(40),
    fetchChart('BBCA', '5d'),
    businessHeadlines(5),
  ]);

  // ── 1. schedule + to-dos ──
  const events: { time: string; title: string }[] = [];
  const seen = new Set<string>();
  const add = (iso: string | null, title: string, allDay = false) => {
    const time = !iso || allDay || iso.length <= 10 ? 'Seharian' : hhmm(iso);
    const key = `${time}|${title.trim().toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    events.push({ time, title: clip(title.trim(), 60) });
  };
  const googleOk = !('error' in (googleRes as any));
  if (googleOk) (googleRes as any[]).forEach((e) => add(e.start, e.title, !!e.start && e.start.length <= 10));
  ((appRes.data ?? []) as any[]).forEach((a) => add(a.scheduled_at, a.title));
  events.sort((a, b) => (a.time === 'Seharian' ? '00:00' : a.time).localeCompare(b.time === 'Seharian' ? '00:00' : b.time));

  const p1: string[] = [`*Selamat pagi, Nico!* ${dayName}`, '', '*Jadwal hari ini*'];
  if (events.length) events.slice(0, 8).forEach((e) => p1.push(`- ${e.time}  ${e.title}`));
  else p1.push('Tidak ada jadwal.');
  if (events.length > 8) p1.push(`...dan ${events.length - 8} lainnya`);
  if (!googleOk) p1.push('(Google Calendar belum terhubung)');

  const todos = ((todoRes.data ?? []) as any[]).map((t) => ({ ...t, overdue: t.due_date && t.due_date < today, dueToday: t.due_date === today }));
  todos.sort((a, b) => Number(!!b.overdue) - Number(!!a.overdue) || Number(!!b.dueToday) - Number(!!a.dueToday));
  p1.push('', `*To-do* (${todos.length} belum selesai)`);
  if (todos.length) {
    todos.slice(0, 6).forEach((t) => {
      const tag = t.overdue ? ` [lewat ${shortDate(t.due_date)}]` : t.dueToday ? ' [hari ini]' : '';
      p1.push(`- ${clip(t.title, 55)}${tag}`);
    });
    if (todos.length > 6) p1.push(`...dan ${todos.length - 6} lainnya`);
  } else p1.push('Semua tugas selesai.');

  // ── 2. BBCA ──
  const p2: string[] = ['*Harga BBCA*'];
  if (chart && chart.price > 0 && chart.prevClose > 0) {
    const chg = chart.price - chart.prevClose;
    const pct = (chg / chart.prevClose) * 100;
    const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const marketOpen = nowWib.getDay() >= 1 && nowWib.getDay() <= 5 && nowWib.getHours() >= 9 && nowWib.getHours() < 16;
    p2.push(`${rp(chart.price)}, ${chg >= 0 ? 'naik' : 'turun'} ${rp(Math.abs(chg))} (${pct >= 0 ? '+' : ''}${pct.toFixed(2).replace('.', ',')}%)`);
    p2.push(marketOpen ? 'Harga berjalan, bisa tertunda.' : 'Penutupan terakhir. Bursa buka 09.00.');
  } else p2.push('Harga belum bisa diambil sekarang.');

  // ── 3. headlines ──
  const p3: string[] = ['*5 berita utama hari ini*'];
  if (news.length) news.forEach((t, i) => p3.push(`${i + 1}. ${t}`));
  else p3.push('Berita belum bisa diambil sekarang.');

  return [p1.join('\n'), p2.join('\n'), p3.join('\n')];
}
