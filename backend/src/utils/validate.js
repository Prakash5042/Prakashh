import { AppError } from './errors.js';

const HOSTS = {
  youtube: ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'],
  tiktok: ['tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'],
  facebook: ['facebook.com', 'm.facebook.com', 'web.facebook.com', 'fb.watch', 'fb.com'],
};

export function normalizeInput(raw) {
  if (typeof raw !== 'string' || !raw.trim()) throw new AppError(400, 'INVALID_URL', 'Please paste a video link.');
  let text = raw.trim();
  if (text.length > 2048) throw new AppError(400, 'INVALID_URL', 'That link is too long.');
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `https://${text}`;
  let url;
  try { url = new URL(text); } catch { throw new AppError(400, 'INVALID_URL', 'That does not look like a valid link.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new AppError(400, 'INVALID_URL', 'Only http(s) links are supported.');
  if (url.username || url.password) throw new AppError(400, 'INVALID_URL', 'Links with credentials are not allowed.');
  return url;
}

export function detectPlatform(url) {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  for (const [platform, hosts] of Object.entries(HOSTS)) if (hosts.includes(host)) return platform;
  return null;
}

export function extractYouTubeId(url) {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const ok = (s) => (/^[\w-]{11}$/.test(s || '') ? s : null);
  if (host === 'youtu.be') return ok(url.pathname.split('/')[1]);
  if (url.pathname === '/watch') return ok(url.searchParams.get('v'));
  const m = url.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{11})/);
  return m ? m[2] : null;
}

export function isTikTokShortLink(url) {
  const host = url.hostname.toLowerCase();
  return host === 'vm.tiktok.com' || host === 'vt.tiktok.com' || /^\/t\/[\w-]+/.test(url.pathname);
}

export function extractTikTokId(url) {
  const m = url.pathname.match(/\/(?:video|photo)\/(\d{8,25})/);
  return m ? m[1] : null;
}

export function isFacebookShortLink(url) {
  return url.hostname.toLowerCase() === 'fb.watch' || /^\/share\/(v|r)\//.test(url.pathname);
}

export function looksLikeFacebookVideo(url) {
  if (url.hostname.toLowerCase() === 'fb.watch') return true;
  return /\/(videos|reel|watch|share\/(v|r))(\/|$)/.test(url.pathname) || url.searchParams.has('v');
}

export function parseIsoDuration(iso) {
  const m = /^P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  return m ? Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0) : null;
}

export function safeFilename(name, fallback = 'video') {
  const cleaned = String(name || '').split(/[\\/]/).pop().normalize('NFKD').replace(/[^\w.\- ]+/g, '_').replace(/\.{2,}/g, '.').replace(/^[. ]+|[. ]+$/g, '').slice(0, 100);
  return cleaned || fallback;
}

export function toNumber(value, name, { min = -Infinity, max = Infinity, fallback } = {}) {
  if ((value === undefined || value === '') && fallback !== undefined) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new AppError(400, 'INVALID_PARAMETER', `"${name}" must be a number between ${min} and ${max}.`);
  return n;
}

export function oneOf(value, name, allowed, fallback) {
  const v = value === undefined || value === '' ? fallback : value;
  if (!allowed.includes(v)) throw new AppError(400, 'INVALID_PARAMETER', `"${name}" must be one of: ${allowed.join(', ')}.`);
  return v;
}

export function toSrt(segments) {
  const p = (n, l = 2) => String(n).padStart(l, '0');
  const ts = (s) => {
    const ms = Math.max(0, Math.round(Number(s) * 1000));
    return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
  };
  return segments
    .filter((s) => String(s.text || '').trim())
    .map((s, i) => `${i + 1}\n${ts(s.start)} --> ${ts(s.end)}\n${String(s.text).trim()}\n`)
    .join('\n');
}
