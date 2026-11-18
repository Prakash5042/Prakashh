// Robust yt-dlp wrapper: lists available formats, inspects metadata, and supports streaming.
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { config } from '../config/index.js';
import { AppError } from './errors.js';
import { safeFilename } from './validate.js';

const BIN = process.env.YTDLP_PATH || 'yt-dlp';

function run(args, { timeoutMs = config.processTimeoutMs } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(BIN, args, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let out = '';
    let err = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (d) => {
      if (out.length < 20e6) out += d;
    });
    child.stderr.on('data', (d) => {
      err = (err + d).slice(-8000);
    });
    child.on('error', (e) => {
      clearTimeout(timer);
      if (e.code === 'ENOENT') {
        reject(new AppError(500, 'YTDLP_MISSING', 'yt-dlp is not installed or not found in PATH.'));
      } else {
        reject(e);
      }
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) return reject(new AppError(504, 'PROCESS_TIMEOUT', 'The video request took too long and was stopped.'));
      if (code !== 0) {
        const msg = err.trim().split('\n').filter(l => l.startsWith('ERROR')).join(' ').slice(0, 300) || err.trim().split('\n').slice(-2).join(' ').slice(0, 300);
        return reject(new AppError(422, 'YTDLP_FAILED', msg || 'Could not fetch video information. The link may be invalid, private, or protected.'));
      }
      return resolve(out);
    });
  });
}

/**
 * Extract comprehensive metadata and clean quality options for any video link (YouTube, Facebook, TikTok, etc.).
 */
export async function listFormats(url) {
  const raw = await run([
    '--no-playlist',
    '--dump-single-json',
    '--no-download',
    '--no-warnings',
    '--no-check-certificates',
    url,
  ], { timeoutMs: 30000 });

  const info = JSON.parse(raw);

  const rawFormats = info.formats || [];
  const heights = new Set();
  let hasSd = false;
  let hasHd = false;

  for (const f of rawFormats) {
    if (f.height && f.height > 0) {
      heights.add(f.height);
    }
    if (f.format_id === 'sd' || f.format_note?.toLowerCase().includes('sd')) hasSd = true;
    if (f.format_id === 'hd' || f.format_note?.toLowerCase().includes('hd')) hasHd = true;
  }

  const options = [];

  // Always offer Best Quality (Auto MP4)
  options.push({
    id: 'best',
    label: 'Best Quality (Auto MP4)',
    resolution: info.width && info.height ? `${info.width}x${info.height}` : 'HD / Highest',
    format: 'MP4',
    codec: 'Auto (H.264/AAC)',
    size: info.filesize || info.filesize_approx || null,
    hasAudio: true,
    badge: 'Recommended',
  });

  // Standard resolutions check
  const standardHeights = [
    { h: 2160, label: '4K Ultra HD', id: '2160' },
    { h: 1440, label: '1440p 2K Quad HD', id: '1440' },
    { h: 1080, label: '1080p Full HD', id: '1080' },
    { h: 720, label: '720p HD', id: '720' },
    { h: 480, label: '480p SD', id: '480' },
    { h: 360, label: '360p Standard', id: '360' },
  ];

  const sortedHeights = Array.from(heights).sort((a, b) => b - a);

  if (sortedHeights.length > 0) {
    const maxHeight = sortedHeights[0];
    for (const sh of standardHeights) {
      // Include standard heights that are at or below max height
      if (maxHeight >= sh.h) {
        // Find matching format for approximate size info if any
        const match = rawFormats.find((f) => f.height === sh.h && (f.filesize || f.filesize_approx));
        options.push({
          id: sh.id,
          label: `${sh.label} · MP4`,
          resolution: `${sh.h}p`,
          format: 'MP4',
          codec: 'H.264/AAC',
          size: match?.filesize || match?.filesize_approx || null,
          hasAudio: true,
        });
      }
    }
  }

  // If Facebook or other platform with named sd/hd
  if (hasHd && !options.some(o => o.id === 'hd' || o.id === '720' || o.id === '1080')) {
    options.push({
      id: 'hd',
      label: 'HD (High Definition) · MP4',
      resolution: 'High Definition',
      format: 'MP4',
      codec: 'H.264',
      size: null,
      hasAudio: true,
    });
  }
  if (hasSd && !options.some(o => o.id === 'sd' || o.id === '480' || o.id === '360')) {
    options.push({
      id: 'sd',
      label: 'SD (Standard Definition) · MP4',
      resolution: 'Standard Definition',
      format: 'MP4',
      codec: 'H.264',
      size: null,
      hasAudio: true,
    });
  }

  // If still very few options, add common fallbacks (720p and 360p)
  if (options.length === 1) {
    options.push(
      { id: '720', label: '720p HD · MP4', resolution: '720p', format: 'MP4', codec: 'H.264', size: null, hasAudio: true },
      { id: '480', label: '480p SD · MP4', resolution: '480p', format: 'MP4', codec: 'H.264', size: null, hasAudio: true },
      { id: '360', label: '360p Low · MP4', resolution: '360p', format: 'MP4', codec: 'H.264', size: null, hasAudio: true }
    );
  }

  // Always offer Audio Only (MP3)
  options.push({
    id: 'audio',
    label: 'Audio Only (MP3)',
    resolution: 'Audio (Music/Speech)',
    format: 'MP3',
    codec: 'MP3 192k',
    size: null,
    hasAudio: true,
    badge: 'Audio',
  });

  return {
    title: info.title || info.fulltitle || 'Video',
    duration: info.duration || null,
    thumbnail: info.thumbnail || null,
    uploader: info.uploader || info.channel || info.creator || null,
    uploaderUrl: info.uploader_url || info.channel_url || null,
    width: info.width || null,
    height: info.height || null,
    extractor: info.extractor || null,
    webpageUrl: info.webpage_url || url,
    options,
  };
}

