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

/** Sends a text (split into parts if very long). Returns true when Fonnte accepted it. */
export async function sendWhatsApp(target: string, message: string): Promise<boolean> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) { console.error('FONNTE_TOKEN is not set'); return false; }
  const parts: string[] = [];
  for (let rest = message.trim(); rest.length; ) {
    if (rest.length <= 3500) { parts.push(rest); break; }
    let cut = rest.lastIndexOf('\n', 3500);
    if (cut < 1500) cut = 3500;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  let ok = true;
  for (const part of parts) {
    try {
      const res = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ target: normalizeNumber(target), message: part, countryCode: '62' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!json.status) { console.error('Fonnte send failed', json); ok = false; }
    } catch (e) {
      console.error('Fonnte send error', e);
      ok = false;
    }
  }
  return ok;
}

/** Push a message to the owner (first allowed number), e.g. the morning reports. Silent when WhatsApp is not set up. */
export async function notifyOwner(message: string): Promise<boolean> {
  const to = allowedNumbers()[0];
  if (!to || !process.env.FONNTE_TOKEN) return false;
  return sendWhatsApp(to, message);
}
