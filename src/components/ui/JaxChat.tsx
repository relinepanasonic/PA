'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Mic, Send, X } from 'lucide-react';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  picture?: string; // thumbnail shown in the chat
}

// Shrinks a photo so the upload stays small.
async function toJpeg(file: File): Promise<{ data: string; preview: string }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL('image/jpeg', 0.85);
  return { data: url.split(',')[1], preview: url };
}

interface Props {
  onClose: () => void;
  onSpeak: (text: string) => void;
  onStopSpeak: () => void;
}

export default function JaxChat({ onClose, onSpeak, onStopSpeak }: Props) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Halo Nico, Jax disini. Mau dibantu apa hari ini?' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ data: string; preview: string } | null>(null);
  const recRef = useRef<any>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => () => recRef.current?.abort?.(), []);

  const send = async (text: string) => {
    const content = text.trim() || (pending ? 'Catat transaksi dari gambar ini.' : '');
    if (!content || busy) return;
    onStopSpeak();
    const sentImage = pending;
    setPending(null);
    const next: Msg[] = [...messages, { role: 'user', content, picture: sentImage?.preview }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.slice(1).map(({ role, content }) => ({ role, content })), // drop the local greeting
          image: sentImage ? { data: sentImage.data, mediaType: 'image/jpeg' } : undefined,
        }),
      });
      const json = await res.json();
      let reply: string;
      if (res.status === 501) reply = 'Jax belum diaktifkan. Tambahkan ANTHROPIC_API_KEY di Vercel.';
      else if (!res.ok || !json.reply) reply = 'Maaf, Jax sedang bermasalah. Coba lagi sebentar.';
      else reply = json.reply;
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
      if (res.ok && json.reply) onSpeak(reply);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Tidak ada koneksi.' }]);
    }
    setBusy(false);
  };

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Browser ini belum mendukung input suara. Coba Chrome.' }]);
      return;
    }
    onStopSpeak();
    const rec = new SR();
    rec.lang = 'id-ID';
    rec.interimResults = false;
    rec.onresult = (e: any) => send(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  return (
    <div className="absolute inset-x-3 top-32 bottom-44 md:bottom-28 z-20 flex flex-col rounded-3xl border border-cyan-400/30 bg-black/70 backdrop-blur-md shadow-[0_0_30px_rgba(34,211,238,0.2)]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-cyan-400/20">
        <span className="text-[11px] font-mono tracking-[0.3em] text-cyan-300">JAX // CHAT</span>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1" aria-label="Close chat">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-cyan-500/20 border border-cyan-400/30 text-cyan-50'
                  : 'bg-white/5 border border-white/10 text-slate-100'
              }`}
            >
              {m.picture && <img src={m.picture} alt="" className="mb-1.5 max-h-40 rounded-xl" />}
              {m.content}
            </div>
          </div>
        ))}
        {busy && <p className="text-xs font-mono text-cyan-300/70 animate-pulse">Jax sedang berpikir...</p>}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 p-3 border-t border-cyan-400/20"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setPending(await toJpeg(f).catch(() => null));
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={`w-10 h-10 shrink-0 rounded-full border flex items-center justify-center ${pending ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-300' : 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300'}`}
          aria-label="Attach picture"
        >
          <ImagePlus size={18} />
        </button>
        <button
          type="button"
          onClick={toggleMic}
          className={`w-10 h-10 shrink-0 rounded-full border flex items-center justify-center transition-all ${
            listening
              ? 'border-orange-400/60 bg-orange-500/20 text-orange-300 animate-pulse'
              : 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300'
          }`}
          aria-label="Speak"
        >
          <Mic size={18} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={pending ? 'Foto siap. Tambah catatan (opsional)...' : 'Tanya atau perintah Jax...'}
          className="flex-1 min-w-0 h-10 rounded-full bg-white/5 border border-white/10 px-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/50"
        />
        <button
          type="submit"
          disabled={busy || (!input.trim() && !pending)}
          className="w-10 h-10 shrink-0 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 flex items-center justify-center disabled:opacity-40"
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
