# Deployment Guide

## 1. Backend (Render, Docker)
1. Push the repo to GitHub.
2. Render → New → Blueprint → select the repo (uses `render.yaml`) or New Web Service → Docker → root dir `backend`.
3. Set env vars: `CORS_ORIGINS=https://<your-vercel-domain>` (required), optionally `OPENAI_API_KEY`, `YOUTUBE_API_KEY`, `FACEBOOK_ACCESS_TOKEN`.
4. Check `https://<api>/api/health` returns `{"ok":true,...}`.
Railway/Fly.io work the same: any host that runs the Dockerfile (it installs FFmpeg).

## 2. Frontend (Vercel)
1. Vercel → Add New Project → import repo → **Root Directory: `frontend`**.
2. Framework: Vite (auto). Build: `npm run build`. Output: `dist`. (`vercel.json` already sets these + SPA rewrites.)
3. Environment variable: `VITE_API_BASE_URL=https://<your-backend-domain>` (no trailing slash).
4. Deploy, then add the Vercel URL to the backend's `CORS_ORIGINS` and redeploy the backend.

## Credentials / approvals
| Item | Needed for | Required? |
|---|---|---|
| `OPENAI_API_KEY` | AI titles, Whisper subtitles | Optional |
| `YOUTUBE_API_KEY` | YouTube duration | Optional |
| Meta app + oEmbed Read approval, `FACEBOOK_ACCESS_TOKEN` | Facebook metadata | Optional |
