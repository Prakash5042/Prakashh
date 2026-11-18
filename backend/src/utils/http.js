// SSRF-safe HTTP client. Every hop is validated; DNS answers are checked at connect time
// (defeats DNS rebinding); only ports 80/443; manual redirects; timeouts; size caps.
import dns from 'node:dns';
import net from 'node:net';
import fs from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Agent, fetch as ufetch } from 'undici';
import { AppError } from './errors.js';
import { isPrivateIp } from './ip.js';

function safeLookup(hostname, options, cb) {
  const opts = typeof options === 'object' && options ? options : {};
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addrs) => {
    if (err) return cb(err);
    if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
      return cb(new AppError(400, 'BLOCKED_ADDRESS', 'This address is not allowed.'));
    }
    if (opts.all) return cb(null, addrs);
    return cb(null, addrs[0].address, addrs[0].family);
  });
}

const dispatcher = new Agent({ connect: { lookup: safeLookup, timeout: 10000 } });

export function assertSafeUrl(url, allowedHosts) {
  if (!['http:', 'https:'].includes(url.protocol)) throw new AppError(400, 'INVALID_URL', 'Only http(s) links are supported.');
  if (url.username || url.password) throw new AppError(400, 'INVALID_URL', 'Links with credentials are not allowed.');
  if (url.port && !['80', '443'].includes(url.port)) throw new AppError(400, 'BLOCKED_ADDRESS', 'Only standard web ports are allowed.');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (net.isIP(host) && isPrivateIp(host)) throw new AppError(400, 'BLOCKED_ADDRESS', 'Private or internal addresses are not allowed.');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new AppError(400, 'BLOCKED_ADDRESS', 'Private or internal addresses are not allowed.');
  if (allowedHosts && !allowedHosts.includes(host)) throw new AppError(400, 'HOST_NOT_ALLOWED', 'This host is not allowed.');
}

export async function safeFetch(input, { allowedHosts, headers = {}, method = 'GET', timeoutMs = 10000, maxRedirects = 5 } = {}) {
  let url = new URL(input);
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    assertSafeUrl(url, allowedHosts);
    let res;
    try {
      res = await ufetch(url, {
        method, headers: { 'user-agent': 'ClipFlow/1.0 (+metadata)', ...headers },
        redirect: 'manual', dispatcher, signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      if (e instanceof AppError) throw e;
      if (e?.cause instanceof AppError) throw e.cause;
      if (e?.name === 'TimeoutError' || e?.name === 'AbortError') throw new AppError(504, 'UPSTREAM_TIMEOUT', 'The remote server took too long to respond.');
      throw new AppError(502, 'UPSTREAM_UNREACHABLE', 'Could not reach the remote server.');
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      await res.body?.cancel().catch(() => {});
      url = new URL(res.headers.get('location'), url);
      continue;
    }
    return { res, url };
  }
  throw new AppError(502, 'TOO_MANY_REDIRECTS', 'The link redirected too many times.');
}

export async function fetchJson(url, opts) {
  const { res } = await safeFetch(url, opts);
  if (res.status === 429) throw new AppError(429, 'UPSTREAM_RATE_LIMITED', 'The platform is rate limiting requests. Try again shortly.');
  if (!res.ok) {
    await res.body?.cancel().catch(() => {});
    throw new AppError(res.status === 404 ? 404 : 422, 'VIDEO_NOT_AVAILABLE', 'The platform did not return information for this video. It may be private, removed, or not embeddable.');
  }
  try { return await res.json(); } catch { throw new AppError(502, 'BAD_UPSTREAM_RESPONSE', 'Unexpected response from the platform.'); }
}

/** Stream a remote file to disk with a hard size cap. */
export async function downloadToFile(url, dest, { maxBytes, timeoutMs = 120000, accept } = {}) {
  const { res } = await safeFetch(url, { timeoutMs, headers: { accept: 'video/*,*/*;q=0.5' } });
  if (!res.ok || !res.body) throw new AppError(422, 'DOWNLOAD_FAILED', `The server responded with status ${res.status}.`);
  const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (accept && !accept(type)) {
    await res.body.cancel().catch(() => {});
    throw new AppError(415, 'NOT_A_VIDEO_FILE', 'This link does not point to a video file.');
  }
  const declared = Number(res.headers.get('content-length') || 0);
  if (declared && declared > maxBytes) { await res.body.cancel().catch(() => {}); throw new AppError(413, 'FILE_TOO_LARGE', 'The file exceeds the size limit.'); }
  let seen = 0;
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      seen += chunk.length;
      if (seen > maxBytes) return cb(new AppError(413, 'FILE_TOO_LARGE', 'The file exceeds the size limit.'));
      return cb(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(res.body), counter, fs.createWriteStream(dest));
  } catch (e) {
    await fs.promises.rm(dest, { force: true });
    if (e instanceof AppError) throw e;
    throw new AppError(504, 'DOWNLOAD_FAILED', 'The download was interrupted.');
  }
  return { contentType: type, bytes: seen };
}
