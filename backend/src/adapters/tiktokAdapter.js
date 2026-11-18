import { fetchJson, safeFetch } from '../utils/http.js';
import { AppError } from '../utils/errors.js';
import { extractTikTokId, isTikTokShortLink } from '../utils/validate.js';

const HOSTS = ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'];

export const tiktokAdapter = {
  id: 'tiktok',
  name: 'TikTok',
  capabilities: {
    metadata: true, embedPreview: true, download: true,
    reason: null,
    requires: 'No credentials needed for oEmbed.',
  },
  async inspect(url) {
    let target = url;
    if (isTikTokShortLink(url)) {
      const { res, url: finalUrl } = await safeFetch(url, { allowedHosts: HOSTS });
      await res.body?.cancel().catch(() => {});
      target = finalUrl;
    }
    const id = extractTikTokId(target);
    if (!id) throw new AppError(422, 'INVALID_VIDEO_URL', 'Could not find a TikTok video in this link. Use a link like tiktok.com/@user/video/123…');
    const canonicalUrl = `https://www.tiktok.com${target.pathname.replace(/\/$/, '')}`;
    const o = await fetchJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(canonicalUrl)}`, { allowedHosts: ['www.tiktok.com'] });
    return {
      canonicalUrl, title: o.title || 'TikTok video', author: { name: o.author_name, url: o.author_url },
      thumbnail: o.thumbnail_url || null, duration: null,
      preview: { type: 'iframe', src: `https://www.tiktok.com/embed/v2/${o.embed_product_id || id}`, aspect: '9/16' },
      source: 'tiktok-oembed',
    };
  },
};
