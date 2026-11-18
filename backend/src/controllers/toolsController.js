import fs from 'node:fs/promises';
import { createJob, finishJob, removeJob, jobEvents } from '../jobs/jobStore.js';
import { probe } from '../utils/ffmpeg.js';
import { AppError } from '../utils/errors.js';
import { oneOf, toNumber, safeFilename } from '../utils/validate.js';
import { SOCIAL_PRESETS } from '../config/socialPresets.js';
import * as tools from '../services/toolsService.js';

/** Wrap a tool: validates upload, probes it, creates a job, runs handler, always cleans the upload. */
function tool(type, handler, { createsFile = true } = {}) {
  return async (req, res, next) => {
    const upload = req.file;
    let job;
    try {
      if (!upload) throw new AppError(400, 'NO_FILE', 'Upload a video in the "video" field.');
      const info = await probe(upload.path);
      if (!info.video) throw new AppError(415, 'NOT_A_VIDEO', 'The file does not contain a video stream.');
      if (!createsFile) return res.json({ file: safeFilename(upload.originalname), info });
      const clientJobId = req.headers['x-job-id'] || req.body?.jobId || req.query?.jobId;
      job = createJob(type, {}, clientJobId);
      const onProgress = (prog) => jobEvents.emit(job.id, { ...prog, status: 'processing' });
      const out = await handler({ input: upload.path, dir: job.dir, info, body: req.body || {}, onProgress, duration: info.duration });
      const stat = await fs.stat(out.outputPath);
      let result = { size: stat.size };
      if (['compress', 'resize', 'trim', 'social'].includes(type)) { const o = await probe(out.outputPath); result = { size: stat.size, width: o.video?.width, height: o.video?.height, duration: o.duration, fps: o.video?.fps }; }
      finishJob(job, { filePath: out.outputPath, filename: out.filename });
      jobEvents.emit(job.id, { percent: 100, status: 'done' });
      return res.json({
        jobId: job.id, status: 'done', filename: out.filename, downloadUrl: `/api/files/${job.id}`,
        original: { size: info.size, width: info.video.width, height: info.video.height, duration: info.duration },
        result, warnings: out.warnings || [], expiresAt: job.createdAt + 30 * 60 * 1000,
      });
    } catch (e) {
      if (job) {
        jobEvents.emit(job.id, { status: 'error', error: e.message });
        await removeJob(job.id);
      }
      return next(e);
    } finally {
      if (upload) fs.rm(upload.path, { force: true }).catch(() => {});
    }
  };
}

export const analyze = tool('analyze', null, { createsFile: false });

export const compress = tool('compress', ({ input, dir, info, body, onProgress, duration }) =>
  tools.compress({ input, dir, preset: oneOf(body.preset, 'preset', ['low', 'balanced', 'high'], 'balanced'), onProgress, duration: duration || info.duration }));

export const resize = tool('resize', ({ input, dir, info, body, onProgress, duration }) =>
  tools.resize({ input, dir, ratio: oneOf(body.ratio, 'ratio', Object.keys(tools.RESIZE_TARGETS), '9:16'), mode: oneOf(body.mode, 'mode', ['fit', 'blur', 'crop'], 'fit'), onProgress, duration: duration || info.duration }));

export const trim = tool('trim', ({ input, dir, info, body, onProgress }) => {
  const start = toNumber(body.start, 'start', { min: 0, max: info.duration });
  const end = Math.min(toNumber(body.end, 'end', { min: 0.1, max: 86400 }), info.duration);
  if (end - start < 0.1) throw new AppError(400, 'INVALID_PARAMETER', 'End time must be after start time (and within the video length).');
  return tools.trim({ input, dir, start, end, onProgress });
});

export const extractAudio = tool('audio', ({ input, dir, info, body, onProgress, duration }) => {
  tools.assertAudio(info);
  return tools.extractAudio({ input, dir, format: oneOf(body.format, 'format', ['mp3', 'wav'], 'mp3'), onProgress, duration: duration || info.duration });
});

export const thumbnail = tool('thumbnail', ({ input, dir, info, body, onProgress }) =>
  tools.thumbnail({ input, dir, time: toNumber(body.time, 'time', { min: 0, max: Math.max(0, info.duration - 0.05), fallback: 0 }), format: oneOf(body.format, 'format', ['jpg', 'png'], 'jpg'), onProgress }));

export const social = tool('social', ({ input, dir, info, body, onProgress }) => {
  const presetId = oneOf(body.preset || body.presetId, 'preset', Object.keys(SOCIAL_PRESETS));
  const burn = body.burn === 'true' || body.burn === true;
  const rawCaptions = typeof body.captions === 'string' ? body.captions : (typeof body.srt === 'string' ? body.srt : '');
  const srt = burn ? rawCaptions.slice(0, 200000) : '';
  if (burn && !srt.trim()) throw new AppError(400, 'INVALID_PARAMETER', 'Provide SRT captions to burn into the video.');
  return tools.prepareSocial({ input, dir, info, presetId, mode: oneOf(body.mode, 'mode', ['fit', 'blur', 'crop'], 'blur'), srt, onProgress });
});

