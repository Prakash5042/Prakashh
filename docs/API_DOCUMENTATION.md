# API Documentation

Base URL: `http://localhost:8080` (dev). Errors: `{ "error": { "code": "...", "message": "..." } }`.

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/health` | | `{ ok, ai, directUrls }` |
| GET | `/api/platforms` | | Capabilities per platform (all `download:false`) |
| GET | `/api/social/presets` | | Export presets |
| POST | `/api/video/inspect` | `{url}` | Metadata + preview. Direct files also return `jobId`, `options[]` |
| POST | `/api/video/options` | `{url}` | Capabilities for the URL's platform (no network call) |
| POST | `/api/video/download` | `{jobId, optionId}` | Returns `{downloadUrl}`. For platform URLs → `422 DOWNLOAD_NOT_SUPPORTED` |
| GET | `/api/video/status/:jobId` | | Job status (`/api/jobs/:id` alias) |
| GET | `/api/files/:jobId[?inline=1]` | | Download or stream a result |
| POST | `/api/tools/analyze` | multipart `video` | FFprobe summary |
| POST | `/api/tools/compress` | `video`, `preset=low\|balanced\|high` | |
| POST | `/api/tools/resize` | `video`, `ratio=9:16\|16:9\|1:1\|4:5`, `mode=fit\|blur\|crop` | |
| POST | `/api/tools/trim` | `video`, `start`, `end` (seconds) | |
| POST | `/api/tools/extract-audio` | `video`, `format=mp3\|wav` | |
| POST | `/api/tools/thumbnail` | `video`, `time`, `format=jpg\|png` | |
| POST | `/api/social/prepare` | `video`, `preset`, `mode`, `burn=true`, `captions` (SRT) | Returns `warnings[]` |
| POST | `/api/ai/suggest` | `{topic, platform, tone}` | `503 AI_NOT_CONFIGURED` without key |
| POST | `/api/ai/subtitles` | multipart `video` | Whisper → `{text, segments, srt}` |
| POST | `/api/ai/srt` | `{segments}` | Build SRT |

Tool responses: `{ jobId, status, filename, downloadUrl, original:{size,...}, result:{size,width,height,duration}, warnings }`.

Progress: uploads report progress in the browser; FFmpeg processing is synchronous per request (short clips). For long jobs, move to a queue (see `README` next steps).
