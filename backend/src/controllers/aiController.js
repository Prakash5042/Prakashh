import fs from 'node:fs/promises';
import { createJob, removeJob } from '../jobs/jobStore.js';
import { probe } from '../utils/ffmpeg.js';
import { AppError } from '../utils/errors.js';
import { oneOf, toSrt } from '../utils/validate.js';
import { suggestContent, transcribe } from '../services/aiService.js';
import { assertAudio, toWhisperAudio } from '../services/toolsService.js';

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function suggest(req, res, next) {
  try {
    const topic = str(req.body?.topic, 1000);
    if (!topic) throw new AppError(400, 'INVALID_PARAMETER', 'Describe your video topic first.');
    const platform = oneOf(req.body?.platform, 'platform', ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'YouTube', 'Facebook'], 'TikTok');
    const tone = oneOf(req.body?.tone, 'tone', ['fun', 'professional', 'inspiring', 'educational'], 'fun');
    res.json(await suggestContent({ topic, platform, tone, transcript: str(req.body?.transcript, 3000) }));
  } catch (e) { next(e); }
}

export async function subtitles(req, res, next) {
  const upload = req.file;
  let job;
  try {
    if (!upload) throw new AppError(400, 'NO_FILE', 'Upload a video in the "video" field.');
    const info = await probe(upload.path);
    assertAudio(info);
    if (info.duration > 3600) throw new AppError(413, 'VIDEO_TOO_LONG', 'Subtitle generation supports videos up to 60 minutes.');
    job = createJob('subtitles');
    const audio = await toWhisperAudio({ input: upload.path, dir: job.dir });
    const out = await transcribe(audio);
    res.json({ ...out, srt: toSrt(out.segments) });
  } catch (e) { next(e); } finally {
    if (job) removeJob(job.id);
    if (upload) fs.rm(upload.path, { force: true }).catch(() => {});
  }
}

export function srt(req, res, next) {
  try {
    const segments = Array.isArray(req.body?.segments) ? req.body.segments.slice(0, 5000) : null;
    if (!segments) throw new AppError(400, 'INVALID_PARAMETER', '"segments" must be an array.');
    res.json({ srt: toSrt(segments.map((s) => ({ start: Number(s.start), end: Number(s.end), text: str(s.text, 500) }))) });
  } catch (e) { next(e); }
}
