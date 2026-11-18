import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ClipboardPaste, Download, ExternalLink, Info, Loader2, Play, Search, Sparkles, Upload, X } from 'lucide-react';
import { api, fileUrl, triggerDownload } from '../services/api.js';
import { detectPlatform } from '../utils/platform.js';
import { bytes, duration } from '../utils/format.js';
import { logActivity } from '../hooks/useActivity.js';
import { useToast } from './Toast.jsx';
import PlatformBadge from './PlatformBadge.jsx';
import ErrorNote from './ErrorNote.jsx';
import Tilt from './Tilt.jsx';

export default function Downloader() {
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [play, setPlay] = useState(false);
  const detected = useMemo(() => (url.trim() ? detectPlatform(url) : null), [url]);

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        fetchVideoWithUrl(text);
      }
    } catch {
      toast('Clipboard access blocked. Please press Ctrl+V to paste.', 'info');
    }
  }

  function clear() {
    setUrl('');
    setData(null);
    setError('');
    setSelectedOption(null);
    setPlay(false);
  }

  async function fetchVideoWithUrl(targetUrl) {
    const raw = (targetUrl || url || '').trim();
    if (!raw) {
      setError('Please paste a video link first (YouTube, Facebook, or TikTok).');
      return;
    }
    setBusy(true);
    setError('');
    setData(null);
    setPlay(false);

    try {
      const d = await api.inspect(raw);
      setData(d);
      setSelectedOption(d.options?.[0]?.id || 'best');
      logActivity({ type: 'inspect', title: d.title, platform: d.platform, url: d.canonicalUrl });
    } catch (err) {
      setError(err.message || 'Could not fetch video. Please check the URL.');
    } finally {
      setBusy(false);
    }
  }

  function handleStartDownload(optionId) {
    const chosen = optionId || selectedOption || 'best';
    setSelectedOption(chosen);

    const downloadEndpoint = data?.jobId
      ? `/api/files/${data.jobId}`
      : `/api/video/stream?url=${encodeURIComponent(data?.canonicalUrl || url.trim())}&format=${encodeURIComponent(chosen)}&title=${encodeURIComponent(data?.title || 'video')}`;

    triggerDownload(downloadEndpoint);
    toast(`Starting instant download for ${data?.title || 'video'}…`);
    logActivity({ type: 'download', title: data?.title, platform: data?.platform });
  }

  return (
    <div>
      <Tilt max={2.5} className="glass p-4 md:p-6">
        <form onSubmit={(e) => { e.preventDefault(); fetchVideoWithUrl(); }}>
          <label htmlFor="video-url" className="mb-2 block text-sm font-bold">
            Paste your video link
          </label>
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <input
                id="video-url"
                className="field !py-4 pr-24 text-base"
                placeholder="https://www.youtube.com/... or tiktok.com/... or facebook.com/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoComplete="off"
                spellCheck="false"
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
                {url && (
                  <button type="button" onClick={clear} aria-label="Clear" className="btn-ghost !p-2">
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button type="button" onClick={paste} aria-label="Paste from clipboard" className="btn-ghost !p-2">
                  <ClipboardPaste className="h-4 w-4" />
                </button>
              </div>
            </div>
            <button className="btn-3d !py-4" disabled={busy} type="submit">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              {busy ? 'Fetching Details…' : 'Fetch Video'}
            </button>
          </div>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="font-semibold">Fast download supported:</span>
          <PlatformBadge id="youtube" />
          <PlatformBadge id="facebook" />
          <PlatformBadge id="tiktok" />
          {detected && (
            <span className="ml-auto flex items-center gap-2 font-bold text-ink">
              Detected <PlatformBadge id={detected.id} />
            </span>
          )}
        </div>
        <ErrorNote message={error} />
      </Tilt>

      {data && (
        <div className="glass pop mt-6 grid gap-6 p-5 md:grid-cols-[minmax(0,340px)_1fr]">
          <div>
            <div
              className="relative overflow-hidden rounded-2xl bg-black shadow-lg"
              style={{ aspectRatio: data.preview?.aspect || '16/9', maxHeight: 520 }}
            >
              {data.preview?.type === 'video' && (
                <video controls className="h-full w-full" src={fileUrl(data.preview.src)} />
              )}
              {data.preview?.type === 'iframe' && (
                play || !data.thumbnail ? (
                  <iframe
                    title="Video preview"
                    src={data.preview.src}
                    className="h-full w-full"
                    allow="encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    loading="lazy"
                  />
                ) : (
                  <button
                    className="group relative h-full w-full block"
                    onClick={() => setPlay(true)}
                    aria-label="Load preview"
                  >
                    <img src={data.thumbnail} alt="" className="h-full w-full object-cover" />
                    <span className="absolute inset-0 grid place-items-center bg-black/35 transition group-hover:bg-black/15">
                      <span className="btn-3d !rounded-full !p-4 flex items-center justify-center">
                        <Play className="h-6 w-6 fill-white text-white translate-x-0.5" />
                      </span>
                    </span>
                  </button>
                )
              )}
              {(!data.preview || data.preview?.type === 'thumbnail') && data.thumbnail && (
                <img src={data.thumbnail} alt={data.title} className="h-full w-full object-cover" />
              )}
            </div>
            <p className="mt-2 text-xs text-muted">Direct preview from source platform.</p>
          </div>

          <div className="min-w-0">
            <PlatformBadge id={data.platform} />
            <h2 className="mt-3 break-words font-display text-2xl font-bold leading-tight">
              {data.title}
            </h2>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {data.author?.name && (
                <>
                  <dt className="text-muted">Creator</dt>
                  <dd className="font-semibold truncate">
                    {data.author.url ? (
                      <a className="underline decoration-fuchsia-400" href={data.author.url} target="_blank" rel="noopener noreferrer">
                        {data.author.name}
                      </a>
                    ) : (
                      data.author.name
                    )}
                  </dd>
                </>
              )}
              {data.duration ? (
                <>
                  <dt className="text-muted">Duration</dt>
                  <dd className="font-semibold">{duration(data.duration)}</dd>
                </>
              ) : null}
            </dl>

            {data.downloadable ? (
              <div className="mt-6 border-t border-white/10 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" /> Select Quality to Download:
                  </h3>
                  <span className="text-xs text-muted">Click any quality to download instantly</span>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {data.options.map((o) => {
                    const isSelected = selectedOption === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleStartDownload(o.id)}
                        className={`seg group flex items-center justify-between !p-3.5 text-left transition-all ${
                          isSelected ? 'ring-2 ring-emerald-500 bg-emerald-500/10' : 'hover:border-emerald-500/50'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 font-bold text-sm">
                            <span className="truncate">{o.label}</span>
                            {o.badge && (
                              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 shrink-0">
                                {o.badge}
                              </span>
                            )}
                          </div>
                          <span className="block text-xs font-medium text-muted mt-0.5">
                            {o.resolution} {o.codec ? `· ${o.codec}` : ''} {o.size ? `· ${bytes(o.size)}` : ''}
                          </span>
                        </div>
                        <span className="shrink-0 flex items-center gap-1 text-xs font-bold text-emerald-500 group-hover:scale-110 transition-transform">
                          <Download className="h-4 w-4" />
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    className="btn-3d btn-mint !py-3.5 px-6"
                    onClick={() => handleStartDownload(selectedOption)}
                  >
                    <Download className="h-5 w-5" /> Download Selected ({data.options.find(o => o.id === selectedOption)?.label || 'Best Quality'})
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Instant streaming: download begins immediately in your browser with no conversion delays.
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border p-4 border-amber-500/30 bg-amber-500/10">
                <p className="flex items-center gap-2 font-bold text-amber-500">
                  <Info className="h-5 w-5" /> Download not available
                </p>
                <p className="mt-2 text-sm">{data.downloadNote}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a className="btn-3d btn-cyan" href={data.canonicalUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-5 w-5" /> Open original
                  </a>
                  <Link className="btn-ghost" to="/tools">
                    <Upload className="h-5 w-5" /> I have the original file
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
