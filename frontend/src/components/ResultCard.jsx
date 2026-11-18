import { Download, Sparkles, TriangleAlert } from 'lucide-react';
import { bytes } from '../utils/format.js';
import { fileUrl, triggerDownload } from '../services/api.js';

export default function ResultCard({ result }) {
  const name = result.filename || '';
  const isAudio = /\.(mp3|wav)$/i.test(name); const isImage = /\.(jpg|png)$/i.test(name);
  const delta = result.original?.size && result.result?.size ? Math.round((1 - result.result.size / result.original.size) * 100) : null;
  return (
    <div className="glass pop mt-6 p-5">
      <div className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><Sparkles className="h-5 w-5 text-amber-400" /> Ready: {name}</div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl bg-black/80">
          {isImage ? <img src={fileUrl(result.downloadUrl, true)} alt="Extracted frame" className="w-full" />
            : isAudio ? <audio controls src={fileUrl(result.downloadUrl, true)} className="w-full p-3" />
              : <video controls src={fileUrl(result.downloadUrl, true)} className="max-h-96 w-full" />}
        </div>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Original size" value={bytes(result.original?.size)} />
            <Stat label="New size" value={bytes(result.result?.size)} />
            {result.result?.width ? <Stat label="Resolution" value={`${result.result.width}×${result.result.height}`} /> : null}
            {delta !== null && delta > 0 ? <Stat label="Smaller by" value={`${delta}%`} /> : null}
          </div>
          {result.warnings?.map((w) => <p key={w} className="flex gap-2 rounded-xl bg-amber-500/15 p-3 text-amber-600 dark:text-amber-300"><TriangleAlert className="h-4 w-4 shrink-0" />{w}</p>)}
          <button className="btn-3d btn-mint w-full" onClick={() => triggerDownload(result.downloadUrl)}><Download className="h-5 w-5" /> Download</button>
          <p className="text-xs text-muted">Files are deleted from the server automatically after about 30 minutes.</p>
        </div>
      </div>
    </div>
  );
}

export function Stat({ label, value }) {
  return <div className="rounded-2xl border p-3" style={{ borderColor: 'var(--line)', background: 'var(--field)' }}><div className="text-xs font-semibold text-muted">{label}</div><div className="font-display text-lg font-bold">{value}</div></div>;
}
