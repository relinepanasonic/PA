import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const HEALTH = 'https://health.googleapis.com/v4/users/me/dataTypes';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('fitbit_access_token, fitbit_refresh_token, fitbit_token_expires_at')
    .eq('id', user.id)
    .single();

  if (error || !profile || !profile.fitbit_access_token) {
    return NextResponse.json({ error: 'Fitbit not connected' }, { status: 404 });
  }

  let accessToken = profile.fitbit_access_token;
  const expiresAt = profile.fitbit_token_expires_at;

  // Google access tokens last 1 hour; refresh when within 5 minutes of expiry
  if (expiresAt && new Date(expiresAt).getTime() < Date.now() + 5 * 60 * 1000) {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.FITBIT_CLIENT_ID!,
        client_secret: process.env.FITBIT_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: profile.fitbit_refresh_token,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      console.error('Failed to refresh Google Health token', await tokenResponse.text());
      return NextResponse.json({ error: 'Token expired and refresh failed' }, { status: 401 });
    }
    const data = await tokenResponse.json();
    accessToken = data.access_token;
    await supabase.from('profiles').update({
      fitbit_access_token: data.access_token,
      fitbit_token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    }).eq('id', user.id);
  }

  const headers = { Authorization: `Bearer ${accessToken}` };
  // Civil date in the user's timezone (WIB) so "today" matches their day
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

  const list = async (type: string, filter: string, pageSize: number) => {
    const url = `${HEALTH}/${type}/dataPoints?pageSize=${pageSize}&filter=${encodeURIComponent(filter)}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`Health API ${type} failed`, res.status, await res.text());
      return null;
    }
    const json = await res.json();
    return (json.dataPoints || []) as any[];
  };

  try {
    const [stepPoints, hrPoints, sleepPoints] = await Promise.all([
      list('steps', `steps.interval.civil_start_time >= "${today}"`, 10000),
      list('heart-rate', `heart_rate.sample_time.civil_time >= "${today}"`, 10000),
      list('sleep', `sleep.interval.civil_end_time >= "${today}"`, 25),
    ]);

    const steps = (stepPoints || []).reduce((sum, p) => sum + Number(p.steps?.count || 0), 0);

    // Lowest sample of the day approximates resting heart rate
    const bpms = (hrPoints || []).map((p) => Number(p.heartRate?.beatsPerMinute)).filter((n) => n > 0);
    const restingHeartRate = bpms.length ? Math.min(...bpms) : null;

    const sleeps = (sleepPoints || []).map((p) => p.sleep).filter(Boolean);
    const sleep = sleeps.length
      ? {
          totalMinutesAsleep: sleeps.reduce((s, x) => s + Number(x.summary?.minutesAsleep || 0), 0),
          totalSleepRecords: sleeps.length,
          stages: null,
        }
      : null;

    return NextResponse.json({
      steps,
      distance: 0,
      caloriesOut: 0,
      sleep,
      heartRate: restingHeartRate ? { restingHeartRate } : null,
    });
  } catch (err) {
    console.error('Health API fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch health data' }, { status: 500 });
  }
}
