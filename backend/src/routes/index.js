import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import { apiLimiter, heavyLimiter } from '../middleware/rateLimit.js';
import * as video from '../controllers/videoController.js';
import * as meta from '../controllers/metaController.js';
import * as t from '../controllers/toolsController.js';
import * as ai from '../controllers/aiController.js';

const r = Router();
r.use(apiLimiter);

r.get('/health', meta.health);
r.get('/platforms', meta.platforms);
r.get('/social/presets', meta.presets);
r.get('/files/:jobId', meta.file);
r.get('/video/status/:jobId', meta.status);
r.get('/jobs/:jobId', meta.status);
r.get('/jobs/:jobId/progress', meta.progressStream);

r.post('/video/inspect', heavyLimiter, video.inspect);
r.post('/video/options', video.options);
r.post('/video/download', heavyLimiter, video.download);
r.get('/video/stream', video.stream);

r.post('/tools/analyze', heavyLimiter, upload, t.analyze);
r.post('/tools/compress', heavyLimiter, upload, t.compress);
r.post('/tools/resize', heavyLimiter, upload, t.resize);
r.post('/tools/trim', heavyLimiter, upload, t.trim);
r.post('/tools/extract-audio', heavyLimiter, upload, t.extractAudio);
r.post('/tools/audio', heavyLimiter, upload, t.extractAudio);
r.post('/tools/thumbnail', heavyLimiter, upload, t.thumbnail);
r.post('/social/prepare', heavyLimiter, upload, t.social);

r.post('/ai/suggest', heavyLimiter, ai.suggest);
r.post('/ai/subtitles', heavyLimiter, upload, ai.subtitles);
r.post('/ai/srt', ai.srt);

export default r;
