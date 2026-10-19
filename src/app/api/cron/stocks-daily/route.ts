import { runDailyTeamBrief } from '@/lib/ai/daily';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Vercel Cron: weekdays at 08:00 WIB (01:00 UTC), before the IDX opens at 09:00.
export async function GET(request: Request) {
  return runDailyTeamBrief(request, {
    slug: 'stocks',
    prefix: 'Daily stock recommendation',
    needs: 'any',
    brief:
      'Daily stock recommendation for today before the IDX opens. Ratna: market mood, news, how the portfolio is doing and how earlier picks performed. ' +
      'Surya: scan the watchlist, choose 2 to 4 BUY, SELL or HOLD ideas with entry, target and stop loss, and save them. ' +
      'Bima writes ONE report in Indonesian that is easy to read aloud.',
  });
}
