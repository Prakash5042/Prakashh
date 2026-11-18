import { useRef, useState } from 'react';
import { FileVideo, UploadCloud } from 'lucide-react';
import { bytes } from '../utils/format.js';

export default function FileDrop({ file, onFile, label = 'Drop a video here or click to browse' }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const pick = (f) => { if (f) onFile(f); };
  return (
    <div
      role="button" tabIndex={0} aria-label="Choose a video file"
      onClick={() => input.current?.click()} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}
      className="cursor-pointer rounded-3xl border-2 border-dashed p-8 text-center transition"
      style={{ borderColor: over ? '#d946ef' : 'var(--line)', background: over ? 'rgba(217,70,239,.12)' : 'var(--field)' }}
    >
      <input ref={input} type="file" accept="video/*,.mkv" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl text-white" style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)', boxShadow: '0 4px 0 #4c1d95, 0 12px 18px -6px #06b6d4' }}>
        {file ? <FileVideo className="h-7 w-7" /> : <UploadCloud className="h-7 w-7" />}
      </div>
      {file ? <p className="font-bold">{file.name} <span className="font-medium text-muted">· {bytes(file.size)}</span></p> : <p className="font-semibold">{label}</p>}
      <p className="mt-1 text-xs text-muted">MP4, MOV, WebM, MKV · only videos you own or may edit</p>
    </div>
  );
}
