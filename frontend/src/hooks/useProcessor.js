import { useCallback, useState } from 'react';
import { api } from '../services/api.js';

/** Runs an upload-based backend operation and tracks upload + real FFmpeg progress via SSE, result and error. */
export function useProcessor() {
  const [s, set] = useState({
    busy: false,
    stage: 'idle',
    progress: 0,
    uploadProgress: 0,
    ffmpegProgress: 0,
    speed: null,
    result: null,
    error: null,
  });

  const run = useCallback(async (route, file, fields) => {
    set({
      busy: true,
      stage: 'uploading',
      progress: 0,
      uploadProgress: 0,
      ffmpegProgress: 0,
      speed: null,
      result: null,
      error: null,
    });
    try {
      const data = await api.tool(
        route,
        file,
        fields,
        (p) => {
          set((x) => ({
            ...x,
            uploadProgress: p,
            stage: p >= 100 ? 'processing' : 'uploading',
            progress: p < 100 ? Math.round(p * 0.3) : Math.max(x.progress, 30),
          }));
        },
        (prog) => {
          set((x) => {
            const pct = prog.percent ?? x.ffmpegProgress;
            return {
              ...x,
              stage: 'processing',
              ffmpegProgress: pct,
              speed: prog.speed || x.speed,
              progress: 30 + Math.round(pct * 0.7),
            };
          });
        }
      );
      set({
        busy: false,
        stage: 'done',
        progress: 100,
        uploadProgress: 100,
        ffmpegProgress: 100,
        speed: null,
        result: data,
        error: null,
      });
      return data;
    } catch (e) {
      set({
        busy: false,
        stage: 'error',
        progress: 0,
        uploadProgress: 0,
        ffmpegProgress: 0,
        speed: null,
        result: null,
        error: e.message,
      });
      return null;
    }
  }, []);

  const reset = useCallback(() => set({
    busy: false,
    stage: 'idle',
    progress: 0,
    uploadProgress: 0,
    ffmpegProgress: 0,
    speed: null,
    result: null,
    error: null,
  }), []);

  return { ...s, run, reset };
}
