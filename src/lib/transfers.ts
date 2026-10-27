// Detects money moved between YOUR OWN places (Blu pockets, your other banks) so it is never counted as income or spending.

export const TRANSFER_MARK = '___TRANSFER___';

export interface TransferInfo {
  /** Short name of the other side: "Pocket Investasi", "BCA", "BANK JAGO" ... */
  counter: string;
  kind: 'pocket' | 'own-account';
}

const cleanPocket = (s: string) => s.replace(/^blu(?:Saving|Gether)\s*/i, '').replace(/^\d+\.\s*/, '').replace(/\s*\|.*$/, '').trim();

/** desc is the bank description WITHOUT the [Account] prefix. */
export function classifyTransfer(desc: string): TransferInfo | null {
  const d = desc.replace(TRANSFER_MARK, '').trim();

  // Blu pockets: "Transfer Dana ke bluSaving | bluSaving 0. Personal", "Dana Masuk dari bluSaving | bluSaving Investasi"
  const pocket = d.match(/^(?:Transfer Dana ke|Dana Masuk dari)\s+blu(?:Saving|Gether)\s*\|\s*(.+)$/i);
  if (pocket) return { counter: `Pocket ${cleanPocket(pocket[1]) || 'Blu'}`, kind: 'pocket' };

  // Your own name followed by a bank: "Transfer ke NICO WINARTA JAPAR | BANK JAGO - Hutang Nico | ..."
  // (a company after the name, as in "NICO WINARTA JAPAR - PT ...", is a payment and stays a normal expense)
  const own = d.match(/^(?:Transfer ke|Dana Masuk dari)\s+NICO\s+WINARTA\s+JAPAR\s*\|\s*([A-Za-z ]+?)\s*(?:-|\||$)/i);
  if (own) return { counter: own[1].trim().toUpperCase(), kind: 'own-account' };

  return null;
}

/** "[From → To] note___TRANSFER___", the format the Transaksi page already understands. */
export function transferDescription(account: string, info: TransferInfo, direction: 'in' | 'out', original: string) {
  const [from, to] = direction === 'out' ? [account, info.counter] : [info.counter, account];
  return `[${from} → ${to}] ${original.replace(/\s+/g, ' ').slice(0, 150)}${TRANSFER_MARK}`;
}

/** Cheap keyword guess so CSV lines (which carry no category) land somewhere sensible; fix it later in the PC dropdown. */
export function guessCategory(desc: string, direction: 'in' | 'out'): string | null {
  const d = desc.toLowerCase();
  if (direction === 'in') return /gaji|salary/.test(d) ? 'Salary' : null;
  if (/kredivo|cicilan|pinjam|loan|akulaku|adira|\bfif\b|\bbfi\b|home credit|atome/.test(d)) return 'Loan';
  if (/kai|kcic|gojek|grab|driver|tol|parkir|pertamina|bensin|krl|mrt|transjakarta/.test(d)) return 'Transport';
  if (/tiket|tix|cinema|xxi|netflix|spotify|steam|game/.test(d)) return 'Entertainment';
  if (/coffee|kopi|cafe|resto|food|makan|nasi|mie|bakpau|sushi|bebek|ayam|bakmi|roti|starbucks|sbux|tomoro|fore|foodhall|kitchen|warung|waroeng|rm\.|rumah makan|gofood|grabfood|shopeefood|burger|pizza|bakery|canteen/.test(d)) return 'Makan';
  return null;
}
