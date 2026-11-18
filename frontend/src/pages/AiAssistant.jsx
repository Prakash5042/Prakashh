import { useState } from 'react';
import { Captions, Copy, Download, Loader2, Sparkles, Trash2, Wand2 } from 'lucide-react';
import FileDrop from '../components/FileDrop.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import ErrorNote from '../components/ErrorNote.jsx';
import ResultCard from '../components/ResultCard.jsx';
import { api } from '../services/api.js';
import { useProcessor } from '../hooks/useProcessor.js';
import { downloadText, toSrt } from '../utils/format.js';
import { useToast } from '../components/Toast.jsx';

const copy = (t, toast) => navigator.clipboard.writeText(t).then(() => toast('Copied to clipboard.'), () => toast('Copy failed.', 'error'));

function Ideas() {
  const toast = useToast();
  const [f, setF] = useState({ topic: '', platform: 'TikTok', tone: 'fun' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [out, setOut] = useState(null);
  async function go() {
    setBusy(true); setErr(''); setOut(null);
    try { setOut(await api.suggest(f)); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <section className="glass p-5 md:p-7">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><Sparkles className="h-6 w-6 text-amber-400" /> Titles, description & hashtags</h2>
      <textarea className="field mt-4 h-28" placeholder="What is your video about?" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <select className="field" value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })} aria-label="Platform">{['TikTok', 'Instagram Reels', 'YouTube Shorts', 'YouTube', 'Facebook'].map((p) => <option key={p}>{p}</option>)}</select>
        <select className="field" value={f.tone} onChange={(e) => setF({ ...f, tone: e.target.value })} aria-label="Tone">{['fun', 'professional', 'inspiring', 'educational'].map((p) => <option key={p}>{p}</option>)}</select>
      </div>
      <button className="btn-3d btn-amber mt-4 w-full" disabled={busy || !f.topic.trim()} onClick={go}>{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />} Generate</button>
      <ErrorNote message={err} />
      {out && (
        <div className="pop mt-5 space-y-4 text-sm">
          <div><div className="mb-1 font-bold">Titles</div>{out.titles.map((t) => <button key={t} className="btn-ghost mb-2 mr-2 text-left" onClick={() => copy(t, toast)}><Copy className="h-4 w-4 shrink-0" />{t}</button>)}</div>
          <div><div className="mb-1 font-bold">Description</div><p className="rounded-2xl p-3" style={{ background: 'var(--field)' }}>{out.description}</p><button className="btn-ghost mt-2" onClick={() => copy(out.description, toast)}><Copy className="h-4 w-4" /> Copy</button></div>
          <div><div className="mb-1 font-bold">Hashtags</div><p className="font-semibold text-fuchsia-500">{out.hashtags.join(' ')}</p><button className="btn-ghost mt-2" onClick={() => copy(out.hashtags.join(' '), toast)}><Copy className="h-4 w-4" /> Copy all</button></div>
        </div>
      )}
    </section>
  );
}

function Subtitles() {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [segments, setSegments] = useState(null);
  const gen = useProcessor(); const burn = useProcessor();

  async function generate() {
    setSegments(null); burn.reset();
    const r = await gen.run('ai/subtitles', file, {});
    if (r) setSegments(r.segments);
  }
  const edit = (i, text) => setSegments((s) => s.map((x, j) => (j === i ? { ...x, text } : x)));
  const tidy = () => setSegments((s) => s.map((x) => { const t = x.text.replace(/\s+/g, ' ').trim(); return { ...x, text: t.charAt(0).toUpperCase() + t.slice(1) }; }));
  const ts = (n) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;

  return (
    <section className="glass p-5 md:p-7">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><Captions className="h-6 w-6 text-cyan-400" /> Subtitles (Whisper)</h2>
      <p className="mb-4 mt-1 text-sm text-muted">Upload a video, generate captions, correct them, export SRT or burn them in.</p>
      <FileDrop file={file} onFile={(f) => { setFile(f); setSegments(null); gen.reset(); burn.reset(); }} />
      <button className="btn-3d btn-cyan mt-4 w-full" disabled={!file || gen.busy} onClick={generate}>{gen.busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Captions className="h-5 w-5" />} Generate subtitles</button>
      <ProgressBar busy={gen.busy} stage={gen.stage} uploadProgress={gen.uploadProgress} ffmpegProgress={gen.ffmpegProgress} speed={gen.speed} progress={gen.progress} />
      <ErrorNote message={gen.error} />
      {segments && (
        <div className="pop mt-5">
          <div className="mb-3 flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={tidy}><Wand2 className="h-4 w-4" /> Auto-tidy text</button>
            <button className="btn-ghost" onClick={() => downloadText('subtitles.srt', toSrt(segments))}><Download className="h-4 w-4" /> Download .srt</button>
          </div>
          <div className="max-h-80 space-y-2 overflow-auto pr-1">
            {segments.map((s, i) => (
              <div key={i} className="flex items-center gap-2"><span className="w-20 shrink-0 text-xs font-bold text-muted">{ts(s.start)}–{ts(s.end)}</span>
                <input className="field !py-2" value={s.text} onChange={(e) => edit(i, e.target.value)} aria-label={`Caption ${i + 1}`} />
                <button className="btn-ghost !p-2" aria-label="Delete caption" onClick={() => setSegments((x) => x.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button></div>))}
          </div>
          <button className="btn-3d btn-mint mt-4 w-full" disabled={burn.busy} onClick={async () => { const r = await burn.run('social/prepare', file, { preset: 'original', mode: 'fit', burn: 'true', captions: toSrt(segments) }); if (r) toast('Captions burned in.'); }}>
            {burn.busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Captions className="h-5 w-5" />} Burn captions into video
          </button>
          <ProgressBar busy={burn.busy} stage={burn.stage} uploadProgress={burn.uploadProgress} ffmpegProgress={burn.ffmpegProgress} speed={burn.speed} progress={burn.progress} />
          <ErrorNote message={burn.error} />
          {burn.result && <ResultCard result={burn.result} />}
        </div>
      )}
    </section>
  );
}

export default function AiAssistant() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-4xl font-bold">AI <span className="text-grad">Assistant</span></h1>
      <p className="mb-6 mt-2 text-muted">Runs through the secure backend. Requires <code className="rounded bg-violet-500/20 px-1.5">OPENAI_API_KEY</code> in <code className="rounded bg-violet-500/20 px-1.5">backend/.env</code>. Without it you'll see a clear setup message.</p>
      <div className="grid items-start gap-6 lg:grid-cols-2"><Ideas /><Subtitles /></div>
    </div>
  );
}
