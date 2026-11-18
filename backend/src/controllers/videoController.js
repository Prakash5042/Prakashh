import { describeUrl, inspectUrl, spawnStream } from '../services/videoService.js';
import { getJob } from '../jobs/jobStore.js';
import { normalizeInput, safeFilename } from '../utils/validate.js';
import { AppError } from '../utils/errors.js';

export const inspect = async (req, res, next) => {
  try {
    res.json(await inspectUrl(req.body?.url));
  } catch (e) {
    next(e);
  }
};

export const options = (req, res, next) => {
  try {
    res.json(describeUrl(req.body?.url));
  } catch (e) {
    next(e);
  }
};

export const download = async (req, res, next) => {
  try {
    const { jobId, optionId, url: rawUrl, title } = req.body || {};

    if (jobId) {
      const job = getJob(jobId);
      if (!job || job.status !== 'done') {
        throw new AppError(404, 'JOB_NOT_FOUND', 'This download has expired. Fetch the video again.');
      }
      return res.json({ jobId: job.id, filename: job.filename, downloadUrl: `/api/files/${job.id}` });
    }

    if (!rawUrl) {
      throw new AppError(400, 'MISSING_URL', 'Please provide a video link to download.');
    }

    const url = normalizeInput(rawUrl);
    const chosenFormat = optionId || 'best';
    const streamUrl = `/api/video/stream?url=${encodeURIComponent(url.href)}&format=${encodeURIComponent(chosenFormat)}&title=${encodeURIComponent(title || '')}`;

    return res.json({
      downloadUrl: streamUrl,
      filename: `${safeFilename(title || 'video')}.${chosenFormat === 'audio' ? 'mp3' : 'mp4'}`,
    });
  } catch (e) {
    next(e);
  }
};

export const stream = async (req, res, next) => {
  try {
    const rawUrl = req.query.url;
    if (!rawUrl) throw new AppError(400, 'MISSING_URL', 'Missing url parameter.');

    const url = normalizeInput(rawUrl);
    const format = req.query.format || 'best';
    const rawTitle = req.query.title || 'video';
    const isAudio = format === 'audio';
    const ext = isAudio ? 'mp3' : 'mp4';
    const filename = `${safeFilename(rawTitle)}.${ext}`;
    const contentType = isAudio ? 'audio/mpeg' : 'video/mp4';

    // Set headers immediately to prompt instant browser download
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Transfer-Encoding', 'chunked');

    const child = spawnStream(url.href, format);

    child.stdout.pipe(res);

    let errorOutput = '';
    child.stderr.on('data', (d) => {
      errorOutput = (errorOutput + d.toString()).slice(-2000);
    });

    const cleanup = () => {
      try {
        child.kill('SIGKILL');
      } catch {}
    };

    req.on('close', cleanup);
    res.on('close', cleanup);

    child.on('close', (code) => {
      if (code !== 0 && !res.writableEnded) {
        // If nothing was piped yet, send error
        try {
          if (!res.headersSent) {
            res.status(500).json({ error: { message: errorOutput || 'Stream download failed.' } });
          } else {
            res.end();
          }
        } catch {}
      }
    });
  } catch (e) {
    next(e);
  }
};
