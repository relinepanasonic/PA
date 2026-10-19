'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

// Speech synthesis audio can't be tapped by Web Audio, so the speaker calls
// this on every word boundary and the core fakes an envelope from it.
let lastWordAt = 0;
export const notifyVoiceWord = () => {
  lastWordAt = performance.now();
};

interface Props {
  speaking: boolean;
  label?: string;
  fill?: boolean;
}

const POINTS = 1600;

export default function JarvisCore({ speaking, label = 'JAX', fill = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speakingRef = useRef(speaking);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  speakingRef.current = speaking;

  const stopMic = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close();
    streamRef.current = null;
    ctxRef.current = null;
    analyserRef.current = null;
    setMicOn(false);
  };

  const toggleMic = async () => {
    if (micOn) return stopMic();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      ctx.createMediaStreamSource(stream).connect(analyser);
      streamRef.current = stream;
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      setMicError(null);
      setMicOn(true);
    } catch {
      setMicError('Microphone blocked');
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;

    // Fibonacci sphere
    const base: [number, number, number][] = [];
    for (let i = 0; i < POINTS; i++) {
      const y = 1 - (i / (POINTS - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = Math.PI * (3 - Math.sqrt(5)) * i;
      base.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    }
    const bins = new Uint8Array(128);
    let level = 0;
    let raf = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (now: number) => {
      const t = now / 1000;
      const { width: w, height: h } = canvas.getBoundingClientRect();
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.24;

      // Input level: mic spectrum, or synthetic envelope while the app talks
      let target = 0;
      const analyser = analyserRef.current;
      if (analyser) {
        analyser.getByteFrequencyData(bins);
        let sum = 0;
        for (let i = 2; i < 60; i++) sum += bins[i];
        target = Math.min(1, sum / 58 / 140);
      } else {
        bins.fill(0);
      }
      if (speakingRef.current) {
        const since = (now - lastWordAt) / 1000;
        const env = 0.35 + 0.65 * Math.exp(-since * 6) * (0.7 + 0.3 * Math.sin(t * 37));
        target = Math.max(target, env);
        for (let i = 0; i < 64; i++) bins[i] = Math.max(bins[i], env * 200 * (0.5 + 0.5 * Math.sin(i * 1.7 + t * 12)));
      }
      level += (target - level) * 0.18;

      const hot = speakingRef.current; // orange when Jax talks, blue otherwise
      const ring = hot ? '255,160,60' : '80,200,255';

      g.clearRect(0, 0, w, h);

      // Radial spectrum spikes
      g.lineWidth = 1;
      for (let i = 0; i < 96; i++) {
        const a = (i / 96) * Math.PI * 2 + t * 0.05;
        const v = bins[i % 64] / 255;
        const r1 = R * 1.55;
        const r2 = r1 + 4 + v * R * 0.9;
        g.strokeStyle = `rgba(${ring},${0.15 + v * 0.7})`;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        g.stroke();
      }

      // HUD orbit rings (tilted ellipses + dashed arcs)
      const rings = [
        { r: 1.35, tilt: 0.35, speed: 0.4, dash: [] as number[], width: 1.5 },
        { r: 1.45, tilt: 1.2, speed: -0.25, dash: [2, 6], width: 1 },
        { r: 1.7, tilt: 0.0, speed: 0.15, dash: [18, 10, 4, 10], width: 2 },
        { r: 1.9, tilt: 0.8, speed: -0.1, dash: [1, 4], width: 1 },
      ];
      rings.forEach((rg, i) => {
        g.save();
        g.translate(cx, cy);
        g.rotate(t * rg.speed + i);
        g.scale(1, i === 2 ? 1 : 0.35 + 0.25 * Math.sin(t * 0.3 + rg.tilt));
        g.setLineDash(rg.dash);
        g.lineWidth = rg.width + level * 2;
        g.strokeStyle = `rgba(${ring},${0.35 + level * 0.5})`;
        g.shadowColor = `rgba(${ring},0.8)`;
        g.shadowBlur = 8 + level * 20;
        g.beginPath();
        g.arc(0, 0, R * rg.r * (1 + level * 0.08), 0, Math.PI * (i === 2 ? 1.6 : 2));
        g.stroke();
        g.restore();
      });
      g.setLineDash([]);
      g.shadowBlur = 0;

      // Tick marks
      for (let i = 0; i < 120; i++) {
        const a = (i / 120) * Math.PI * 2 - t * 0.08;
        const long = i % 10 === 0;
        const r1 = R * 2.05;
        const r2 = r1 + (long ? 10 : 4);
        g.strokeStyle = `rgba(${ring},${long ? 0.6 : 0.25})`;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        g.stroke();
      }

      // Deforming particle sphere
      const ry = t * 0.35;
      const rx = Math.sin(t * 0.2) * 0.4;
      const cyR = Math.cos(ry), syR = Math.sin(ry), cxR = Math.cos(rx), sxR = Math.sin(rx);
      const amp = 0.08 + level * 0.45;
      for (const [x0, y0, z0] of base) {
        const n =
          Math.sin(x0 * 3 + t * 1.3) * Math.cos(y0 * 4 - t * 1.1) +
          Math.sin(z0 * 5 + t * 1.7) * 0.5;
        const s = 1 + n * amp;
        let x = x0 * s, y = y0 * s, z = z0 * s;
        const x1 = x * cyR - z * syR;
        z = x * syR + z * cyR;
        x = x1;
        const y1 = y * cxR - z * sxR;
        z = y * sxR + z * cxR;
        y = y1;
        const depth = (z + 1.5) / 3;
        const px = cx + x * R;
        const py = cy + y * R;
        const mix = Math.max(0, Math.min(1, (y0 + 1) / 2));
        const col = hot
          ? `rgba(255,${Math.round(120 + 90 * mix)},${Math.round(40 + 40 * mix)},${0.25 + depth * 0.75})`
          : `rgba(${Math.round(170 - 110 * mix)},${Math.round(110 + 90 * mix)},255,${0.25 + depth * 0.75})`;
        g.fillStyle = col;
        g.fillRect(px, py, 0.8 + depth * 1.6, 0.8 + depth * 1.6);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => () => stopMic(), []);

  return (
    <div className={fill ? 'relative w-full h-full' : 'relative w-full aspect-square max-h-[460px] mx-auto'}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className={`absolute left-3 top-2 text-[10px] font-mono tracking-[0.3em] text-cyan-300/70 ${fill ? "hidden" : ""}`}>
        {label} // CORE {speaking ? 'SPEAKING' : micOn ? 'LISTENING' : 'IDLE'}
      </div>
      <button
        type="button"
        onClick={toggleMic}
        className={`absolute ${fill ? "top-[7.5rem] right-3" : "bottom-2 right-3"} flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-mono tracking-widest transition-all ${
          micOn
            ? 'border-cyan-300/60 bg-cyan-400/15 text-cyan-200'
            : 'border-white/15 bg-white/5 text-slate-400 hover:text-cyan-200'
        }`}
        title={micOn ? 'Stop listening' : 'React to my voice'}
      >
        {micOn ? <Mic size={12} /> : <MicOff size={12} />}
        {micError ?? (micOn ? 'MIC ON' : 'MIC OFF')}
      </button>
    </div>
  );
}
