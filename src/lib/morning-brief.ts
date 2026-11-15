// The 08:00 WhatsApp morning brief: today's schedule, open to-dos, BBCA price and 5 headlines.
// Built from plain data, no AI call, so it is cheap and always on time.
import type { Supa } from '@/lib/ai/tools';
import { listCalendarEvents } from '@/lib/google-calendar';
import { fetchChart, stockNews } from '@/lib/stocks';
import { wibDate } from '@/lib/health';

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
const rp = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');
const shortDate = (d: string) => new Date(`${d}T00:00:00+07:00`).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short' });

async function businessHeadlines(n: number): Promise<string[]> {
  try {
    const res = await fetch('https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=id&gl=ID&ceid=ID:id', { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
    if (res.ok) {
      const xml = await res.text();
      const titles = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) =>
        (m[1].match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] ?? '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()).filter(Boolean);
      if (titles.length) return titles.slice(0, n);
    }
  } catch { /* fall back to a search below */ }
  return (await stockNews('ekonomi bisnis Indonesia hari ini')).map((x) => x.title).slice(0, n);
}

export async function buildMorningBrief(db: Supa, userId: string): Promise<string> {
  const today = wibDate();
  const from = `${today}T00:00:00+07:00`, to = `${today}T23:59:59+07:00`;
  const dayName = new Date(`${today}T12:00:00+07:00`).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const [appRes, googleRes, todoRes, chart, news] = await Promise.all([
    db.from('work_activities').select('title,scheduled_at,deadline').eq('user_id', userId).gte('scheduled_at', from).lte('scheduled_at', to).order('scheduled_at'),
    listCalendarEvents(db, userId, from, to),
    db.from('todos').select('title,due_date,priority').eq('user_id', userId).eq('is_completed', false).order('due_date', { ascending: true, nullsFirst: false }).limit(40),
    fetchChart('BBCA', '5d'),
    businessHeadlines(5),
  ]);

  // schedule: the app's own entries plus Google Calendar, without repeating the same event
  const events: { time: string; title: string }[] = [];
  const seen = new Set<string>();
  const add = (iso: string | null, title: string, allDay = false) => {
    const time = !iso || allDay || iso.length <= 10 ? 'Seharian' : hhmm(iso);
    const key = `${time}|${title.trim().toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    events.push({ time, title: title.trim() });
  };
  const googleOk = !('error' in (googleRes as any));
  if (googleOk) (googleRes as any[]).forEach((e) => add(e.start, e.title, !!e.start && e.start.length <= 10));
  ((appRes.data ?? []) as any[]).forEach((a) => add(a.scheduled_at, a.title));
  events.sort((a, b) => (a.time === 'Seharian' ? '00:00' : a.time).localeCompare(b.time === 'Seharian' ? '00:00' : b.time));

  const lines: string[] = [`*Selamat pagi, Nico!* ☀️`, dayName, ''];

  lines.push('*Jadwal hari ini*');
  if (events.length) events.forEach((e) => lines.push(`• ${e.time}  ${e.title}`));
  else lines.push('Tidak ada jadwal. Hari yang lega!');
  if (!googleOk) lines.push('(Google Calendar belum terhubung, yang tampil hanya jadwal di aplikasi)');
  lines.push('');

  // to-do: overdue first, then due today, then the rest by due date
  const todos = ((todoRes.data ?? []) as any[]).map((t) => ({ ...t, overdue: t.due_date && t.due_date < today, dueToday: t.due_date === today }));
  todos.sort((a, b) => Number(!!b.overdue) - Number(!!a.overdue) || Number(!!b.dueToday) - Number(!!a.dueToday));
  lines.push(`*To-do list* (${todos.length} belum selesai)`);
  if (todos.length) {
    todos.slice(0, 8).forEach((t) => {
      const tag = t.overdue ? ` ⚠️ lewat ${shortDate(t.due_date)}` : t.dueToday ? ' (hari ini)' : t.due_date ? ` (${shortDate(t.due_date)})` : '';
      lines.push(`• ${t.title}${tag}`);
    });
    if (todos.length > 8) lines.push(`…dan ${todos.length - 8} lainnya`);
  } else lines.push('Semua tugas sudah selesai. Mantap!');
  lines.push('');

  lines.push('*Harga BBCA*');
  if (chart && chart.price > 0 && chart.prevClose > 0) {
    const chg = chart.price - chart.prevClose;
    const pct = (chg / chart.prevClose) * 100;
    const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const marketOpen = nowWib.getDay() >= 1 && nowWib.getDay() <= 5 && nowWib.getHours() >= 9 && nowWib.getHours() < 16;
    lines.push(`${rp(chart.price)}  ${chg >= 0 ? '▲' : '▼'} ${rp(Math.abs(chg))} (${pct >= 0 ? '+' : ''}${pct.toFixed(2).replace('.', ',')}%)`);
    lines.push(marketOpen ? 'Harga berjalan, bisa tertunda beberapa menit.' : 'Penutupan perdagangan terakhir. Bursa buka pukul 09.00.');
  } else lines.push('Harga belum bisa diambil sekarang.');
  lines.push('');

  lines.push('*5 berita utama ekonomi & bisnis*');
  if (news.length) news.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
  else lines.push('Berita belum bisa diambil sekarang.');
  lines.push('', 'Balas dengan *Hi Jax* + perintahmu kalau butuh sesuatu.');
  return lines.join('\n');
}
