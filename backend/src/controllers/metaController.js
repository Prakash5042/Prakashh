import fs from 'node:fs';
import path from 'node:path';
import { adapters } from '../adapters/index.js';
import { config } from '../config/index.js';
import { SOCIAL_PRESETS } from '../config/socialPresets.js';
import { getJob, publicJob, UUID_RE, jobEvents } from '../jobs/jobStore.js';
import { AppError } from '../utils/errors.js';
import { safeFilename } from '../utils/validate.js';

const MIME = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mkv': 'video/x-matroska', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.jpg': 'image/jpeg', '.png': 'image/png' };

export const health = (_req, res) => res.json({ ok: true, ai: Boolean(config.openaiKey), directUrls: config.allowDirectUrls });

export const platforms = (_req, res) => res.json({
  platforms: Object.values(adapters).map((a) => ({ id: a.id, name: a.name, ...a.capabilities })),
  directFiles: { enabled: config.allowDirectUrls, note: 'Direct links to MP4/MOV/WebM/MKV files you are allowed to use can be fetched and downloaded.' },
  limits: { maxUploadMb: config.maxUploadBytes / 1024 / 1024, jobTtlMinutes: config.jobTtlMs / 60000 },
});

export const presets = (_req, res) => res.json({ presets: Object.entries(SOCIAL_PRESETS).map(([id, p]) => ({ id, ...p })) });

export const status = (req, res, next) => {
  const job = getJob(req.params.jobId);
  if (!job) return next(new AppError(404, 'JOB_NOT_FOUND', 'Job not found or expired.'));
  return res.json(publicJob(job));
};

export const file = (req, res, next) => {
  const job = getJob(req.params.jobId);
  if (!job || job.status !== 'done' || !job.filePath || !fs.existsSync(job.filePath)) return next(new AppError(404, 'FILE_NOT_FOUND', 'This file has expired. Run the operation again.'));
  const type = MIME[path.extname(job.filePath).toLowerCase()] || 'application/octet-stream';
  res.setHeader('Content-Type', type);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.query.inline === '1') return res.sendFile(job.filePath);
  return res.download(job.filePath, safeFilename(job.filename));
};

export const progressStream = (req, res, next) => {
  const { jobId } = req.params;
  if (!UUID_RE.test(String(jobId))) return next(new AppError(400, 'INVALID_JOB_ID', 'Invalid job ID format.'));

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const existing = getJob(jobId);
  if (existing && existing.status === 'done') {
    res.write(`data: ${JSON.stringify({ percent: 100, status: 'done' })}\n\n`);
    return res.end();
  }

  res.write(`data: ${JSON.stringify({ percent: 0, status: 'connected' })}\n\n`);

  let cleaned = false;
  let pingTimer;

  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    clearInterval(pingTimer);
    jobEvents.off(jobId, onProgress);
  }

  const onProgress = (data) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (data.status === 'done' || data.status === 'error') {
        cleanup();
        res.end();
      }
    } catch {
      cleanup();
    }
  };

  pingTimer = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { cleanup(); }
  }, 15000);

  jobEvents.on(jobId, onProgress);
  req.on('close', cleanup);
};
