import { AudioLines, Crop, Image, ScanSearch, Scissors, Shrink } from 'lucide-react';

export const TOOLS = [
  { id: 'compress', title: 'Video Compressor', desc: 'Shrink file size with simple presets.', icon: Shrink, route: 'tools/compress', grad: 'linear-gradient(135deg,#8b5cf6,#d946ef)', edge: '#5b21b6' },
  { id: 'resize', title: 'Video Resizer', desc: '9:16, 16:9, 1:1 or 4:5 without stretching.', icon: Crop, route: 'tools/resize', grad: 'linear-gradient(135deg,#06b6d4,#3b82f6)', edge: '#0e7490' },
  { id: 'trim', title: 'Video Trimmer', desc: 'Cut the exact section you need.', icon: Scissors, route: 'tools/trim', grad: 'linear-gradient(135deg,#f59e0b,#f43f5e)', edge: '#b45309' },
  { id: 'audio', title: 'Audio Extractor', desc: 'Export MP3 or WAV from a video.', icon: AudioLines, route: 'tools/extract-audio', grad: 'linear-gradient(135deg,#10b981,#06b6d4)', edge: '#047857' },
  { id: 'thumbnail', title: 'Thumbnail Extractor', desc: 'Pick a frame, save it as an image.', icon: Image, route: 'tools/thumbnail', grad: 'linear-gradient(135deg,#ec4899,#8b5cf6)', edge: '#9d174d' },
  { id: 'analyze', title: 'Video Analyzer', desc: 'Resolution, codecs, FPS, bitrate and more.', icon: ScanSearch, route: 'tools/analyze', grad: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', edge: '#1e40af' },
];
