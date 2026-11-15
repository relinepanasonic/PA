// WhatsApp through Fonnte (https://fonnte.com). Server-side only.
//   FONNTE_TOKEN              device token from the Fonnte dashboard
//   WHATSAPP_ALLOWED_NUMBERS  who may command Jax, comma separated (08.. or 628..)
//   WHATSAPP_WEBHOOK_SECRET   long random text, put in the webhook URL as ?key=

/** Digits only, Indonesian style: 0812... and +62812... both become 62812... */
export const normalizeNumber = (n: string) => {
  const d = String(n || '').replace(/\D/g, '');
  return d.startsWith('0') ? `62${d.slice(1)}` : d.startsWith('8') ? `62${d}` : d;
};

export const allowedNumbers = () =>
  (process.env.WHATSAPP_ALLOWED_NUMBERS || '').split(',').map(normalizeNumber).filter(Boolean);

export const isAllowedSender = (sender: string) => allowedNumbers().includes(normalizeNumber(sender));

let lastError = '';
/** Why the last send failed (Fonnte's own reason), for error messages shown to the owner. */
export const lastSendError = () => lastError;

/** Plain text the Fonnte Free package accepts: no accents or fancy punctuation, no links or domain names. */
export const safeText = (s: string) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, '-').replace(/…/g, '...')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\b(?:[a-z0-9-]+\.)+(?:com|co\.id|id|net|org|io|news|tv|me)\b/gi, '')
    .replace(/[^\x20-\x7E\n]/g, '')
    .replace(/[ \t]+/g, ' ').replace(/ +\n/g, '\n').trim();

async function postOne(token: string, target: string, text: string): Promise<{ ok: boolean; reason: string }> {
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ target: normalizeNumber(target), message: text, countryCode: '62' }),
    });
    const json = await res.json().catch(() => ({}));
    await new Promise((r) => setTimeout(r, 1200)); // keep messages in order
    if (json.status) return { ok: true, reason: '' };
    console.error('Fonnte send failed', json);
    return { ok: false, reason: String(json.reason || json.detail || JSON.stringify(json)).slice(0, 220) };
  } catch (e) {
    console.error('Fonnte send error', e);
    return { ok: false, reason: `network error: ${String((e as Error)?.message || e).slice(0, 120)}` };
  }
}

/** Sends a text (split into short parts). If the Free package refuses a part, it retries as plain safe text, then line by line. */
export async function sendWhatsApp(target: string, message: string): Promise<boolean> {
  const token = process.env.FONNTE_TOKEN;
  lastError = '';
  if (!token) { console.error('FONNTE_TOKEN is not set'); lastError = 'FONNTE_TOKEN is not set in Vercel'; return false; }
  const parts: string[] = [];
  for (let rest = message.trim(); rest.length; ) {
    if (rest.length <= 800) { parts.push(rest); break; }
    let cut = rest.lastIndexOf('\n', 800);
    if (cut < 300) cut = 800;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  let ok = true;
  for (const part of parts) {
    let r = await postOne(token, target, part);
    if (!r.ok && /free package|invalid message/i.test(r.reason)) {
      const safe = safeText(part);
      r = await postOne(token, target, safe);
      if (!r.ok) {
        // last resort: two lines at a time
        const lines = safe.split('\n');
        let allOk = true;
        for (let i = 0; i < lines.length; i += 2) {
          const piece = lines.slice(i, i + 2).join('\n').trim();
          if (!piece) continue;
          const rr = await postOne(token, target, piece);
          if (!rr.ok) { allOk = false; r = rr; }
        }
        if (allOk) r = { ok: true, reason: '' };
      }
    }
    if (!r.ok) { ok = false; lastError = r.reason; }
  }
  return ok;
}

/** Send several short messages one after another (each is its own WhatsApp message). */
export async function notifyOwnerParts(parts: string[]): Promise<boolean> {
  const custom = (process.env.WHATSAPP_NOTIFY_NUMBERS || '').split(',').map(normalizeNumber).filter(Boolean);
  const to = custom.length ? custom : allowedNumbers().slice(0, 1);
  if (!to.length || !process.env.FONNTE_TOKEN) return false;
  let ok = true;
  for (const n of to) for (const p of parts) if (!(await sendWhatsApp(n, p))) ok = false;
  return ok;
}

/** Push a message to the owner, e.g. the morning reports: WHATSAPP_NOTIFY_NUMBERS if set, else the first allowed number. Silent when WhatsApp is not set up. */
export async function notifyOwner(message: string): Promise<boolean> {
  const custom = (process.env.WHATSAPP_NOTIFY_NUMBERS || '').split(',').map(normalizeNumber).filter(Boolean);
  const to = custom.length ? custom : allowedNumbers().slice(0, 1);
  if (!to.length || !process.env.FONNTE_TOKEN) return false;
  const results = await Promise.all(to.map((n) => sendWhatsApp(n, message)));
  return results.every(Boolean);
}
