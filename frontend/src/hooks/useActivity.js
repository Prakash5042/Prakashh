const KEY = 'clipflow-activity';

export function readActivity() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function logActivity(entry) {
  try { localStorage.setItem(KEY, JSON.stringify([{ ...entry, at: Date.now() }, ...readActivity()].slice(0, 50))); } catch { /* ignore */ }
}
export function clearActivity() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
