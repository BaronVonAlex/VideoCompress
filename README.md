# VideoCompress

Local-only video compressor. Pick a hard max file size, get a guaranteed-under-limit output. No uploads, no cloud — everything stays on your machine.

## Requirements

- [Bun](https://bun.sh) runtime
- [FFmpeg](https://ffmpeg.org/download.html) in PATH (`winget install ffmpeg` on Windows)

## Setup

```bash
# Install dependencies (one-time)
cd backend && bun install
cd ../frontend && bun install
```

## Run

Open two terminals:

```bash
# Terminal 1 — backend (http://localhost:3847)
cd backend && bun run dev

# Terminal 2 — frontend (http://localhost:5842)
cd frontend && bun run dev
```

Then open **http://localhost:5173** in your browser.
