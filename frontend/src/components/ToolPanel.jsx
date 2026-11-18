import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Play, Timer } from 'lucide-react';
import FileDrop from './FileDrop.jsx';
import ProgressBar from './ProgressBar.jsx';
import ErrorNote from './ErrorNote.jsx';
import ResultCard, { Stat } from './ResultCard.jsx';
import { useProcessor } from '../hooks/useProcessor.js';
import { logActivity } from '../hooks/useActivity.js';
import { useToast } from './Toast.jsx';
import { bytes, duration, kbps } from '../utils/format.js';

const DEFAULTS = {
  compress: { preset: 'balanced' }, resize: { ratio: '9:16', mode: 'fit' }, trim: { start: 0, end: 0 },
  audio: { format: 'mp3' }, thumbnail: { time: 0, format: 'jpg' }, analyze: {},
};
const PRESETS = [['low', 'Low compression', 'Best quality, modest savings'], ['balanced', 'Balanced', 'Great quality, good savings'], ['high', 'High compression', 'Smallest file, caps at 720p']];

function Seg({ value, current, onChange, children }) {
  return <button type="button" className="seg" aria-pressed={current === value} onClick={() => onChange(value)}>{children}</button>;
}

export default function ToolPanel({ tool }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [opts, setOpts] = useState(DEFAULTS[tool.id]);
  const video = useRef(null);
  const { run, busy, stage, uploadProgress, ffmpegProgress, speed, progress, result, error, reset } = useProcessor();
  const src = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => src && URL.revokeObjectURL(src), [src]);
  useEffect(() => { setFile(null); setOpts(DEFAULTS[tool.id]); reset(); }, [tool.id, reset]);

  const set = (k) => (v) => setOpts((o) => ({ ...o, [k]: v }));
  const now = () => Number((video.current?.currentTime ?? 0).toFixed(2));

  async function submit() {
    const r = await run(tool.route, file, opts);
    if (r) { toast(`${tool.title} finished.`); logActivity({ type: tool.id, title: file.name, platform: 'file' }); }
  }

  return (
    <div className="glass p-5 md:p-7">
      <h2 className="font-display text-2xl font-bold">{tool.title}</h2>
      <p className="mb-5 text-sm text-muted">{tool.desc}</p>
      <FileDrop file={file} onFile={(f) => { setFile(f); reset(); }} />

      {file && (
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div>
            <video ref={video} src={src} controls className="w-full rounded-2xl bg-black" style={{ maxHeight: 360 }}
              onLoadedMetadata={(e) => tool.id === 'trim' && setOpts({ start: 0, end: Number(e.currentTarget.duration.toFixed(2)) })} />
            <p className="mt-1 text-xs text-muted">Local preview. Nothing is uploaded until you press the action button.</p>
          </div>
          <div className="space-y-5">
            {tool.id === 'compress' && <div className="grid gap-2">{PRESETS.map(([v, l, d]) => (
              <button key={v} type="button" className="seg !p-3 text-left" aria-pressed={opts.preset === v} onClick={() => set('preset')(v)}>{l}<span className="block text-xs font-medium opacity-80">{d}</span></button>))}
              <p className="text-xs text-muted">Results vary by video; no fixed compression ratio is promised.</p></div>}

            {tool.id === 'resize' && <>
              <div><div className="mb-2 text-sm font-bold">Aspect ratio</div><div className="flex flex-wrap gap-2">
                {[['9:16', 'Vertical'], ['16:9', 'Landscape'], ['1:1', 'Square'], ['4:5', 'Portrait feed']].map(([v, l]) => <Seg key={v} value={v} current={opts.ratio} onChange={set('ratio')}>{v} · {l}</Seg>)}</div></div>
              <div><div className="mb-2 text-sm font-bold">Framing (never stretched)</div><div className="flex flex-wrap gap-2">
                <Seg value="fit" current={opts.mode} onChange={set('mode')}>Fit (black bars)</Seg><Seg value="blur" current={opts.mode} onChange={set('mode')}>Fit (blurred bars)</Seg><Seg value="crop" current={opts.mode} onChange={set('mode')}>Crop to fill</Seg></div></div></>}

            {tool.id === 'trim' && <div className="grid grid-cols-2 gap-3">
              {[['start', 'Start (s)'], ['end', 'End (s)']].map(([k, l]) => (
                <label key={k} className="text-sm font-bold">{l}<input type="number" min="0" step="0.1" className="field mt-1" value={opts[k]} onChange={(e) => set(k)(e.target.value)} />
                  <button type="button" className="btn-ghost mt-2 w-full !py-2 text-xs" onClick={() => set(k)(now())}><Timer className="h-4 w-4" /> Use player time</button></label>))}
              <p className="col-span-2 text-xs text-muted">Scrub the player, then use "Use player time" for start and end.</p></div>}

            {tool.id === 'audio' && <div><div className="mb-2 text-sm font-bold">Format</div><div className="flex gap-2"><Seg value="mp3" current={opts.format} onChange={set('format')}>MP3</Seg><Seg value="wav" current={opts.format} onChange={set('format')}>WAV (lossless)</Seg></div></div>}

            {tool.id === 'thumbnail' && <>
              <label className="block text-sm font-bold">Frame time (s)<input type="number" min="0" step="0.1" className="field mt-1" value={opts.time} onChange={(e) => set('time')(e.target.value)} /></label>
              <button type="button" className="btn-ghost" onClick={() => set('time')(now())}><Timer className="h-4 w-4" /> Use current frame</button>
              <div className="flex gap-2"><Seg value="jpg" current={opts.format} onChange={set('format')}>JPG</Seg><Seg value="png" current={opts.format} onChange={set('format')}>PNG</Seg></div></>}

            <button className="btn-3d w-full" style={{ '--c1': tool.grad.match(/#\w+/g)[0], '--c2': tool.grad.match(/#\w+/g)[1], '--edge': tool.edge }} disabled={busy} onClick={submit}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />} {tool.id === 'analyze' ? 'Analyze video' : `Run ${tool.title}`}
            </button>
            <ProgressBar busy={busy} stage={stage} uploadProgress={uploadProgress} ffmpegProgress={ffmpegProgress} speed={speed} progress={progress} />
          </div>
        </div>
      )}
      <ErrorNote message={error} />
      {result && tool.id === 'analyze' && <AnalysisGrid info={result.info} />}
      {result && tool.id !== 'analyze' && <ResultCard result={result} />}
    </div>
  );
}

function AnalysisGrid({ info }) {
  const v = info.video; const a = info.audio;
  const rows = [
    ['Resolution', `${v.width}×${v.height}`], ['Duration', duration(info.duration)], ['Frame rate', `${v.fps} fps`], ['Container', info.container?.split(',')[0]],
    ['File size', bytes(info.size)], ['Video codec', v.codec], ['Audio codec', a?.codec || 'none'], ['Total bitrate', kbps(info.bitrate)],
    ['Video bitrate', kbps(v.bitrate)], ['Pixel format', v.pixelFormat || '—'], ['Audio channels', a?.channels ?? '—'], ['Sample rate', a?.sampleRate ? `${a.sampleRate} Hz` : '—'],
  ];
  return <div className="pop mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">{rows.map(([l, val]) => <Stat key={l} label={l} value={val} />)}</div>;
}
