import axios from 'axios';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const http = axios.create({ baseURL: API_BASE, timeout: 15 * 60 * 1000 });

export const fileUrl = (path, inline = false) => `${API_BASE}${path}${inline ? `${path.includes('?') ? '&' : '?'}inline=1` : ''}`;

function fail(e) {
  const err = e.response?.data?.error;
  const msg = err?.message || (e.code === 'ERR_NETWORK' ? 'Cannot reach the ClipFlow server. Make sure the backend is running (npm run dev:backend).' : e.message);
  const out = new Error(msg);
  out.code = err?.code; out.data = err;
  throw out;
}
const get = (p) => http.get(p).then((r) => r.data).catch(fail);
const post = (p, body) => http.post(p, body).then((r) => r.data).catch(fail);

function upload(route, file, fields = {}, onProgress, onJobProgress) {
  const f = new FormData();
  let jobId;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    jobId = crypto.randomUUID();
    f.append('jobId', jobId);
  }
  Object.entries(fields).forEach(([k, v]) => f.append(k, String(v)));
  f.append('video', file);

  let es = null;
  if (jobId && typeof EventSource !== 'undefined' && onJobProgress) {
    try {
      es = new EventSource(fileUrl(`/api/jobs/${jobId}/progress`));
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onJobProgress(data);
          if (data.status === 'done' || data.status === 'error') {
            es.close();
          }
        } catch {}
      };
      es.onerror = () => { es.close(); };
    } catch {}
  }

  const headers = jobId ? { 'X-Job-Id': jobId } : {};
  return http.post(`/api/${route}`, f, {
    headers,
    onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded * 100) / e.total) : 0),
  })
    .then((r) => { es?.close(); return r.data; })
    .catch((err) => { es?.close(); return fail(err); });
}

export const api = {
  platforms: () => get('/api/platforms'),
  presets: () => get('/api/social/presets'),
  inspect: (url) => post('/api/video/inspect', { url }),
  download: (body) => post('/api/video/download', body),
  tool: upload,
  suggest: (body) => post('/api/ai/suggest', body),
};

export function triggerDownload(path) {
  const a = document.createElement('a');
  a.href = fileUrl(path); a.rel = 'noopener'; a.download = '';
  document.body.appendChild(a); a.click(); a.remove();
}
