# Architecture

```
Browser (Vercel, static SPA)  ──HTTPS──▶  Express API (Docker host: Render/Railway/Fly)
React + Vite + Tailwind                   ├─ adapters/  youtube | tiktok | facebook  (oEmbed / embeds)
                                          ├─ services/  videoService, toolsService (FFmpeg), aiService (OpenAI)
                                          ├─ jobs/      in-memory job store + TTL cleanup
                                          └─ utils/     SSRF-safe http client, ffmpeg runner, validators
```

## Why two deployments
Vercel serverless functions have short execution limits, tight request-body limits, and no guaranteed FFmpeg binary. Video processing needs a long-running Node process with FFmpeg, so the backend ships as a Docker image (`backend/Dockerfile`, `render.yaml`) and the frontend is a static Vercel site.

## Request flows
- **Inspect:** `POST /api/video/inspect` → `normalizeInput` → `detectPlatform` → adapter → official oEmbed/embed. Short links (vm.tiktok.com, fb.watch) are resolved with the SSRF-safe client restricted to platform hosts.
- **Direct file:** any other http(s) link ending in a video extension is fetched through the SSRF-safe client (size-capped, content-type checked, ffprobe-verified) into a job directory; the UI then shows real quality options and a download button.
- **Tools:** multipart upload → multer (disk, size/type limits) → ffprobe validation → job dir → FFmpeg (arg arrays, no shell, timeout) → `GET /api/files/:jobId`. Uploads are deleted in `finally`; jobs expire after `JOB_TTL_MINUTES`.

## Security
SSRF: scheme/port/credential checks, private-IP blocking at **connect time** (DNS-rebinding safe), manual redirect validation, platform host allow-lists. Also: helmet, CORS allow-list, rate limits (general + heavy), upload extension/MIME checks + ffprobe content check, numeric/enum validation of every FFmpeg parameter, UUID-only job ids, safe filenames, no API keys in the frontend.

## Scaling notes
Job store is in memory (single instance). For multiple instances, move jobs to Redis and files to object storage, and add a queue for long jobs.
