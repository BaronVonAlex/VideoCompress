# VideoCompress

Local-only video compressor. Pick a hard max file size, get a guaranteed-under-limit output. GPU-accelerated (NVIDIA NVENC, AMD AMF, Intel QSV) with automatic CPU fallback. No uploads, no cloud — everything stays on your machine.

---

## Using the app (Windows)

### Prerequisites

| Tool | Install |
|------|---------|
| [Bun](https://bun.sh) | `winget install oven-sh.bun` |
| [FFmpeg](https://ffmpeg.org/download.html) | `winget install ffmpeg` |

> Both must be available in your PATH. Open a new terminal after installing to pick up the changes.

### First run

1. Clone or download this repo
2. Double-click **`launch.vbs`**

On first launch it will build the app automatically (takes ~30 seconds). A terminal window will open and close on its own. After that, your browser opens and the app is ready.

Every run after that is instant — just double-click `launch.vbs`.

### Desktop shortcut (optional)

Right-click `launch.vbs` → **Create shortcut** → move it to your Desktop. Right-click the shortcut → **Properties** → **Change Icon** to give it a proper icon.

### Stopping the app / uninstalling

The app runs a background process (`bun.exe`) that holds port 3847. You must kill it before you can delete the folder.

**Option 1 — Terminal:**
```bash
taskkill /F /IM bun.exe
```

**Option 2 — Task Manager:**
`Ctrl + Shift + Esc` → **Details** tab → find `bun.exe` → right-click → **End Task**

After that you can safely delete the folder.

---

## Development

### Prerequisites

Same as above (Bun + FFmpeg).

### Install dependencies

```bash
cd backend && bun install
cd ../frontend && bun install
```

### Start dev servers

```bash
bun run dev
```

This starts both the backend (`http://localhost:3847`) and the frontend (`http://localhost:5842`) with hot reload.

### Rebuild the production exe

Run this after making any code changes you want in the production build:

```bash
build.bat
```

This builds the frontend, copies it into `public/`, and compiles everything into a single `VideoCompress.exe`.

---

## How it works

1. You drop a video and pick a target file size (e.g. 8 MB)
2. The app calculates the required bitrate to hit that size
3. FFmpeg runs a 2-pass encode — GPU uses NVENC with `multipass fullres`, CPU uses libx264 with `preset slow`
4. The output is guaranteed to be at or under the target size (3% safety buffer)
5. Files are cleaned up automatically after download

## Tech stack

- **Runtime** — Bun
- **Backend** — Hono (TypeScript)
- **Frontend** — React + Vite + Tailwind CSS
- **Video engine** — FFmpeg (spawned as child process)
- **Encoding** — NVIDIA NVENC / AMD AMF / Intel QSV / libx264 fallback
