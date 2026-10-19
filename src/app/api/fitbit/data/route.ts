import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getHealthDay } from '@/lib/health';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const day = await getHealthDay(supabase, user.id);
  if ('error' in day) return NextResponse.json({ error: day.error }, { status: 404 });

  return NextResponse.json({
    steps: day.steps,
    distance: 0,
    caloriesOut: 0,
    sleep: day.sleep ? { totalMinutesAsleep: day.sleep.minutesAsleep, totalSleepRecords: day.sleep.records, stages: null } : null,
    heartRate: day.restingHeartRate ? { restingHeartRate: day.restingHeartRate } : null,
  });
}
