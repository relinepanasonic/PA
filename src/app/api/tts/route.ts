import { NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Free natural male Indonesian voice (Microsoft Edge neural "Ardi"), no API key or billing.
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { text } = await request.json();
  if (typeof text !== 'string' || !text.trim() || text.length > 1500) {
    return NextResponse.json({ error: 'Bad text' }, { status: 400 });
  }

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata('id-ID-ArdiNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (d: Buffer) => chunks.push(d));
      audioStream.on('close', () => resolve());
      audioStream.on('error', reject);
    });

    const audio = Buffer.concat(chunks);
    if (!audio.length) throw new Error('empty audio');
    return new NextResponse(audio, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=3600' },
    });
  } catch (err) {
    console.error('TTS failed', err);
    return NextResponse.json({ error: 'TTS failed' }, { status: 502 });
  }
}
