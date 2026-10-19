import { runDailyTeamBrief } from '@/lib/ai/daily';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Vercel Cron: every morning at 08:00 WIB (01:00 UTC, see vercel.json).
export async function GET(request: Request) {
  return runDailyTeamBrief(request, {
    slug: 'health',
    prefix: 'Morning health summary',
    needs: 'fitbit',
    brief:
      'Morning health summary. Nico just woke up. Read his Fitbit for today and the last few days, his recent gym sessions and his meals. ' +
      'Luna: how he slept and his resting heart rate. Rio: what to train today. Sari: what to eat today. ' +
      'Nara writes ONE short summary in Indonesian, easy to read aloud: sleep first, then movement, then the plan for today.',
  });
}
