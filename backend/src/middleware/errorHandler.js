import multer from 'multer';
import { AppError } from '../utils/errors.js';

export const notFound = (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooBig ? 413 : 400).json({ error: { code: tooBig ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR', message: tooBig ? 'The file exceeds the upload size limit.' : err.message } });
  }
  if (err instanceof AppError) return res.status(err.status).json({ error: { code: err.code, message: err.message, ...err.extra } });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Invalid JSON body.' } });
  console.error('[unhandled]', err);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on the server.' } });
}
