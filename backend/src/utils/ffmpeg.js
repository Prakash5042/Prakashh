// Safe FFmpeg/FFprobe execution: no shell, argument arrays only, hard timeouts.
import { spawn } from 'node:child_process';
import { config } from '../config/index.js';
import { AppError } from './errors.js';

function exec(bin, args, { timeoutMs = config.processTimeoutMs, cwd, onProgress, totalDuration } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let out = ''; let err = ''; let timedOut = false;
    let progressBuf = '';
    let currentSpeed = '';
    let lastPercent = -1;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
    child.stdout.on('data', (d) => {
      if (out.length < 5e6) out += d;
      if (typeof onProgress === 'function') {
        progressBuf += d.toString('utf8');
        const lines = progressBuf.split(/\r?\n/);
        progressBuf = lines.pop();
        for (const line of lines) {
          const eq = line.indexOf('=');
          if (eq === -1) continue;
          const k = line.slice(0, eq).trim();
          const v = line.slice(eq + 1).trim();
          if (k === 'speed') {
            currentSpeed = v;
          } else if (k === 'out_time_us' || k === 'out_time_ms') {
            const us = Number(v);
            if (!Number.isNaN(us) && totalDuration > 0) {
              const durUs = totalDuration * 1_000_000;
              const pct = Math.min(99, Math.max(0, Math.round((us / durUs) * 100)));
              if (pct !== lastPercent) {
                lastPercent = pct;
                onProgress({ percent: pct, speed: currentSpeed });
              }
            }
          } else if (k === 'progress' && v === 'end') {
            onProgress({ percent: 100, speed: currentSpeed });
          }
        }
      }
    });
    child.stderr.on('data', (d) => { err = (err + d).slice(-4000); });
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e.code === 'ENOENT'
        ? new AppError(500, 'FFMPEG_MISSING', `"${bin}" was not found. Install FFmpeg or set FFMPEG_PATH / FFPROBE_PATH.`)
        : e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) return reject(new AppError(504, 'PROCESS_TIMEOUT', 'Processing took too long and was stopped.'));
      if (code !== 0) return reject(new AppError(422, 'PROCESSING_FAILED', 'FFmpeg could not process this file.', { detail: err.trim().split('\n').slice(-2).join(' ').slice(0, 300) }));
      return resolve(out);
    });
  });
}

export const runFfmpeg = (args, opts = {}) => {
  const extra = opts?.onProgress ? ['-progress', 'pipe:1'] : [];
  return exec(config.ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', ...extra, ...args], opts);
};

const fps = (r) => { const [a, b] = String(r || '0/1').split('/').map(Number); return b ? Math.round((a / b) * 100) / 100 : 0; };

export async function probe(file) {
  let raw;
  try {
    raw = await exec(config.ffprobePath, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file], { timeoutMs: 30000 });
  } catch (e) {
    if (e.code === 'PROCESSING_FAILED') throw new AppError(415, 'NOT_A_VIDEO', 'This file could not be read as a video.');
    throw e;
  }
  const data = JSON.parse(raw);
  const v = (data.streams || []).find((s) => s.codec_type === 'video' && s.disposition?.attached_pic !== 1);
  const a = (data.streams || []).find((s) => s.codec_type === 'audio');
  const f = data.format || {};
  return {
    container: f.format_name, containerLong: f.format_long_name,
    duration: Number(f.duration) || 0, size: Number(f.size) || 0, bitrate: Number(f.bit_rate) || 0,
    video: v ? { codec: v.codec_name, width: v.width, height: v.height, fps: fps(v.avg_frame_rate !== '0/0' ? v.avg_frame_rate : v.r_frame_rate), bitrate: Number(v.bit_rate) || null, pixelFormat: v.pix_fmt } : null,
    audio: a ? { codec: a.codec_name, channels: a.channels, sampleRate: Number(a.sample_rate) || null, bitrate: Number(a.bit_rate) || null } : null,
  };
}
