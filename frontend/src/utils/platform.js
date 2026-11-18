import { Facebook, Music2, Youtube, Link2 } from 'lucide-react';

export const PLATFORMS = {
  youtube: { id: 'youtube', name: 'YouTube', icon: Youtube, grad: 'linear-gradient(135deg,#ff416c,#ff4b2b)', match: /(^|\.)youtube\.com$|^youtu\.be$/ },
  tiktok: { id: 'tiktok', name: 'TikTok', icon: Music2, grad: 'linear-gradient(135deg,#25f4ee,#fe2c55)', match: /(^|\.)tiktok\.com$/ },
  facebook: { id: 'facebook', name: 'Facebook', icon: Facebook, grad: 'linear-gradient(135deg,#1877f2,#6366f1)', match: /(^|\.)facebook\.com$|^fb\.watch$|^fb\.com$/ },
  direct: { id: 'direct', name: 'Direct file', icon: Link2, grad: 'linear-gradient(135deg,#10b981,#06b6d4)', match: null },
};

export function detectPlatform(input) {
  try {
    const u = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
    const host = u.hostname.toLowerCase();
    if (!host.includes('.')) return null;
    for (const p of Object.values(PLATFORMS)) if (p.match && p.match.test(host)) return p;
    return /\.(mp4|mov|webm|mkv|m4v)$/i.test(u.pathname) ? PLATFORMS.direct : null;
  } catch { return null; }
}