/**
 * Returns arguments to pass to yt-dlp for streaming a given format to stdout.
 */
export function getStreamArgs(url, formatId = 'best') {
  const args = [
    '--no-playlist',
    '--no-warnings',
    '--no-check-certificates',
  ];

  if (formatId === 'audio') {
    args.push('-f', 'ba/b', '-x', '--audio-format', 'mp3', '-o', '-');
  } else if (formatId === 'best') {
    args.push('-f', 'bv*+ba/b', '--merge-output-format', 'mp4', '-o', '-');
  } else if (formatId === 'hd') {
    args.push('-f', 'hd/bv*+ba/b', '--merge-output-format', 'mp4', '-o', '-');
  } else if (formatId === 'sd') {
    args.push('-f', 'sd/worst[ext=mp4]/b', '--merge-output-format', 'mp4', '-o', '-');
  } else if (['2160', '1440', '1080', '720', '480', '360'].includes(formatId)) {
    const h = Number(formatId);
    args.push('-f', `bestvideo[height<=${h}]+bestaudio/best[height<=${h}]/bv*+ba/b`, '--merge-output-format', 'mp4', '-o', '-');
  } else {
    args.push('-f', `${formatId}+ba/${formatId}/bv*+ba/b`, '--merge-output-format', 'mp4', '-o', '-');
  }

  args.push(url);
  return args;
}

/**
 * Spawn a streaming yt-dlp process.
 */
export function spawnStream(url, formatId = 'best') {
  const args = getStreamArgs(url, formatId);
  return spawn(BIN, args, {
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
}

/**
 * Download a video to destDir (fallback for file caching if needed).
 */
export async function downloadVideo(url, destDir, { formatId = 'best', maxFileSize = config.maxUploadBytes } = {}) {
  const outTemplate = path.join(destDir, '%(title).80s.%(ext)s');

  let formatSel = 'bv*+ba/b';
  if (formatId === 'audio') formatSel = 'ba/b';
  else if (formatId === 'hd') formatSel = 'hd/bv*+ba/b';
  else if (formatId === 'sd') formatSel = 'sd/b';
  else if (['2160', '1440', '1080', '720', '480', '360'].includes(formatId)) {
    const h = Number(formatId);
    formatSel = `bestvideo[height<=${h}]+bestaudio/best[height<=${h}]/bv*+ba/b`;
  } else if (formatId && formatId !== 'best') {
    formatSel = `${formatId}+ba/${formatId}/bv*+ba/b`;
  }

  const args = [
    '--no-playlist',
    '--no-warnings',
    '--no-check-certificates',
    '--merge-output-format', 'mp4',
    '-f', formatSel,
    '-o', outTemplate,
    '--max-filesize', `${Math.round(maxFileSize / (1024 * 1024))}m`,
    url,
  ];

  await run(args, { timeoutMs: config.processTimeoutMs });

  const files = await fs.promises.readdir(destDir);
  const videoFiles = files.filter((f) => /\.(mp4|mkv|webm|mov|mp3)$/i.test(f));
  if (videoFiles.length === 0) {
    throw new AppError(500, 'DOWNLOAD_FAILED', 'Could not locate the processed video file.');
  }

  let best = videoFiles[0];
  let bestSize = 0;
  for (const f of videoFiles) {
    const st = await fs.promises.stat(path.join(destDir, f));
    if (st.size > bestSize) {
      bestSize = st.size;
      best = f;
    }
  }

  const filePath = path.join(destDir, best);
  return { filePath, filename: best, size: bestSize };
}
