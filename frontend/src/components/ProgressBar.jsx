export default function ProgressBar({ busy, stage, uploadProgress, ffmpegProgress, speed, progress }) {
  if (!busy) return null;

  const isUploading = stage === 'uploading' || (uploadProgress !== undefined && uploadProgress < 100);
  const isProcessing = stage === 'processing' || (!isUploading && busy);
  const hasRealFfmpeg = isProcessing && typeof ffmpegProgress === 'number' && ffmpegProgress > 0;

  let label = 'Processing with FFmpeg…';
  if (isUploading) {
    label = 'Uploading…';
  } else if (speed && speed !== 'done') {
    label = `Processing with FFmpeg… (${speed})`;
  }

  const percent = isUploading
    ? (uploadProgress ?? progress ?? 0)
    : (hasRealFfmpeg ? ffmpegProgress : 100);

  const isIndeterminate = isProcessing && !hasRealFfmpeg;

  return (
    <div className="mt-4" aria-live="polite">
      <div className="mb-1 flex justify-between text-xs font-semibold text-muted">
        <span>{label}</span>
        <span>{isUploading ? `${uploadProgress ?? progress}%` : (hasRealFfmpeg ? `${ffmpegProgress}%` : '')}</span>
      </div>
      <div
        className={`relative h-3 overflow-hidden rounded-full ${isIndeterminate ? 'indeterminate' : ''}`}
        style={{ background: 'var(--line)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, Math.max(0, percent))}%`,
            background: 'linear-gradient(90deg,#06b6d4,#7c3aed,#d946ef)',
            transition: 'width .2s ease',
          }}
        />
      </div>
    </div>
  );
}
