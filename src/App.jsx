import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, Film, Download, ClipboardCopy, X, Settings, Image,
  Clock, Monitor, Play, Square, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2, Crop, Palette, WifiOff, Type
} from 'lucide-react';
import { convertVideoToGif } from './utils/gifConverter';

export default function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoWidth, setVideoWidth] = useState(0);
  const [videoHeight, setVideoHeight] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [fps, setFps] = useState(8);
  const [speed, setSpeed] = useState(1);
  const [outputWidth, setOutputWidth] = useState(320);
  const [quality, setQuality] = useState(256);
  const [dithering, setDithering] = useState(false);
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(32);
  const [fontColor, setFontColor] = useState('#FFFFFF');
  const [textPosition, setTextPosition] = useState('bottom');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [ffLoading, setFFLoading] = useState(false);
  const [ffLoadProgress, setFFLoadProgress] = useState(0);
  const [progress, setProgress] = useState(0);
  const [gifBlob, setGifBlob] = useState(null);
  const [gifUrl, setGifUrl] = useState('');
  const [gifSize, setGifSize] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const videoRef = useRef(null);
  const cancelRef = useRef(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('video/')) return;
    setError('');
    setGifBlob(null);
    setGifUrl('');
    setShowResult(false);
    if (videoUrl) URL.revokeObjectURL(videoUrl);

    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(url);
  }, [videoUrl]);

  const onVideoLoaded = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const dur = v.duration;
    setVideoDuration(dur);
    setVideoWidth(v.videoWidth);
    setVideoHeight(v.videoHeight);
    setStartTime(0);
    setEndTime(Math.min(dur, 10));
    setCurrentTime(0);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }, []);

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (v) setCurrentTime(v.currentTime);
  }, []);

  const onVideoEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const formatTime = (t) => {
    if (!t || isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getOutputHeight = () => {
    if (!videoWidth || !videoHeight) return Math.round(outputWidth / 1.77);
    return Math.round(outputWidth / (videoWidth / videoHeight));
  };

  const handleConvert = async () => {
    if (!videoFile || !videoDuration) return;
    setError('');
    setProcessing(true);
    setFFLoading(true);
    setFFLoadProgress(0);
    setProgress(0);
    cancelRef.current = false;

    try {
      const blob = await convertVideoToGif({
        videoFile,
        startTime,
        endTime,
        fps,
        speed,
        width: outputWidth,
        quality,
        dithering,
        text,
        fontSize,
        fontColor,
        textPosition,
        onFFLoad: (pct) => {
          setFFLoadProgress(pct);
          if (pct >= 100) setFFLoading(false);
        },
        onProgress: setProgress,
        cancelRef,
      });

      if (cancelRef.current || !blob) {
        setProcessing(false);
        return;
      }

      const url = URL.createObjectURL(blob);
      setGifBlob(blob);
      setGifUrl(url);
      setGifSize(blob.size);
      setShowResult(true);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${videoFile.name.replace(/\.[^.]+$/, '')}.gif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Conversion failed:', e);
      setError(e.message || 'Conversion failed. Check console for details.');
    } finally {
      setProcessing(false);
      setFFLoading(false);
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const handleDownload = () => {
    if (!gifBlob) return;
    const a = document.createElement('a');
    a.href = gifUrl;
    a.download = `${videoFile.name.replace(/\.[^.]+$/, '')}.gif`;
    a.click();
  };

  const handleCopy = async () => {
    if (!gifBlob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/gif': gifBlob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const duration = endTime - startTime;
  const totalFrames = Math.min(Math.floor(duration * fps / speed), 600);
  const bytesPerPxFrame = 0.18;
  const estimatedSize = totalFrames * outputWidth * getOutputHeight() * bytesPerPxFrame;
  const estimatedMB = estimatedSize / (1024 * 1024);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (gifUrl) URL.revokeObjectURL(gifUrl);
    };
  }, [videoUrl, gifUrl]);

  const PwaInstallButton = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
      const handler = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      const installedHandler = () => setInstalled(true);
      window.addEventListener('beforeinstallprompt', handler);
      window.addEventListener('appinstalled', installedHandler);
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        window.removeEventListener('appinstalled', installedHandler);
      };
    }, []);

    const handleInstall = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
    };

    if (installed) return null;

    return deferredPrompt ? (
      <button onClick={handleInstall}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600/20 text-indigo-300 rounded-lg border border-indigo-500/30 hover:bg-indigo-600/30 transition-colors">
        <Monitor size={14} />
        Install App
      </button>
    ) : null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Film size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">Video to GIF</h1>
              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                <WifiOff size={10} /> Fully offline &middot; FFmpeg powered
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PwaInstallButton />
             <a href="https://github.com/Yesmohsen/Video-To-Gif"
              target="_blank" rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-300 transition-colors">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {!videoUrl ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200 min-h-[400px] cursor-pointer
              ${dragOver
                ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
                : 'border-slate-700 hover:border-slate-500 bg-slate-900/50'
              }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
            />
            <div className="flex flex-col items-center gap-4 pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-indigo-500/15 flex items-center justify-center">
                <Upload size={28} className="text-indigo-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-slate-200">
                  Drop your video here
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  or click to browse &middot; MP4, WebM, MOV
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <WifiOff size={12} />
                All processing is done on your device
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
                  <div className="relative bg-black">
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      className="w-full max-h-[400px] object-contain"
                      onLoadedMetadata={onVideoLoaded}
                      onTimeUpdate={onTimeUpdate}
                      onEnded={onVideoEnded}
                      muted
                      playsInline
                    />
                    {!videoDuration && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="loader" />
                      </div>
                    )}
                  </div>
                  {videoDuration > 0 && (
                    <div className="px-4 py-2 flex items-center gap-3 border-t border-slate-800">
                      <button onClick={togglePlay}
                        className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200">
                        {isPlaying ? <Square size={16} /> : <Play size={16} />}
                      </button>
                      <span className="text-xs text-slate-400 font-mono tabular-nums">
                        {formatTime(currentTime)} / {formatTime(videoDuration)}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={videoDuration || 0}
                        step={0.01}
                        value={currentTime}
                        onChange={(e) => {
                          const t = parseFloat(e.target.value);
                          setCurrentTime(t);
                          if (videoRef.current) videoRef.current.currentTime = t;
                        }}
                        className="flex-1 h-1"
                      />
                    </div>
                  )}
                </div>

                <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Crop size={14} className="text-indigo-400" />
                      Trim Range
                    </div>
                    <div className="flex gap-3 text-xs text-slate-500 font-mono tabular-nums">
                      <span className="text-indigo-400">{formatTime(startTime)}</span>
                      <span>&ndash;</span>
                      <span className="text-indigo-400">{formatTime(endTime)}</span>
                      <span className="text-slate-600">|</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                  <div className="slider-container">
                    <div className="slider-track" />
                    <div
                      className="slider-range"
                      style={{
                        left: `${(startTime / (videoDuration || 1)) * 100}%`,
                        width: `${(duration / (videoDuration || 1)) * 100}%`,
                      }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={videoDuration || 0}
                      step={0.05}
                      value={startTime}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setStartTime(Math.min(v, endTime - 0.1));
                      }}
                      className="slider-input"
                    />
                    <input
                      type="range"
                      min={0}
                      max={videoDuration || 0}
                      step={0.05}
                      value={endTime}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setEndTime(Math.max(v, startTime + 0.1));
                      }}
                      className="slider-input"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Image size={14} className="text-indigo-400" />
                    Dimensions
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[11px] text-slate-500 mb-1 block">Width (px)</label>
                      <input type="number" min={64} max={3840}
                        value={outputWidth}
                        onChange={(e) => setOutputWidth(Math.max(64, Math.min(3840, parseInt(e.target.value) || 64)))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] text-slate-500 mb-1 block">Height (px)</label>
                      <div className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-400 text-center">
                        {getOutputHeight()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {[240, 320, 480, 640, 720].map((w) => (
                      <button key={w} onClick={() => setOutputWidth(w)}
                        className={`flex-1 text-xs py-1 rounded-md transition-colors ${outputWidth === w
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                          : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:border-slate-600'
                        }`}>
                        {w}p
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Clock size={14} className="text-indigo-400" />
                    Timing
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[11px] text-slate-500 mb-1 block">FPS</label>
                      <select value={fps} onChange={(e) => setFps(parseInt(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                        {[5, 8, 10, 12, 15, 20, 24, 30].map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] text-slate-500 mb-1 block">Speed</label>
                      <select value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                        {[0.25, 0.5, 0.75, 1, 1.5, 2].map(s => (
                          <option key={s} value={s}>{s}x</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
                  <button onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between p-4 text-sm text-slate-300 hover:bg-slate-800/50 transition-colors">
                    <span className="flex items-center gap-2">
                      <Settings size={14} className="text-indigo-400" />
                      Advanced
                    </span>
                    {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showAdvanced && (
                    <div className="px-4 pb-4 space-y-4 border-t border-slate-800 pt-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                          <Type size={12} />
                          Text Overlay
                        </div>
                        <input type="text" value={text} placeholder="Enter text..."
                          onChange={(e) => setText(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 mb-2" />
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[11px] text-slate-500 mb-1 block">Size</label>
                            <select value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                              {[16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72].map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="text-[11px] text-slate-500 mb-1 block">Position</label>
                            <select value={textPosition} onChange={(e) => setTextPosition(e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                              <option value="top">Top</option>
                              <option value="center">Center</option>
                              <option value="bottom">Bottom</option>
                            </select>
                          </div>
                          <div className="w-12">
                            <label className="text-[11px] text-slate-500 mb-1 block">Color</label>
                            <input type="color" value={fontColor}
                              onChange={(e) => setFontColor(e.target.value)}
                              className="w-full h-[34px] bg-slate-800 border border-slate-700 rounded-lg cursor-pointer p-0.5" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                          <Palette size={12} />
                          Color Quality
                        </div>
                        <div className="flex gap-2">
                          {[64, 128, 192, 256].map((c) => (
                            <button key={c} onClick={() => setQuality(c)}
                              className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${quality === c
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:border-slate-600'
                              }`}>
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                        <input type="checkbox" checked={dithering}
                          onChange={(e) => setDithering(e.target.checked)}
                          className="rounded bg-slate-800 border-slate-600 text-indigo-500 focus:ring-indigo-500/40 w-4 h-4" />
                        Floyd-Steinberg Dithering
                        <span className="text-slate-600">(reduces banding)</span>
                      </label>
                    </div>
                  )}
                </div>

                <button onClick={handleConvert} disabled={processing || !videoDuration}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:shadow-none">
                  {processing ? (
                    <>
                      <div className="loader w-5 h-5 border-2 border-white/30 border-b-white" />
                      {ffLoading ? 'Loading FFmpeg...' : 'Converting...'}
                    </>
                  ) : (
                    <>
                      <Film size={18} />
                      Convert to GIF
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-4 bg-slate-900/40 rounded-xl border border-slate-800/60 p-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span>Source: {videoFile?.name}</span>
                  <span>{videoWidth}x{videoHeight}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Frames: ~{totalFrames || 0}</span>
                  <span>Output: {outputWidth}x{getOutputHeight()}</span>
                  <span className={`${estimatedMB > 5 ? 'text-amber-400' : 'text-slate-600'}`}>
                    Est. size: {estimatedMB > 1
                      ? `${estimatedMB.toFixed(1)} MB`
                      : `${(estimatedSize / 1024).toFixed(0)} KB`}
                  </span>
                </div>
              </div>
            </div>
            {estimatedMB > 5 && (
              <div className="mt-3 flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-xl border border-amber-500/20 p-3">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>Large output expected. Try lowering resolution, FPS, or trimming a shorter segment.</span>
              </div>
            )}
          </>
        )}
      </main>

      {processing && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex flex-col items-center gap-6">
              <div className="loader w-12 h-12" />
              <div className="text-center">
                {ffLoading ? (
                  <>
                    <p className="text-lg font-semibold text-slate-200">Loading FFmpeg Engine</p>
                    <p className="text-sm text-slate-500 mt-1">Downloading WASM core (~25 MB)</p>
                    <p className="text-xs text-slate-600 mt-2">Cached for offline use after first load</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-slate-200">Converting...</p>
                    <p className="text-sm text-slate-500 mt-1">This may take a moment</p>
                  </>
                )}
              </div>
              <div className="w-full">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{ffLoading ? 'Downloading' : 'Progress'}</span>
                  <span className="font-mono">{ffLoading ? ffLoadProgress : progress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="progress-bar h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    style={{ width: `${ffLoading ? ffLoadProgress : progress}%` }} />
                </div>
              </div>
              <button onClick={handleCancel}
                className="px-6 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showResult && gifUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <span className="font-semibold text-slate-200">GIF Ready</span>
              </div>
              <button onClick={() => setShowResult(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <div className="bg-slate-800/50 rounded-xl overflow-hidden mb-4">
                <img src={gifUrl} alt="Generated GIF"
                  className="w-full max-h-[300px] object-contain" />
              </div>
              <div className="flex items-center justify-between text-sm mb-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Image size={14} />
                  <span>{outputWidth}x{getOutputHeight()}</span>
                  <span className="text-slate-600">|</span>
                  <span>{fps} FPS</span>
                  <span className="text-slate-600">|</span>
                  <span>{speed}x</span>
                </div>
                <div className="text-sm">
                  {gifSize > 1048576
                    ? <span className="text-slate-300 font-mono">{(gifSize / 1048576).toFixed(1)} MB</span>
                    : <span className="text-slate-300 font-mono">{(gifSize / 1024).toFixed(0)} KB</span>
                  }
                </div>
              </div>
              {gifSize > 5 * 1024 * 1024 && (
                <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg p-3 mb-4">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>Large file size. Try lowering FPS, resolution, or trimming a shorter segment.</span>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={handleDownload}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Download size={16} />
                  Download
                </button>
                <button onClick={handleCopy}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl transition-colors border border-slate-700 flex items-center justify-center gap-2">
                  <ClipboardCopy size={16} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              {copied && (
                <p className="text-center text-xs text-emerald-400 mt-3">
                  GIF copied! Paste it anywhere (Ctrl+V)
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-700/50 rounded-xl px-5 py-3 shadow-2xl max-w-md mx-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-200 font-medium">Conversion Error</p>
              <p className="text-xs text-red-300/80 mt-0.5 break-words">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-200 shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <footer className="border-t border-slate-800/40 bg-slate-900/30 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between text-xs text-slate-600">
          <span>Video to GIF &mdash; Powered by FFmpeg.wasm</span>
          <span className="flex items-center gap-1">
            <WifiOff size={10} />
            No data leaves your device
          </span>
        </div>
      </footer>
    </div>
  );
}
