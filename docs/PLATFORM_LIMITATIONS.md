# Platform Capabilities & Limitations

> Verify against current official docs before shipping. Platform policies change.

| | YouTube | TikTok | Facebook |
|---|---|---|---|
| Metadata | Official oEmbed (no key). Duration via YouTube Data API v3 if `YOUTUBE_API_KEY` set | Official oEmbed (no key) | Needs Meta app token + oEmbed Read approval. Without it: embed only |
| Preview | Official embed (`youtube-nocookie.com`) | Official embed | Official video plugin embed (public videos only) |
| Download of others' videos | **Not implemented**: against YouTube ToS | **Not implemented**: no public API | **Not implemented**: no public API |
| Short links | youtu.be, /shorts/ | vm./vt.tiktok.com, /t/ (resolved server-side, host-restricted) | fb.watch, /share/v|r/ |

**Never done:** DRM/auth/private-content bypass, watermark removal, stripping attribution, signed-URL extraction.

**Alternatives ClipFlow provides:** open original on the platform; import an original file you own into Video Tools; direct-link fetch for files you are authorized to use.

## Verification status
- Implemented + unit/integration tested (mock-free, local): URL parsing/validation, SSRF guards, all FFmpeg tools, job lifecycle, error responses.
- **Not verified live** (the build sandbox blocks outbound traffic to these hosts): YouTube/TikTok/Facebook oEmbed calls, short-link resolution, Whisper/OpenAI calls, direct-URL download from a public host. The code paths follow each official API's documented response; run the manual checks in `README.md` after deploying.
