// In-memory job registry + automatic temp cleanup. Swap for Redis/DB if you scale horizontally.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { config } from '../config/index.js';

const jobs = new Map();
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const jobEvents = new EventEmitter();
jobEvents.setMaxListeners(500);

export function createJob(type, meta = {}, customId = null) {
  const id = (customId && UUID_RE.test(String(customId))) ? customId : randomUUID();
  const dir = path.join(config.jobsDir, id);
  fs.mkdirSync(dir, { recursive: true });
  const job = { id, type, status: 'processing', createdAt: Date.now(), dir, meta };
  jobs.set(id, job);
  return job;
}
export const getJob = (id) => (UUID_RE.test(String(id)) ? jobs.get(id) : undefined);
export const finishJob = (job, patch) => Object.assign(job, { status: 'done' }, patch);
export async function removeJob(id) {
  const job = jobs.get(id);
  jobs.delete(id);
  if (job) await fs.promises.rm(job.dir, { recursive: true, force: true }).catch(() => {});
}
export const publicJob = (j) => ({
  jobId: j.id, type: j.type, status: j.status, createdAt: j.createdAt,
  expiresAt: j.createdAt + config.jobTtlMs, filename: j.filename, downloadUrl: j.filePath ? `/api/files/${j.id}` : null, error: j.error,
});

async function sweepDir(dir) {
  for (const name of await fs.promises.readdir(dir).catch(() => [])) {
    const p = path.join(dir, name);
    const st = await fs.promises.stat(p).catch(() => null);
    if (st && Date.now() - st.mtimeMs > config.jobTtlMs) await fs.promises.rm(p, { recursive: true, force: true }).catch(() => {});
  }
}
export async function sweep() {
  for (const job of [...jobs.values()]) if (Date.now() - job.createdAt > config.jobTtlMs) await removeJob(job.id);
  await sweepDir(config.uploadDir);
  await sweepDir(config.jobsDir);
}
export function startCleanup() {
  sweep();
  setInterval(sweep, 60_000).unref();
}
