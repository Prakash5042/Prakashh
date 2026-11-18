import fs from 'node:fs/promises';
import { config } from '../config/index.js';
import { AppError } from '../utils/errors.js';

function requireKey() {
  if (!config.openaiKey) throw new AppError(503, 'AI_NOT_CONFIGURED', 'AI features need an API key. Set OPENAI_API_KEY in backend/.env and restart the server.');
}

async function openai(path, init) {
  let res;
  try { res = await fetch(`https://api.openai.com/v1${path}`, { ...init, headers: { authorization: `Bearer ${config.openaiKey}`, ...init.headers }, signal: AbortSignal.timeout(120000) }); }
  catch { throw new AppError(502, 'AI_UNREACHABLE', 'Could not reach the AI provider.'); }
  if (res.status === 429) throw new AppError(429, 'AI_RATE_LIMITED', 'The AI provider is rate limiting requests. Try again shortly.');
  if (!res.ok) throw new AppError(502, 'AI_FAILED', `The AI provider returned an error (${res.status}).`);
  return res.json();
}

export async function suggestContent({ topic, platform, tone, transcript }) {
  requireKey();
  const system = 'You write social media copy. Reply ONLY with JSON: {"titles":[5 strings],"description":string,"hashtags":[10 strings starting with #]}.';
  const user = `Platform: ${platform}\nTone: ${tone}\nTopic: ${topic}\n${transcript ? `Transcript excerpt: ${transcript.slice(0, 3000)}` : ''}`;
  const data = await openai('/chat/completions', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: config.openaiTextModel, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  try {
    const out = JSON.parse(data.choices[0].message.content);
    return { titles: out.titles || [], description: out.description || '', hashtags: out.hashtags || [] };
  } catch { throw new AppError(502, 'AI_FAILED', 'The AI response could not be parsed.'); }
}

export async function transcribe(audioPath) {
  requireKey();
  const form = new FormData();
  form.append('model', config.openaiWhisperModel);
  form.append('response_format', 'verbose_json');
  form.append('file', new Blob([await fs.readFile(audioPath)], { type: 'audio/mpeg' }), 'speech.mp3');
  const data = await openai('/audio/transcriptions', { method: 'POST', body: form });
  return { text: data.text || '', language: data.language, segments: (data.segments || []).map((s) => ({ start: s.start, end: s.end, text: String(s.text).trim() })) };
}
