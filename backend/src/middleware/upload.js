import multer from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../config/index.js';
import { AppError } from '../utils/errors.js';

const ALLOWED_EXT = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi', '.3gp']);

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, config.uploadDir),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const okType = file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream';
    if (!ALLOWED_EXT.has(ext) || !okType) return cb(new AppError(415, 'UNSUPPORTED_FILE', 'Please upload an MP4, MOV, WebM, MKV, AVI or 3GP video.'));
    return cb(null, true);
  },
}).single('video');
