import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const num = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
const root = process.env.TMP_DIR || path.join(os.tmpdir(), 'clipflow');

export const config = {
  port: num(process.env.PORT, 8080),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  uploadDir: path.join(root, 'uploads'),
  jobsDir: path.join(root, 'jobs'),
  maxUploadBytes: num(process.env.MAX_UPLOAD_MB, 200) * 1024 * 1024,
  jobTtlMs: num(process.env.JOB_TTL_MINUTES, 30) * 60 * 1000,
  processTimeoutMs: num(process.env.PROCESS_TIMEOUT_MS, 300000),
  rateLimit: num(process.env.RATE_LIMIT_PER_15MIN, 200),
  heavyRateLimit: num(process.env.HEAVY_RATE_LIMIT_PER_15MIN, 30),
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  ffprobePath: process.env.FFPROBE_PATH || 'ffprobe',
  allowDirectUrls: (process.env.ALLOW_DIRECT_URLS ?? 'true') !== 'false',
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  facebookToken: process.env.FACEBOOK_ACCESS_TOKEN || '',
  facebookGraphVersion: process.env.FACEBOOK_GRAPH_VERSION || 'v21.0',
  openaiKey: process.env.OPENAI_API_KEY || '',
  openaiTextModel: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
  openaiWhisperModel: process.env.OPENAI_WHISPER_MODEL || 'whisper-1',
};

fs.mkdirSync(config.uploadDir, { recursive: true });
fs.mkdirSync(config.jobsDir, { recursive: true });
