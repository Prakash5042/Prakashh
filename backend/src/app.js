import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind Render/Railway/Fly proxies; needed for correct rate-limit IPs
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({
    origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes(origin)),
    methods: ['GET', 'POST'], exposedHeaders: ['Content-Disposition'],
  }));
  app.use(express.json({ limit: '500kb' }));
  app.use('/api', routes);
  app.get('/', (_req, res) => res.json({ name: 'ClipFlow API', docs: '/api/platforms' }));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
