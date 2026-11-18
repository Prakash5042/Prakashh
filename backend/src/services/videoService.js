import path from 'node:path';
import { adapters } from '../adapters/index.js';
import { config } from '../config/index.js';
import { createJob, finishJob, removeJob, getJob } from '../jobs/jobStore.js';
import { downloadToFile } from '../utils/http.js';
import { probe } from '../utils/ffmpeg.js';
import { listFormats, downloadVideo, spawnStream } from '../utils/ytdlp.js';
import { AppError } from '../utils/errors.js';
import { detectPlatform, normalizeInput, safeFilename, extractYouTubeId, extractTikTokId } from '../utils/validate.js';

const VIDEO_EXT = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv']);

export function describeUrl(raw) {
  const url = normalizeInput(raw);
  const platform = detectPlatform(url);
  if (platform) return { platform, platformName: adapters[platform]?.name || platform, capabilities: { metadata: true, embedPreview: true, download: true, reason: null }, options: [] };
  if (!config.allowDirectUrls) throw new AppError(422, 'UNSUPPORTED_PLATFORM', 'Only TikTok, Facebook and YouTube links are supported.');
  return { platform: 'direct', platformName: 'Direct file', capabilities: { metadata: true, embedPreview: true, download: true, reason: null }, options: [] };
}

async function inspectDirect(url) {
  const ext = path.extname(url.pathname).toLowerCase();
  if (!VIDEO_EXT.has(ext)) throw new AppError(422, 'UNSUPPORTED_PLATFORM', 'Supported links: TikTok, Facebook, YouTube, or a direct link to an MP4/MOV/WebM/MKV file you are allowed to use.');
  const job = createJob('download');
  const base = safeFilename(path.basename(url.pathname), `video${ext}`);
  const file = path.join(job.dir, `source${ext}`);
  try {
    await downloadToFile(url.href, file, { maxBytes: config.maxUploadBytes, accept: (t) => t.startsWith('video/') || t === 'application/octet-stream' });
    const info = await probe(file);
    if (!info.video) throw new AppError(415, 'NOT_A_VIDEO', 'The file does not contain a video stream.');
    finishJob(job, { filePath: file, filename: base });
    const res = `${info.video.width}x${info.video.height}`;
    return {
      platform: 'direct', platformName: 'Direct file', jobId: job.id, canonicalUrl: url.href,
      title: base, author: null, thumbnail: null, duration: info.duration,
      preview: { type: 'video', src: `/api/files/${job.id}?inline=1` },
      downloadable: true, options: [
        { id: 'best', label: `Original (${res})`, resolution: res, format: 'MP4', size: info.size, codec: info.video.codec, hasAudio: true, badge: 'Original' },
        { id: 'audio', label: 'Audio Only (MP3)', resolution: 'Audio', format: 'MP3', size: null, codec: 'MP3', hasAudio: true, badge: 'Audio' }
      ],
      expiresAt: job.createdAt + config.jobTtlMs, source: 'direct-file', info,
    };
  } catch (e) { await removeJob(job.id); throw e; }
}

export async function inspectUrl(raw) {
  const url = normalizeInput(raw);
  const platform = detectPlatform(url) || 'web';

  // 1. Fast direct file links check
  const ext = path.extname(url.pathname).toLowerCase();
  if (VIDEO_EXT.has(ext)) {
    return inspectDirect(url);
  }

  // 2. Comprehensive inspect via yt-dlp (handles YouTube, TikTok, Facebook, etc. without fragile oEmbed timeouts)
  try {
    const ytInfo = await listFormats(url.href);

    // Build embed preview if possible
    let preview = null;
    const ytId = extractYouTubeId(url);
    if (ytId) {
      preview = {
        type: 'iframe',
        src: `https://www.youtube-nocookie.com/embed/${ytId}`,
        aspect: url.pathname.startsWith('/shorts') ? '9/16' : '16/9',
      };
    } else if (platform === 'facebook') {
      preview = {
        type: 'iframe',
        src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.href)}&show_text=false&width=560`,
        aspect: '16/9',
      };
    } else if (platform === 'tiktok') {
      const ttId = extractTikTokId(url);
      if (ttId) {
        preview = {
          type: 'iframe',
          src: `https://www.tiktok.com/embed/v2/${ttId}`,
          aspect: '9/16',
        };
      }
    }

    return {
      platform,
      platformName: adapters[platform]?.name || ytInfo.extractor || 'Web Video',
      canonicalUrl: ytInfo.webpageUrl || url.href,
      title: ytInfo.title,
      author: ytInfo.uploader ? { name: ytInfo.uploader, url: ytInfo.uploaderUrl } : null,
      thumbnail: ytInfo.thumbnail,
      duration: ytInfo.duration,
      preview: preview || (ytInfo.thumbnail ? { type: 'thumbnail', src: ytInfo.thumbnail, aspect: '16/9' } : null),
      downloadable: true,
      options: ytInfo.options,
      downloadNote: null,
      source: 'ytdlp',
    };
  } catch (err) {
    // If yt-dlp failed, check if it's an unsupported platform or timeout
    throw new AppError(422, 'INSPECT_FAILED', err.message || 'Could not fetch information for this video. Please ensure the link is public and accessible.');
  }
}

export { spawnStream };
