import axios from 'axios';

export function getApiBase() {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('clipflow_api_base');
    if (custom && custom.trim()) return custom.trim().replace(/\/$/, '');
  }
  return (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
}

export function setApiBase(url) {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('clipflow_api_base', url.trim().replace(/\/$/, ''));
    } else {
      localStorage.removeItem('clipflow_api_base');
    }
  }
}

const http = axios.create({ timeout: 15 * 60 * 1000 });

http.interceptors.request.use((req) => {
  const base = getApiBase();
  if (base && !req.url.startsWith('http')) {
    req.baseURL = base;
  }
  return req;
});

export const fileUrl = (path, inline = false) => {
  const base = getApiBase();
  const full = `${base}${path}`;
  return `${full}${inline ? `${full.includes('?') ? '&' : '?'}inline=1` : ''}`;
};

function fail(e) {
  if (e.response?.status === 405) {
    const out = new Error('Backend URL not connected. Please enter your Render backend URL in the settings above.');
    out.code = 'BACKEND_NOT_CONFIGURED';
    throw out;
  }
  const err = e.response?.data?.error;
  const msg = err?.message || (e.code === 'ERR_NETWORK' ? 'Cannot reach the backend server. Please verify your Render backend URL.' : e.message);
  const out = new Error(msg);
  out.code = err?.code || e.code;
  out.data = err;
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
  a.href = path.startsWith('http') ? path : fileUrl(path);
  a.rel = 'noopener';
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
