import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Natural male Indonesian voice via Google Cloud Text-to-Speech.
// Needs GOOGLE_TTS_API_KEY (Cloud Text-to-Speech API enabled). Optional GOOGLE_TTS_VOICE.
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) return NextResponse.json({ error: 'TTS not configured' }, { status: 501 });

  const { text } = await request.json();
  if (typeof text !== 'string' || !text.trim() || text.length > 1500) {
    return NextResponse.json({ error: 'Bad text' }, { status: 400 });
  }

  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: 'id-ID',
        name: process.env.GOOGLE_TTS_VOICE || 'id-ID-Wavenet-C', // male
      },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0, pitch: -1.5 },
    }),
  });

  if (!res.ok) {
    console.error('TTS failed', res.status, await res.text());
    return NextResponse.json({ error: 'TTS failed' }, { status: 502 });
  }

  const { audioContent } = await res.json();
  return new NextResponse(Buffer.from(audioContent, 'base64'), {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=3600' },
  });
}
