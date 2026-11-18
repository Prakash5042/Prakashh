import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPlatform, extractYouTubeId, extractTikTokId, normalizeInput, looksLikeFacebookVideo, parseIsoDuration, safeFilename, toSrt } from '../src/utils/validate.js';
import { isPrivateIp } from '../src/utils/ip.js';
import { assertSafeUrl } from '../src/utils/http.js';

const u = (s) => new URL(s);

test('detects platforms and URL variants', () => {
  assert.equal(detectPlatform(u('https://www.youtube.com/watch?v=dQw4w9WgXcQ')), 'youtube');
  assert.equal(detectPlatform(u('https://youtu.be/dQw4w9WgXcQ')), 'youtube');
  assert.equal(detectPlatform(u('https://vm.tiktok.com/ZMabc/')), 'tiktok');
  assert.equal(detectPlatform(u('https://fb.watch/abc/')), 'facebook');
  assert.equal(detectPlatform(u('https://example.com/a.mp4')), null);
  assert.equal(detectPlatform(u('https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ')), null);
});

test('extracts ids', () => {
  assert.equal(extractYouTubeId(u('https://youtu.be/dQw4w9WgXcQ?t=3')), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeId(u('https://www.youtube.com/shorts/dQw4w9WgXcQ')), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeId(u('https://www.youtube.com/watch?v=short')), null);
  assert.equal(extractTikTokId(u('https://www.tiktok.com/@user/video/7234567890123456789')), '7234567890123456789');
  assert.equal(looksLikeFacebookVideo(u('https://www.facebook.com/reel/123456')), true);
  assert.equal(looksLikeFacebookVideo(u('https://www.facebook.com/someone')), false);
});

test('rejects invalid input', () => {
  assert.throws(() => normalizeInput(''), { code: 'INVALID_URL' });
  assert.throws(() => normalizeInput('ftp://x.com/a'), { code: 'INVALID_URL' });
  assert.throws(() => normalizeInput('https://user:pw@youtube.com/watch?v=dQw4w9WgXcQ'), { code: 'INVALID_URL' });
  assert.equal(normalizeInput('youtu.be/dQw4w9WgXcQ').hostname, 'youtu.be');
});

test('SSRF guards block private/internal targets', () => {
  for (const ip of ['127.0.0.1', '10.0.0.5', '192.168.1.1', '172.16.0.1', '169.254.169.254', '::1', 'fd00::1', '::ffff:127.0.0.1', '100.64.0.1']) assert.equal(isPrivateIp(ip), true, ip);
  for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700::1111']) assert.equal(isPrivateIp(ip), false, ip);
  for (const bad of ['http://127.0.0.1/a.mp4', 'http://localhost/a.mp4', 'http://[::1]/a.mp4', 'http://169.254.169.254/latest', 'http://example.com:8080/a.mp4', 'http://svc.internal/x']) {
    assert.throws(() => assertSafeUrl(u(bad)), { code: 'BLOCKED_ADDRESS' }, bad);
  }
  assert.throws(() => assertSafeUrl(u('https://evil.com/'), ['www.youtube.com']), { code: 'HOST_NOT_ALLOWED' });
});

test('helpers', () => {
  assert.equal(parseIsoDuration('PT1H2M3S'), 3723);
  assert.equal(safeFilename('../../etc/passwd'), 'passwd');
  assert.equal(safeFilename('   '), 'video');
  assert.match(toSrt([{ start: 0, end: 1.5, text: 'Hi' }]), /00:00:00,000 --> 00:00:01,500\nHi/);
});
