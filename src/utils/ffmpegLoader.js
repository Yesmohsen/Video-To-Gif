import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const CORE_BASE_URL = `${base}/ffmpeg-core`;

let ffmpegInstance = null;
let loadPromise = null;

export async function getFFmpeg(onProgress) {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  const ffmpeg = new FFmpeg();

  ffmpeg.on('log', ({ message }) => {
    const match = message.match(/frame=\s*(\d+)/);
    if (match && onProgress) {
      onProgress({
        type: 'frame',
        frame: parseInt(match[1]),
        message,
      });
    }
  });

  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) {
      onProgress({ type: 'progress', progress: progress * 100 });
    }
  });

  loadPromise = (async () => {
    try {
      onProgress?.({ type: 'download', stage: 'Core script...', pct: 10 });
      const coreURL = await toBlobURL(
        `${CORE_BASE_URL}/ffmpeg-core.js`,
        'text/javascript'
      );
      onProgress?.({ type: 'download', stage: 'WASM binary...', pct: 40 });

      const wasmURL = await toBlobURL(
        `${CORE_BASE_URL}/ffmpeg-core.wasm`,
        'application/wasm'
      );
      onProgress?.({ type: 'download', stage: 'Initializing...', pct: 85 });

      await ffmpeg.load({ coreURL, wasmURL });
      ffmpegInstance = ffmpeg;
      onProgress?.({ type: 'ready' });
      return ffmpeg;
    } catch (err) {
      loadPromise = null;
      throw err;
    }
  })();

  return loadPromise;
}

export function resetFFmpeg() {
  ffmpegInstance = null;
  loadPromise = null;
}
