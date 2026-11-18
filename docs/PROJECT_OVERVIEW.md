# ClipFlow: Project Overview

ClipFlow is a lightweight web app that lets a user paste a TikTok, Facebook or YouTube link, see what the platform legitimately exposes (metadata + official embed), and prepare **their own** videos with simple FFmpeg tools.

**Philosophy:** advanced results through simple operations. No timeline editor.

## Modules
| Module | Route | What it does |
|---|---|---|
| Video Downloader | `/`, `/downloader` | URL validation, platform detection, metadata, embed preview, quality selector + real download for direct files you own |
| Video Tools | `/tools` | Compress, Resize (fit/blur/crop), Trim, Audio extract (MP3/WAV), Thumbnail, FFprobe analyzer |
| Social Media Tools | `/social` | Presets for TikTok, Reels, Shorts, YouTube, IG square/portrait + optional burned-in captions |
| AI Assistant | `/ai` | Titles/description/hashtags and Whisper subtitles (SRT export, correction). Needs `OPENAI_API_KEY` |
| Recent Activity | `/activity` | Local-only history (browser localStorage) |

## What "download" means here
Platforms do not offer public download APIs for third-party videos (see `PLATFORM_LIMITATIONS.md`). ClipFlow therefore:
1. Shows metadata + official embed for TikTok/Facebook/YouTube and states clearly that direct download is unavailable.
2. Offers real quality selection + download for **direct links to video files** and for **files the user uploads** to the tools.

No fake buttons, no fabricated qualities.
