import { fetchFile } from '@ffmpeg/util';
import { getFFmpeg } from './ffmpegLoader';

export { getFFmpeg };

export async function convertVideoToGif({
  videoFile,
  startTime,
  endTime,
  fps = 8,
  speed = 1,
  width = 320,
  quality = 256,
  dithering = false,
  text = '',
  fontSize = 32,
  fontColor = '#FFFFFF',
  textPosition = 'bottom',
  onFFLoad = () => {},
  onProgress = () => {},
  cancelRef = { current: false },
}) {
  const ffmpeg = await getFFmpeg((info) => {
    if (info.type === 'download') {
      onFFLoad(info.pct);
    }
  });
  onFFLoad(100);

  const ext = videoFile.name.split('.').pop().toLowerCase() || 'mp4';
  const inName = `input.${ext}`;
  const outName = 'output.gif';

  await ffmpeg.writeFile(inName, await fetchFile(videoFile));
  if (cancelRef.current) {
    try { await ffmpeg.deleteFile(inName); } catch {}
    return null;
  }

  let textFilter = '';
  if (text.trim()) {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const fontUrl = `${base}/fonts/OpenSans-Regular.ttf`;
    const fontRes = await fetch(fontUrl);
    const fontData = new Uint8Array(await fontRes.arrayBuffer());
    await ffmpeg.writeFile('font.ttf', fontData);
    await ffmpeg.writeFile('text.txt', new TextEncoder().encode(text.trim()));
    const color = fontColor.startsWith('#') ? `0x${fontColor.slice(1)}` : fontColor;
    const margin = 12;
    const posY = textPosition === 'top' ? `${margin}`
      : textPosition === 'center' ? '(h-text_h)/2'
      : `h-text_h-${margin}`;
    textFilter = `drawtext=fontfile=/font.ttf:textfile=/text.txt:fontsize=${fontSize}:fontcolor=${color}:x=(w-text_w)/2:y=${posY}`;
  }

  const duration = endTime - startTime;
  const totalFramesEst = Math.floor(duration * fps / speed) || 1;
  let reportedFrame = 0;
  let lastReportPct = -1;

  const progressHandler = ({ message }) => {
    const m = message.match(/frame=\s*(\d+)/);
    if (m) {
      const frame = parseInt(m[1]);
      if (frame > reportedFrame) {
        reportedFrame = frame;
        const pct = Math.min(100, Math.round((frame / totalFramesEst) * 100));
        if (pct !== lastReportPct) {
          lastReportPct = pct;
          onProgress(pct);
        }
      }
    }
  };

  ffmpeg.on('log', progressHandler);

  const filterParts = [
    `setpts=PTS/${speed}`,
    `fps=${fps}`,
    `scale=${width}:-1:flags=lanczos`,
  ];
  if (textFilter) filterParts.push(textFilter);
  filterParts.push(
    'split[s0][s1]',
    `[s0]palettegen=max_colors=${quality}:stats_mode=diff[p]`,
    `[s1][p]paletteuse=dither=${dithering ? 'floyd_steinberg' : 'none'}`,
  );

  try {
    await ffmpeg.exec([
      '-ss', String(startTime),
      '-t', String(duration),
      '-i', inName,
      '-vf', filterParts.join(','),
      '-loop', '0',
      outName,
    ]);
  } finally {
    ffmpeg.off('log', progressHandler);
  }

  if (cancelRef.current) {
    try { await ffmpeg.deleteFile(inName); } catch {}
    try { await ffmpeg.deleteFile(outName); } catch {}
    return null;
  }

  onProgress(100);

  const data = await ffmpeg.readFile(outName);

  try { await ffmpeg.deleteFile(inName); } catch {}
  try { await ffmpeg.deleteFile(outName); } catch {}

  return new Blob([data], { type: 'image/gif' });
}
