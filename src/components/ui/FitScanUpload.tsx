'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

type Scan = Record<string, number | string | null>;

// Shrinks the photo before upload so it stays well below the server size limit.
async function toJpeg(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.88).split(',')[1];
}

const ROWS: [string, string, string][] = [
  ['weight_kg', 'Weight', 'kg'], ['bmi', 'BMI', ''], ['fat_mass_kg', 'Fat mass', 'kg'], ['fat_percentage', 'Fat', '%'],
  ['visceral_fat_grade', 'Visceral fat', ''], ['whr', 'WHR', ''], ['basal_metabolism_kcal', 'BMR', 'kcal'],
  ['physical_age', 'Body age', 'years'], ['score_bcm', 'BCM score', ''],
  ['right_arm_muscle', 'R arm muscle', 'kg'], ['right_arm_fat', 'R arm fat', 'kg'], ['left_arm_muscle', 'L arm muscle', 'kg'], ['left_arm_fat', 'L arm fat', 'kg'],
  ['torso_muscle', 'Torso muscle', 'kg'], ['torso_fat', 'Torso fat', 'kg'],
  ['right_leg_muscle', 'R leg muscle', 'kg'], ['right_leg_fat', 'R leg fat', 'kg'], ['left_leg_muscle', 'L leg muscle', 'kg'], ['left_leg_fat', 'L leg fat', 'kg'],
];

export default function FitScanUpload({ onSaved }: { onSaved: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const image = await toJpeg(file);
      const res = await fetch('/api/body-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, mediaType: 'image/jpeg' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error || 'Could not read the image.');
      else setScan(json.data);
    } catch {
      setError('Could not open that image.');
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const save = async () => {
    if (!scan) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { result_date, ...values } = scan;
    const { error: err } = await supabase.from('body_measurements').insert({
      user_id: user.id,
      measured_at: result_date ? `${result_date}T12:00:00+07:00` : new Date().toISOString(),
      ...values,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setScan(null);
    onSaved();
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {busy ? 'Reading...' : 'Upload scan'}
      </Button>
      {error && !scan && <p className="basis-full text-xs text-red-400 mt-1">{error}</p>}

      <Modal isOpen={!!scan} onClose={() => setScan(null)} title="Check the scan result">
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Read from your picture{scan?.result_date ? ` (${scan.result_date})` : ''}. Check the numbers, then save.
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {ROWS.map(([k, label, unit]) => (
              <div key={k} className="flex justify-between border-b border-white/5 py-1">
                <span className="text-slate-400">{label}</span>
                <span className="text-white font-semibold tabular-nums">{scan?.[k] ?? '-'} <span className="text-[10px] text-slate-500">{scan?.[k] != null ? unit : ''}</span></span>
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" onClick={() => setScan(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save result'}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
