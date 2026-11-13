import { NextResponse, after } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runJax, type JaxMessage } from '@/lib/ai/jax';
import { isAllowedSender, sendWhatsApp } from '@/lib/whatsapp';
import type { Supa } from '@/lib/ai/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Jax only listens to messages that START with this greeting (any capitals): hi jax, hai jax, halo jax, hallo jax, hello jax, hey jax.
const TRIGGER = /^\s*(?:hi|hai|hay|halo|hallo|hello|hey)[\s,.!:;-]*jax\b[\s,.!:;-]*/i;

const HELP =
  '*Jax di WhatsApp*\n' +
  'Mulai pesan dengan *Hi Jax*, lalu perintahmu. Contoh:\n' +
  '- Hi Jax, jadwalkan meeting besok jam 10 dengan Pak Budi\n' +
  '- Hi Jax, harga BBCA sekarang?\n' +
  '- Hi Jax, berita saham hari ini\n' +
  '- Hi Jax, catat makan siang 35 ribu (foto struk: tulis Hi Jax di keterangan foto)\n' +
  '- Hi Jax, beli BBCA 5 lot di 9.000\n' +
  '- Hi Jax, tugas apa yang belum selesai?\n' +
  '- Hi Jax, berapa pengeluaran bulan ini?\n' +
  'Ketik *Hi Jax reset* untuk memulai percakapan baru.';

// Fonnte posts every incoming WhatsApp message here. Set the device webhook to
//   https://<your-domain>/api/whatsapp/webhook?key=<WHATSAPP_WEBHOOK_SECRET>
export async function POST(request: Request) {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secret || new URL(request.url).searchParams.get('key') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fonnte sends JSON; accept form data too.
  let body: Record<string, any> = {};
  try {
    const ct = request.headers.get('content-type') || '';
    body = ct.includes('application/json') ? await request.json() : Object.fromEntries((await request.formData()).entries());
  } catch {
    return NextResponse.json({ ok: true });
  }

  const sender = String(body.sender ?? '');
  const text = String(body.message ?? '').trim();
  const mediaUrl = String(body.url ?? '');
  const ext = String(body.extension ?? '').toLowerCase();
  const waId = String(body.inboxid ?? body.id ?? '') || null;

  // Only Nico's own numbers may command Jax; groups and strangers are ignored silently.
  if (!sender || body.member || !isAllowedSender(sender) || (!text && !mediaUrl)) return NextResponse.json({ ok: true });

  // ...and even then only when the message starts with "Hi Jax" (a photo needs it in its caption). Everything else is ignored.
  const trigger = text.match(TRIGGER);
  if (!trigger) return NextResponse.json({ ok: true });
  const command = text.slice(trigger[0].length).trim();

  // Answer Fonnte at once, do the (slow) AI work afterwards.
  after(() => handle({ sender, text: command, mediaUrl, ext, waId }).catch((e) => console.error('WhatsApp handler failed', e)));
  return NextResponse.json({ ok: true });
}

async function handle(m: { sender: string; text: string; mediaUrl: string; ext: string; waId: string | null }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { await sendWhatsApp(m.sender, 'Jax belum siap: SUPABASE_SERVICE_ROLE_KEY belum diisi di Vercel.'); return; }
  const db = createClient(url, key, { auth: { persistSession: false } }) as unknown as Supa;

  // The one owner account of this app.
  let userId = process.env.WHATSAPP_USER_ID || '';
  if (!userId) {
    const { data } = await db.from('profiles').select('id').order('created_at').limit(1);
    userId = data?.[0]?.id || '';
  }
  if (!userId) { await sendWhatsApp(m.sender, 'Jax belum menemukan akunmu di aplikasi.'); return; }

  const lower = m.text.toLowerCase().trim();
  if (!m.text && !m.mediaUrl) {
    await sendWhatsApp(m.sender, 'Hai Nico, Jax di sini. Mau dibantu apa? Tulis perintahmu setelah *Hi Jax*, atau ketik *Hi Jax bantuan*.');
    return;
  }
  if (['reset', '/reset', 'mulai baru'].includes(lower)) {
    await db.from('wa_messages').delete().eq('user_id', userId);
    await sendWhatsApp(m.sender, 'Oke, percakapan dimulai dari awal. Mau dibantu apa?');
    return;
  }
  if (['bantuan', 'help', 'menu', '/help'].includes(lower)) { await sendWhatsApp(m.sender, HELP); return; }

  // Ignore a message Fonnte delivers twice.
  if (m.waId) {
    const { data: dup } = await db.from('wa_messages').select('id').eq('user_id', userId).eq('wa_id', m.waId).limit(1);
    if (dup?.length) return;
  }

  // Simple guard against runaway cost.
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db.from('wa_messages').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('role', 'user').gte('created_at', since);
  if ((count ?? 0) >= 60) { await sendWhatsApp(m.sender, 'Terlalu banyak pesan dalam satu jam. Coba lagi sebentar lagi ya.'); return; }

  // A picture (receipt, transfer screenshot) is read by Jax; voice notes are not supported yet.
  let image: { data: string; mediaType: string } | null = null;
  if (m.mediaUrl) {
    if (['jpg', 'jpeg', 'png', 'webp'].includes(m.ext)) {
      try {
        const r = await fetch(m.mediaUrl);
        const buf = Buffer.from(await r.arrayBuffer());
        if (r.ok && buf.length < 4_000_000) image = { data: buf.toString('base64'), mediaType: m.ext === 'png' ? 'image/png' : m.ext === 'webp' ? 'image/webp' : 'image/jpeg' };
      } catch { /* fall through */ }
      if (!image) { await sendWhatsApp(m.sender, 'Fotonya tidak bisa dibuka atau terlalu besar. Coba kirim lagi.'); return; }
    } else if (!m.text) {
      await sendWhatsApp(m.sender, 'Maaf, Jax belum bisa membaca pesan suara atau file ini. Kirim teks atau foto ya.');
      return;
    }
  }
  const userText = m.text || 'Catat transaksi dari gambar ini.';

  // Short memory: the last messages of the last 12 hours.
  const { data: hist } = await db.from('wa_messages').select('role,content').eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 12 * 3600_000).toISOString()).order('created_at', { ascending: false }).limit(10);
  // The conversation sent to the AI must start with a user message.
  const past = ((hist ?? []) as JaxMessage[]).reverse();
  while (past.length && past[0].role !== 'user') past.shift();
  const messages: JaxMessage[] = [...past, { role: 'user', content: userText }];

  const r = await runJax({ db, userId, messages, image, channel: 'whatsapp' });
  if (!r.ok) {
    // Only Nico can reach this code, so the technical reason is safe to show; failed turns are not remembered.
    await sendWhatsApp(m.sender, r.status === 501 ? 'Jax belum aktif: ANTHROPIC_API_KEY belum diisi di Vercel.' : `Maaf, Jax sedang bermasalah. Coba lagi sebentar.\n\n(${r.detail || r.error})`);
    return;
  }
  const reply = r.reply || 'Selesai.';

  await db.from('wa_messages').insert([
    { user_id: userId, wa_id: m.waId, role: 'user', content: image ? `[foto] ${userText}` : userText },
    { user_id: userId, role: 'assistant', content: reply },
  ]);
  await sendWhatsApp(m.sender, reply);
}

// Opening the URL in a browser is a handy "is it alive" check.
export async function GET() {
  return NextResponse.json({ ok: true, service: 'Jax WhatsApp webhook' });
}
