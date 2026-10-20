import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

const PROMPT =
  'This image is a body composition scan result card (FitScan / InBody style). Read it carefully and reply with ONE JSON object and nothing else. ' +
  'Use null for anything you cannot read; never guess. Numbers only (no units). Keys: ' +
  'result_date (YYYY-MM-DD, from "Result Date"), weight_kg (Body Weight), bmi, fat_mass_kg (Fat Mass), fat_percentage (the Fat percentage in the donut chart), ' +
  'visceral_fat_grade (Visceral Fat), whr, basal_metabolism_kcal (BMR), physical_age (Body Age), score_bcm (Body Composition Metric Score), ' +
  'right_arm_muscle, right_arm_fat, left_arm_muscle, left_arm_fat, torso_muscle, torso_fat, right_leg_muscle, right_leg_fat, left_leg_muscle, left_leg_fat ' +
  '(the segmental kg values: the blue muscle icon is muscle, the orange drop icon is fat).';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: 'Add ANTHROPIC_API_KEY in Vercel first.' }, { status: 501 });

  const { image, mediaType } = await request.json();
  if (typeof image !== 'string' || !['image/jpeg', 'image/png', 'image/webp'].includes(mediaType)) {
    return NextResponse.json({ error: 'Send a JPEG, PNG or WebP image.' }, { status: 400 });
  }
  if (image.length > 5_500_000) return NextResponse.json({ error: 'Image is too large.' }, { status: 413 });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
          { type: 'text', text: PROMPT },
        ],
      }],
    }),
  });
  if (!res.ok) {
    console.error('body-scan Anthropic error', res.status, await res.text());
    return NextResponse.json({ error: 'Could not read the image. Try again.' }, { status: 502 });
  }

  const d = await res.json();
  const text = (d.content as any[]).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: 'The image could not be read as a scan result.' }, { status: 422 });
  try {
    const raw = JSON.parse(match[0]);
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    const out = {
      result_date: typeof raw.result_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.result_date) ? raw.result_date : null,
      weight_kg: num(raw.weight_kg), bmi: num(raw.bmi), fat_mass_kg: num(raw.fat_mass_kg), fat_percentage: num(raw.fat_percentage),
      visceral_fat_grade: num(raw.visceral_fat_grade), whr: num(raw.whr), basal_metabolism_kcal: num(raw.basal_metabolism_kcal),
      physical_age: num(raw.physical_age), score_bcm: num(raw.score_bcm),
      right_arm_muscle: num(raw.right_arm_muscle), right_arm_fat: num(raw.right_arm_fat),
      left_arm_muscle: num(raw.left_arm_muscle), left_arm_fat: num(raw.left_arm_fat),
      torso_muscle: num(raw.torso_muscle), torso_fat: num(raw.torso_fat),
      right_leg_muscle: num(raw.right_leg_muscle), right_leg_fat: num(raw.right_leg_fat),
      left_leg_muscle: num(raw.left_leg_muscle), left_leg_fat: num(raw.left_leg_fat),
    };
    if (!out.weight_kg) return NextResponse.json({ error: 'Could not find the body weight in this image.' }, { status: 422 });
    return NextResponse.json({ data: out });
  } catch {
    return NextResponse.json({ error: 'The image could not be read as a scan result.' }, { status: 422 });
  }
}
