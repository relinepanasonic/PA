import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Get tokens from profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('fitbit_access_token, fitbit_refresh_token, fitbit_token_expires_at')
    .eq('id', user.id)
    .single();

  if (error || !profile || !profile.fitbit_access_token) {
    return NextResponse.json({ error: 'Fitbit not connected' }, { status: 404 });
  }

  let accessToken = profile.fitbit_access_token;
  const refreshToken = profile.fitbit_refresh_token;
  const expiresAt = profile.fitbit_token_expires_at;

  // 2. Refresh token if expired (or within 5 mins of expiry)
  if (expiresAt && new Date(expiresAt).getTime() < Date.now() + 5 * 60 * 1000) {
    const clientId = process.env.FITBIT_CLIENT_ID;
    const clientSecret = process.env.FITBIT_CLIENT_SECRET;
    
    // Fitbit requires Basic Auth for token refresh: base64(clientId:clientSecret)
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const tokenResponse = await fetch('https://api.fitbit.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    if (tokenResponse.ok) {
      const data = await tokenResponse.json();
      accessToken = data.access_token;
      
      await supabase.from('profiles').update({
        fitbit_access_token: data.access_token,
        fitbit_refresh_token: data.refresh_token,
        fitbit_token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      }).eq('id', user.id);
    } else {
      console.error('Failed to refresh fitbit token', await tokenResponse.text());
      return NextResponse.json({ error: 'Fitbit token expired and refresh failed' }, { status: 401 });
    }
  }

  // 3. Fetch Data!
  const today = new Date().toISOString().split('T')[0];

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept-Language': 'en_US'
  };

  try {
    const [activityRes, sleepRes, heartRes] = await Promise.all([
      fetch(`https://api.fitbit.com/1/user/-/activities/date/${today}.json`, { headers }),
      fetch(`https://api.fitbit.com/1.2/user/-/sleep/date/${today}.json`, { headers }),
      fetch(`https://api.fitbit.com/1/user/-/activities/heart/date/${today}/1d.json`, { headers })
    ]);

    const activityData = activityRes.ok ? await activityRes.json() : null;
    const sleepData = sleepRes.ok ? await sleepRes.json() : null;
    const heartData = heartRes.ok ? await heartRes.json() : null;

    let steps = 0;
    let distance = 0;
    let caloriesOut = 0;
    if (activityData && activityData.summary) {
      steps = activityData.summary.steps || 0;
      distance = activityData.summary.distances?.find((d: any) => d.activity === 'total')?.distance || 0;
      caloriesOut = activityData.summary.caloriesOut || 0;
    }

    let sleepSummary = null;
    if (sleepData && sleepData.summary) {
      sleepSummary = {
        totalMinutesAsleep: sleepData.summary.totalMinutesAsleep || 0,
        totalSleepRecords: sleepData.summary.totalSleepRecords || 0,
        stages: sleepData.summary.stages || null
      };
    }

    let heartRateSummary = null;
    if (heartData && heartData['activities-heart'] && heartData['activities-heart'].length > 0) {
      heartRateSummary = heartData['activities-heart'][0].value;
    }

    return NextResponse.json({
      steps,
      distance,
      caloriesOut,
      sleep: sleepSummary,
      heartRate: heartRateSummary
    });

  } catch (error) {
    console.error('Fitbit fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch Fitbit data' }, { status: 500 });
  }
}
