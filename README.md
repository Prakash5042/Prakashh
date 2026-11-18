# ClipFlow

All-in-one social video link inspector and simple video toolkit.
**Frontend:** React + Vite + Tailwind (deploy on Vercel) · **Backend:** Node + Express + FFmpeg (deploy via Docker) · No database, no login.

## Quick start (local)
Requirements: **Node.js 20+**, **FFmpeg + FFprobe** on your PATH (`ffmpeg -version` should work).
- macOS: `brew install ffmpeg` · Ubuntu/Debian: `sudo apt install ffmpeg` · Windows: `winget install Gyan.FFmpeg`

```bash
npm install            # root helper (concurrently)
npm run install:all    # installs backend + frontend
cp backend/.env.example backend/.env     # optional: add API keys
npm run dev            # API on :8080, web on http://localhost:5173
```
Or run separately: `npm run dev:backend` and `npm run dev:frontend`.

Tests: `npm test` (backend: unit + integration tests using real FFmpeg on a generated 3-second clip).
Frontend build check: `npm run build`.

## Open in Google Antigravity
Open the `ClipFlow` folder as the workspace, open a terminal and run the Quick start commands above. Key places: `backend/src/adapters/*` (platform logic), `backend/src/services/toolsService.js` (FFmpeg), `frontend/src/components/Downloader.jsx`, `frontend/src/components/ToolPanel.jsx`, `frontend/src/index.css` (3D design system).

## Deploy
See `docs/DEPLOYMENT_GUIDE.md`. Short version: backend → Render/Railway/Fly using `backend/Dockerfile` (needs FFmpeg, so not Vercel functions); frontend → Vercel with root dir `frontend` and `VITE_API_BASE_URL=<backend url>`; then put the Vercel URL in the backend's `CORS_ORIGINS`.

## What works (and how it's honest)
| Feature | Status |
|---|---|
| URL validation, platform detection, short links, SSRF protection | Implemented, unit tested |
| YouTube / TikTok metadata + official embed preview | Implemented via official oEmbed; **not live-verified** in the build sandbox |
| Facebook preview (embed) / metadata (needs Meta token) | Implemented; **not live-verified**; metadata needs Meta approval |
| Downloading from YouTube / TikTok / Facebook | **Intentionally not implemented** (no permitted public API / ToS). UI explains and offers alternatives |
| Direct file links (MP4/WebM/MOV you own): quality option + real download | Implemented, SSRF-hardened; local fetch blocked by design so only guard-tested |
| Compress, Resize (fit/blur/crop), Trim, MP3/WAV, Thumbnail, Analyzer | Implemented, integration tested with real FFmpeg |
| Social presets + optional burned-in captions | Implemented, tested (incl. caption burn-in) |
| AI titles/description/hashtags, Whisper subtitles, SRT export/edit | Implemented; needs `OPENAI_API_KEY`; clear message without it; **not live-verified** |
| Watermark removal / attribution stripping | **Not implemented** by design |
| Dark/light themes, responsive, activity history | Implemented |

## Manual checks after deploying (live platforms)
1. Paste a public YouTube link → title, creator, thumbnail, embed play.
2. Paste a `vm.tiktok.com` short link → resolves and previews.
3. Paste a public `facebook.com/.../videos/...` link → embed preview.
4. Paste a direct `https://…/clip.mp4` you own → quality card + Download.
5. Set `OPENAI_API_KEY` → AI Assistant generates titles and subtitles.

## Known limitations
- Single-instance in-memory jobs; FFmpeg runs inside the request (fine for short clips, use a queue for long ones).
- No real-time FFmpeg progress (upload progress + processing indicator only).
- Platform specs in `backend/src/config/socialPresets.js` are advisory and must be re-verified periodically.
- Facebook metadata needs Meta app review; embeds only work for public videos.

## Recommended next steps
1. Live-verify platform adapters with real URLs after deploy.
2. Add a job queue (BullMQ/Redis) + object storage for large/long videos.
3. Real FFmpeg progress via `-progress pipe:1` + SSE.
4. Optional auth + persistent history.
5. Frontend component tests (Vitest + Testing Library) and Playwright E2E.
