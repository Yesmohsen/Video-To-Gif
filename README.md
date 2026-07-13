# Video To Gif

A fully offline, browser-based video to GIF converter built with React, Vite, and ffmpeg.wasm. No server needed — everything runs in your browser.

**[Try it live →](https://yesmohsen.github.io/Video-To-Gif/)**

## Features

- Fully offline — no uploads, no server, all processing in browser
- 2-pass palette-based GIF encoding for compact, high-quality output
- Adjustable FPS, resolution, quality, and playback speed
- Video trimming with dual-range slider
- Floyd-Steinberg dithering toggle
- Auto-download after conversion
- PWA — installable on desktop and mobile

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Outputs to `dist/`, ready for deployment.

## How It Works

Uses ffmpeg.wasm to run ffmpeg entirely in the browser:

1. **First pass** — generates an optimized color palette from the video
2. **Second pass** — uses that palette to encode the GIF (with optional dithering)

## Tech Stack

- React + Vite
- Tailwind CSS
- [ffmpeg.wasm](https://ffmpegwasm.netlify.app/)
- PWA (Workbox)
