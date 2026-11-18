// Integration tests: real Express app + real FFmpeg on a tiny generated clip. No live platform calls.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';

let server; let base; let clip;
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

before(() => {
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  clip = path.join(os.tmpdir(), `clipflow-test-${process.pid}.mp4`);
  if (hasFfmpeg) spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25:duration=3', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', clip]);
});
after(() => { server.close(); fs.rmSync(clip, { force: true }); });

const post = (p, body) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const upload = (p, fields = {}, file = clip) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  f.append('video', new Blob([fs.readFileSync(file)], { type: 'video/mp4' }), 'clip.mp4');
  return fetch(base + p, { method: 'POST', body: f });
};

test('health, platforms, presets', async () => {
  assert.equal((await (await fetch(`${base}/api/health`)).json()).ok, true);
  const pl = await (await fetch(`${base}/api/platforms`)).json();
  assert.deepEqual(pl.platforms.map((p) => p.id), ['youtube', 'tiktok', 'facebook']);
  assert.ok(pl.platforms.every((p) => p.download === false));
  assert.ok((await (await fetch(`${base}/api/social/presets`)).json()).presets.length >= 6);
});

test('URL validation and capability errors', async () => {
  assert.equal((await post('/api/video/inspect', { url: '' })).status, 400);
  assert.equal((await post('/api/video/inspect', { url: 'not a url' })).status, 400);
  assert.equal((await post('/api/video/inspect', { url: 'https://example.com/page' })).status, 422);
  assert.equal((await post('/api/video/inspect', { url: 'http://127.0.0.1/a.mp4' })).status, 400);
  assert.equal((await post('/api/video/inspect', { url: 'http://169.254.169.254/x.mp4' })).status, 400);
  const o = await (await post('/api/video/options', { url: 'https://youtu.be/dQw4w9WgXcQ' })).json();
  assert.equal(o.platform, 'youtube'); assert.deepEqual(o.options, []);
  const d = await post('/api/video/download', { url: 'https://www.tiktok.com/@a/video/7234567890123456789' });
  assert.equal(d.status, 422);
  assert.equal((await d.json()).error.code, 'DOWNLOAD_NOT_SUPPORTED');
  assert.equal((await fetch(`${base}/api/files/not-a-uuid`)).status, 404);
});

test('AI endpoints explain missing configuration', { skip: Boolean(process.env.OPENAI_API_KEY) }, async () => {
  const r = await post('/api/ai/suggest', { topic: 'cats' });
  assert.equal(r.status, 503);
  assert.equal((await r.json()).error.code, 'AI_NOT_CONFIGURED');
});

test('rejects non-video uploads', { skip: !hasFfmpeg }, async () => {
  const f = new FormData();
  f.append('video', new Blob(['hello'], { type: 'text/plain' }), 'x.txt');
  assert.equal((await fetch(`${base}/api/tools/analyze`, { method: 'POST', body: f })).status, 415);
  const g = new FormData();
  g.append('video', new Blob(['not really a video'], { type: 'video/mp4' }), 'fake.mp4');
  assert.equal((await fetch(`${base}/api/tools/analyze`, { method: 'POST', body: g })).status, 415);
});

test('analyze', { skip: !hasFfmpeg }, async () => {
  const { info } = await (await upload('/api/tools/analyze')).json();
  assert.equal(info.video.width, 640); assert.equal(info.video.codec, 'h264'); assert.equal(info.audio.codec, 'aac');
});

for (const [name, route, fields, check] of [
  ['compress', '/api/tools/compress', { preset: 'high' }, (j) => assert.ok(j.result.size > 0)],
  ['resize 9:16 fit', '/api/tools/resize', { ratio: '9:16', mode: 'fit' }, (j) => assert.deepEqual([j.result.width, j.result.height], [1080, 1920])],
  ['resize 1:1 crop', '/api/tools/resize', { ratio: '1:1', mode: 'crop' }, (j) => assert.deepEqual([j.result.width, j.result.height], [1080, 1080])],
  ['resize 4:5 blur', '/api/tools/resize', { ratio: '4:5', mode: 'blur' }, (j) => assert.deepEqual([j.result.width, j.result.height], [1080, 1350])],
  ['trim', '/api/tools/trim', { start: 1, end: 2.5 }, (j) => assert.ok(Math.abs(j.result.duration - 1.5) < 0.3)],
  ['extract mp3', '/api/tools/extract-audio', { format: 'mp3' }, (j) => assert.ok(j.filename.endsWith('.mp3'))],
  ['extract wav', '/api/tools/extract-audio', { format: 'wav' }, (j) => assert.ok(j.filename.endsWith('.wav'))],
  ['thumbnail png', '/api/tools/thumbnail', { time: 1, format: 'png' }, (j) => assert.ok(j.filename.endsWith('.png'))],
  ['social tiktok', '/api/social/prepare', { preset: 'tiktok', mode: 'blur' }, (j) => assert.deepEqual([j.result.width, j.result.height], [1080, 1920])],
  ['social burn captions', '/api/social/prepare', { preset: 'original', burn: 'true', captions: '1\n00:00:00,000 --> 00:00:02,000\nHello ClipFlow\n' }, (j) => assert.equal(j.result.width, 640)],
]) {
  test(`tool: ${name}`, { skip: !hasFfmpeg }, async () => {
    const res = await upload(route, fields);
    assert.equal(res.status, 200, await res.clone().text());
    const j = await res.json();
    check(j);
    const dl = await fetch(base + j.downloadUrl);
    assert.equal(dl.status, 200);
    assert.ok((await dl.arrayBuffer()).byteLength > 0);
    assert.equal((await (await fetch(`${base}/api/video/status/${j.jobId}`)).json()).status, 'done');
  });
}

test('tool parameter validation', { skip: !hasFfmpeg }, async () => {
  assert.equal((await upload('/api/tools/trim', { start: 2, end: 1 })).status, 400);
  assert.equal((await upload('/api/tools/resize', { ratio: '7:3' })).status, 400);
  assert.equal((await upload('/api/tools/compress', { preset: '; rm -rf /' })).status, 400);
  assert.equal((await upload('/api/tools/thumbnail', { time: 99 })).status, 400);
});
