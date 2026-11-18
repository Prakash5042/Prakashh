// All FFmpeg operations. Inputs are validated by the controller; args are always arrays (no shell).
import path from 'node:path';
import fs from 'node:fs/promises';
import { runFfmpeg } from '../utils/ffmpeg.js';
import { AppError } from '../utils/errors.js';
import { SOCIAL_PRESETS } from '../config/socialPresets.js';

const H264 = (crf) => ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), '-pix_fmt', 'yuv420p'];
const AAC = (br = '128k') => ['-c:a', 'aac', '-b:a', br, '-movflags', '+faststart'];

export const RESIZE_TARGETS = {
  '9:16': [1080, 1920], '16:9': [1920, 1080], '1:1': [1080, 1080], '4:5': [1080, 1350],
};

/** Build a filter graph that never stretches: fit (bars), blur (blurred bars) or crop (fill). */
export function buildGraph(mode, W, H, extras = []) {
  const tail = ['setsar=1', ...extras].join(',');
  if (mode === 'crop') return `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},${tail}[v]`;
  if (mode === 'blur') {
    return `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=20:5[bg];[0:v]scale=${W}:${H}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,${tail}[v]`;
  }
  return `[0:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,${tail}[v]`;
}

export async function compress({ input, dir, preset, onProgress, duration }) {
  const cfg = { low: { crf: 23, ab: '128k', scale: false }, balanced: { crf: 28, ab: '96k', scale: false }, high: { crf: 33, ab: '64k', scale: true } }[preset];
  const out = path.join(dir, 'compressed.mp4');
  const vf = cfg.scale ? ['-vf', "scale='min(1280,iw)':-2"] : ['-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2'];
  await runFfmpeg(['-i', input, ...vf, ...H264(cfg.crf), ...AAC(cfg.ab), out], { onProgress, totalDuration: duration });
  return { outputPath: out, filename: 'compressed.mp4' };
}

export async function resize({ input, dir, ratio, mode, onProgress, duration }) {
  const [W, H] = RESIZE_TARGETS[ratio];
  const out = path.join(dir, `resized-${ratio.replace(':', 'x')}.mp4`);
  await runFfmpeg(['-i', input, '-filter_complex', buildGraph(mode, W, H), '-map', '[v]', '-map', '0:a?', ...H264(21), ...AAC(), out], { onProgress, totalDuration: duration });
  return { outputPath: out, filename: path.basename(out) };
}

export async function trim({ input, dir, start, end, onProgress }) {
  const out = path.join(dir, 'trimmed.mp4');
  await runFfmpeg(['-ss', String(start), '-i', input, '-t', String(end - start), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', ...H264(20), ...AAC(), out], { onProgress, totalDuration: end - start });
  return { outputPath: out, filename: 'trimmed.mp4' };
}

export async function extractAudio({ input, dir, format, onProgress, duration }) {
  const out = path.join(dir, `audio.${format}`);
  const codec = format === 'mp3' ? ['-c:a', 'libmp3lame', '-q:a', '2'] : ['-c:a', 'pcm_s16le'];
  await runFfmpeg(['-i', input, '-vn', '-map', '0:a:0', ...codec, out], { onProgress, totalDuration: duration });
  return { outputPath: out, filename: `audio.${format}` };
}

export async function thumbnail({ input, dir, time, format, onProgress }) {
  const out = path.join(dir, `thumbnail.${format}`);
  await runFfmpeg(['-ss', String(time), '-i', input, '-frames:v', '1', ...(format === 'jpg' ? ['-q:v', '2'] : []), out], { onProgress, totalDuration: 1 });
  return { outputPath: out, filename: `thumbnail.${format}` };
}

export async function prepareSocial({ input, dir, info, presetId, mode, srt, onProgress }) {
  const p = SOCIAL_PRESETS[presetId];
  const extras = [];
  if (p.fps && info.video.fps > p.fps) extras.push(`fps=${p.fps}`);
  if (srt) {
    await fs.writeFile(path.join(dir, 'captions.srt'), srt, 'utf8');
    extras.push("subtitles=captions.srt:force_style='FontSize=10,Outline=1,Shadow=0,Alignment=2,MarginV=30'");
  }
  const W = p.width || info.video.width - (info.video.width % 2);
  const H = p.height || info.video.height - (info.video.height % 2);
  const out = path.join(dir, `${presetId}.mp4`);
  const graph = p.width ? buildGraph(mode, W, H, extras) : `[0:v]${['scale=trunc(iw/2)*2:trunc(ih/2)*2', 'setsar=1', ...extras].join(',')}[v]`;
  await runFfmpeg(['-i', input, '-filter_complex', graph, '-map', '[v]', '-map', '0:a?', ...H264(21), ...AAC(), out], { cwd: dir, onProgress, totalDuration: info?.duration });
  const warnings = [];
  if (p.advisoryMaxDurationSec && info.duration > p.advisoryMaxDurationSec) warnings.push(`This video is ${Math.round(info.duration)}s long; ${p.label} currently recommends up to about ${p.advisoryMaxDurationSec}s. Verify the platform's latest limits.`);
  return { outputPath: out, filename: `${presetId}.mp4`, warnings };
}

export async function toWhisperAudio({ input, dir }) {
  const out = path.join(dir, 'speech.mp3');
  await runFfmpeg(['-i', input, '-vn', '-map', '0:a:0', '-ac', '1', '-ar', '16000', '-c:a', 'libmp3lame', '-b:a', '48k', out]);
  return out;
}

export function assertAudio(info) {
  if (!info.audio) throw new AppError(422, 'NO_AUDIO', 'This video has no audio track.');
}
