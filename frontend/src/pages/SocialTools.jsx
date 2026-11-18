import { useEffect, useMemo, useState } from 'react';
import { Loader2, Rocket } from 'lucide-react';
import FileDrop from '../components/FileDrop.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import ErrorNote from '../components/ErrorNote.jsx';
import ResultCard from '../components/ResultCard.jsx';
import Tilt from '../components/Tilt.jsx';
import { api } from '../services/api.js';
import { useProcessor } from '../hooks/useProcessor.js';
import { logActivity } from '../hooks/useActivity.js';
import { useToast } from '../components/Toast.jsx';

const COLORS = { tiktok: ['#25f4ee', '#fe2c55'], reels: ['#f58529', '#dd2a7b'], shorts: ['#ff416c', '#ff4b2b'], youtube: ['#ff416c', '#7c3aed'], 'ig-square': ['#8134af', '#dd2a7b'], 'ig-portrait': ['#515bd4', '#dd2a7b'], original: ['#10b981', '#06b6d4'] };

function RatioShape({ ratio }) {
  const [w, h] = ratio === 'original' ? [1, 1] : ratio.split(':').map(Number);
  const s = 44 / Math.max(w, h);
  return <span className="inline-block rounded-md border-2 border-white/90 bg-white/25" style={{ width: w * s, height: h * s }} />;
}

export default function SocialTools() {
  const toast = useToast();
  const [presets, setPresets] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [preset, setPreset] = useState('tiktok');
  const [mode, setMode] = useState('blur');
  const [file, setFile] = useState(null);
  const [captions, setCaptions] = useState('');
  const [burn, setBurn] = useState(false);
  const { run, busy, stage, uploadProgress, ffmpegProgress, speed, progress, result, error, reset } = useProcessor();
  const current = useMemo(() => presets.find((p) => p.id === preset), [presets, preset]);

  useEffect(() => { api.presets().then((d) => setPresets(d.presets)).catch((e) => setLoadError(e.message)); }, []);

  async function submit() {
    const r = await run('social/prepare', file, { preset, mode, burn: burn && captions.trim() ? 'true' : 'false', captions });
    if (r) { toast(`Prepared for ${current?.label}.`); logActivity({ type: 'social', title: `${file.name} → ${current?.label}`, platform: 'file' }); }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-4xl font-bold">Social Media <span className="text-grad">Tools</span></h1>
      <p className="mb-6 mt-2 text-muted">Upload an original you own, choose a destination, and ClipFlow exports it at the right size without stretching.</p>
      <ErrorNote message={loadError} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {presets.map((p) => {
          const [a, b] = COLORS[p.id] || COLORS.original; const on = p.id === preset;
          return (
            <Tilt key={p.id}><button onClick={() => setPreset(p.id)} aria-pressed={on} className="flex h-full w-full flex-col items-center gap-2 rounded-3xl p-4 text-center font-bold text-white transition"
              style={{ background: `linear-gradient(135deg,${a},${b})`, boxShadow: on ? `0 6px 0 rgba(0,0,0,.35), 0 0 0 3px #fff, 0 18px 30px -8px ${b}` : `0 6px 0 rgba(0,0,0,.28), 0 16px 24px -10px ${b}`, opacity: on ? 1 : 0.82 }}>
              <RatioShape ratio={p.ratio} />
              <span className="text-sm">{p.label}</span>
              <span className="text-xs font-semibold opacity-90">{p.ratio === 'original' ? 'Original ratio' : `${p.ratio} · ${p.width}×${p.height}`}</span>
            </button></Tilt>
          );
        })}
      </div>

      <div className="glass mt-6 p-5 md:p-7">
        <FileDrop file={file} onFile={(f) => { setFile(f); reset(); }} label="Drop the original video to prepare" />
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <div className="mb-2 text-sm font-bold">Framing (never stretched)</div>
            <div className="flex flex-wrap gap-2">
              {[['blur', 'Blurred bars'], ['fit', 'Black bars'], ['crop', 'Crop to fill']].map(([v, l]) => <button key={v} className="seg" aria-pressed={mode === v} onClick={() => setMode(v)} disabled={preset === 'original'}>{l}</button>)}
            </div>
            <label className="mt-5 flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={burn} onChange={(e) => setBurn(e.target.checked)} className="h-4 w-4 accent-fuchsia-500" /> Burn in captions (paste SRT)</label>
            {burn && <textarea className="field mt-2 h-36 font-mono text-xs" value={captions} onChange={(e) => setCaptions(e.target.value)} placeholder={'1\n00:00:00,000 --> 00:00:02,000\nYour caption'} />}
            {burn && <p className="mt-1 text-xs text-muted">Generate an SRT in the AI Assistant, or write your own.</p>}
          </div>
          <div className="flex flex-col justify-end gap-3">
            {current?.advisoryMaxDurationSec && <p className="text-xs text-muted">{current.label} currently recommends about {current.advisoryMaxDurationSec}s max (verify the platform's latest rules).</p>}
            <button className="btn-3d btn-amber" disabled={!file || busy} onClick={submit}>{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Rocket className="h-5 w-5" />} Prepare for {current?.label || '…'}</button>
            <ProgressBar busy={busy} stage={stage} uploadProgress={uploadProgress} ffmpegProgress={ffmpegProgress} speed={speed} progress={progress} />
          </div>
        </div>
        <ErrorNote message={error} />
        {result && <ResultCard result={result} />}
      </div>
    </div>
  );
}
