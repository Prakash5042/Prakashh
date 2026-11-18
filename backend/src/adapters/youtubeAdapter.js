import { config } from '../config/index.js';
import { fetchJson } from '../utils/http.js';
import { AppError } from '../utils/errors.js';
import { extractYouTubeId, parseIsoDuration } from '../utils/validate.js';

export const youtubeAdapter = {
  id: 'youtube',
  name: 'YouTube',
  capabilities: {
    metadata: true, embedPreview: true, download: true,
    reason: null,
    requires: 'Optional: YOUTUBE_API_KEY (adds duration).',
  },
  async inspect(url) {
    const id = extractYouTubeId(url);
    if (!id) throw new AppError(422, 'INVALID_VIDEO_URL', 'This YouTube link does not contain a video ID. Use a watch, youtu.be or Shorts link.');
    const canonicalUrl = `https://www.youtube.com/watch?v=${id}`;
    const o = await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`, { allowedHosts: ['www.youtube.com'] });
    let duration = null;
    if (config.youtubeApiKey) {
      try {
        const api = await fetchJson(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${id}&key=${config.youtubeApiKey}`, { allowedHosts: ['www.googleapis.com'] });
        duration = parseIsoDuration(api.items?.[0]?.contentDetails?.duration);
      } catch { /* duration is optional */ }
    }
    return {
      canonicalUrl, title: o.title, author: { name: o.author_name, url: o.author_url },
      thumbnail: o.thumbnail_url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, duration,
      preview: { type: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}`, aspect: url.pathname.startsWith('/shorts') ? '9/16' : '16/9' },
      source: 'youtube-oembed',
    };
  },
};
