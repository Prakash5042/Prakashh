import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

const make = (limit) => rateLimit({
  windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a few minutes and try again.' } },
});
export const apiLimiter = make(config.rateLimit);
export const heavyLimiter = make(config.heavyRateLimit);
