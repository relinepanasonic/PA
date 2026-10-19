import { NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const VOICE = 'id-ID-ArdiNeural'; // natural male Indonesian
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 1) Azure AI Speech (official) when AZURE_SPEECH_KEY + AZURE_SPEECH_REGION are set.
async function azureSpeech(text: string, key: string, region: string): Promise<Buffer | null> {
  const ssml = `<speak version="1.0" xml:lang="id-ID"><voice name="${VOICE}"><prosody rate="-4%">${esc(text)}</prosody></voice></speak>`;
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'personal-assistant',
    },
    body: ssml,
  });
  if (!res.ok) {
    console.error('Azure TTS failed', res.status);
    return null;
  }
  return Buffer.from(await res.arrayBuffer());
}

// 2) Free fallback: same Ardi voice through the Edge read-aloud service (no key).
async function edgeSpeech(text: string): Promise<Buffer | null> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text, { rate: '-4%' });
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    audioStream.on('data', (d: Buffer) => chunks.push(d));
    audioStream.on('close', () => resolve());
    audioStream.on('error', reject);
  });
  const audio = Buffer.concat(chunks);
  return audio.length ? audio : null;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { text } = await request.json();
  if (typeof text !== 'string' || !text.trim() || text.length > 1500) {
    return NextResponse.json({ error: 'Bad text' }, { status: 400 });
  }

  try {
    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;
    let audio = key && region ? await azureSpeech(text, key, region) : null;
    if (!audio) audio = await edgeSpeech(text);
    if (!audio) throw new Error('empty audio');

    return new NextResponse(audio, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=3600' },
    });
  } catch (err) {
    console.error('TTS failed', err);
    return NextResponse.json({ error: 'TTS failed' }, { status: 502 });
  }
}
