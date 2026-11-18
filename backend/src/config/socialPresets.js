// Social export presets. Keep configurable: platform specs change over time.
// `advisoryMaxDurationSec` only drives a warning. VERIFY against each platform's current docs.
export const SOCIAL_PRESETS = {
  tiktok: { label: 'TikTok', ratio: '9:16', width: 1080, height: 1920, fps: 30, advisoryMaxDurationSec: 600 },
  reels: { label: 'Instagram Reels', ratio: '9:16', width: 1080, height: 1920, fps: 30, advisoryMaxDurationSec: 90 },
  shorts: { label: 'YouTube Shorts', ratio: '9:16', width: 1080, height: 1920, fps: 30, advisoryMaxDurationSec: 180 },
  youtube: { label: 'YouTube Landscape', ratio: '16:9', width: 1920, height: 1080, fps: 30, advisoryMaxDurationSec: null },
  'ig-square': { label: 'Instagram Square', ratio: '1:1', width: 1080, height: 1080, fps: 30, advisoryMaxDurationSec: null },
  'ig-portrait': { label: 'Instagram Portrait', ratio: '4:5', width: 1080, height: 1350, fps: 30, advisoryMaxDurationSec: null },
  original: { label: 'Keep original size', ratio: 'original', width: null, height: null, fps: null, advisoryMaxDurationSec: null },
};
