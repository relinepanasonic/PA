// Fitbit data through the Google Health API. Server-side only; tokens live on profiles.fitbit_* columns.
import type { Supa } from '@/lib/ai/tools';

const HEALTH = 'https://health.googleapis.com/v4/users/me/dataTypes';

export interface HealthDay {
  date: string;
  steps: number;
  restingHeartRate: number | null;
  sleep: { minutesAsleep: number; records: number; minutesAwake: number } | null;
}

export const wibDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);

export async function getHealthAccessToken(db: Supa, userId: string): Promise<{ token: string } | { error: string }> {
  const { data: p } = await db.from('profiles')
    .select('fitbit_access_token, fitbit_refresh_token, fitbit_token_expires_at').eq('id', userId).single();
  if (!p?.fitbit_access_token) return { error: 'Fitbit belum terhubung.' };

  const expires = p.fitbit_token_expires_at ? new Date(p.fitbit_token_expires_at).getTime() : 0;
  if (expires > Date.now() + 5 * 60 * 1000) return { token: p.fitbit_access_token };
  if (!p.fitbit_refresh_token) return { error: 'Fitbit perlu dihubungkan ulang.' };

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.FITBIT_CLIENT_ID!, client_secret: process.env.FITBIT_CLIENT_SECRET!,
      grant_type: 'refresh_token', refresh_token: p.fitbit_refresh_token,
    }).toString(),
  });
  if (!res.ok) return { error: 'Fitbit perlu dihubungkan ulang.' };
  const d = await res.json();
  await db.from('profiles').update({
    fitbit_access_token: d.access_token,
    fitbit_token_expires_at: new Date(Date.now() + d.expires_in * 1000).toISOString(),
  }).eq('id', userId);
  return { token: d.access_token };
}

const nextDay = (date: string) => wibDate(new Date(new Date(`${date}T00:00:00+07:00`).getTime() + 86400000));

/** Steps, lowest heart rate and sleep for one WIB calendar day. Sleep is counted on the day you wake up. */
export async function getHealthDay(db: Supa, userId: string, date = wibDate()): Promise<HealthDay | { error: string }> {
  const t = await getHealthAccessToken(db, userId);
  if ('error' in t) return t;
  const headers = { Authorization: `Bearer ${t.token}` };
  const end = nextDay(date);

  const list = async (type: string, filter: string, pageSize: number) => {
    const res = await fetch(`${HEALTH}/${type}/dataPoints?pageSize=${pageSize}&filter=${encodeURIComponent(filter)}`, { headers });
    if (!res.ok) {
      console.error(`Health API ${type} failed`, res.status, await res.text());
      return null;
    }
    return ((await res.json()).dataPoints || []) as any[];
  };

  const [stepPoints, hrPoints, sleepPoints] = await Promise.all([
    list('steps', `steps.interval.civil_start_time >= "${date}" AND steps.interval.civil_start_time < "${end}"`, 10000),
    list('heart-rate', `heart_rate.sample_time.civil_time >= "${date}" AND heart_rate.sample_time.civil_time < "${end}"`, 10000),
    list('sleep', `sleep.interval.civil_end_time >= "${date}" AND sleep.interval.civil_end_time < "${end}"`, 25),
  ]);

  const steps = (stepPoints ?? []).reduce((sum, p) => sum + Number(p.steps?.count || 0), 0);
  const bpms = (hrPoints ?? []).map((p) => Number(p.heartRate?.beatsPerMinute)).filter((n) => n > 0);
  const sleeps = (sleepPoints ?? []).map((p) => p.sleep).filter(Boolean);

  return {
    date,
    steps,
    restingHeartRate: bpms.length ? Math.min(...bpms) : null,
    sleep: sleeps.length
      ? {
          minutesAsleep: sleeps.reduce((s, x) => s + Number(x.summary?.minutesAsleep || 0), 0),
          minutesAwake: sleeps.reduce((s, x) => s + Number(x.summary?.minutesAwake || 0), 0),
          records: sleeps.length,
        }
      : null,
  };
}
