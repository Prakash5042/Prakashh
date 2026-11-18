import { config } from '../config/index.js';
import { fetchJson, safeFetch } from '../utils/http.js';
import { AppError } from '../utils/errors.js';
import { isFacebookShortLink, looksLikeFacebookVideo } from '../utils/validate.js';

const HOSTS = ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com', 'fb.watch', 'fb.com'];

export const facebookAdapter = {
  id: 'facebook',
  name: 'Facebook',
  capabilities: {
    metadata: Boolean(config.facebookToken), embedPreview: true, download: true,
    reason: null,
    requires: 'Optional: FACEBOOK_ACCESS_TOKEN ("APP_ID|CLIENT_TOKEN") and Meta oEmbed Read approval for metadata.',
  },
  async inspect(url) {
    let target = url;
    if (isFacebookShortLink(url)) {
      const { res, url: finalUrl } = await safeFetch(url, { allowedHosts: HOSTS });
      await res.body?.cancel().catch(() => {});
      if (!/login|checkpoint/.test(finalUrl.pathname)) target = finalUrl;
    }
    if (!looksLikeFacebookVideo(target)) throw new AppError(422, 'INVALID_VIDEO_URL', 'This does not look like a Facebook video link (expected /videos/, /reel/, /watch/ or fb.watch).');
    const canonicalUrl = `https://www.facebook.com${target.pathname}${target.search}`;
    const base = {
      canonicalUrl, title: 'Facebook video', author: null, thumbnail: null, duration: null,
      preview: { type: 'iframe', src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(canonicalUrl)}&show_text=false&width=560`, aspect: '16/9' },
      source: 'facebook-embed',
    };
    if (!config.facebookToken) return { ...base, notices: ['Metadata is unavailable without a Meta app token (FACEBOOK_ACCESS_TOKEN). Preview uses the official Facebook embed and only works for public videos.'] };
    const o = await fetchJson(`https://graph.facebook.com/${config.facebookGraphVersion}/oembed_video?url=${encodeURIComponent(canonicalUrl)}&omitscript=true&access_token=${encodeURIComponent(config.facebookToken)}`, { allowedHosts: ['graph.facebook.com'] });
    return { ...base, author: o.author_name ? { name: o.author_name, url: o.author_url } : null, source: 'facebook-oembed' };
  },
};
