import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { spawnSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript',
  '.mjs':  'text/javascript',
  '.css':  'text/css',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.json': 'application/json',
};
import { detectEncoder, getEncoderLabel } from './services/gpu.ts';
import { collectStaleJobs } from './services/jobs.ts';
import { deleteFile } from './utils/cleanup.ts';
import { compressRouter } from './routes/compress.ts';
import { statusRouter } from './routes/status.ts';

// Check FFmpeg is available before doing anything else
for (const bin of ['ffmpeg', 'ffprobe']) {
  const result = spawnSync(bin, ['-version'], { stdio: 'pipe' });
  if (result.error) {
    console.error(`\n[ERROR] '${bin}' not found in PATH.`);
    console.error('  Install FFmpeg: https://ffmpeg.org/download.html');
    console.error('  Windows: winget install ffmpeg\n');
    process.exit(1);
  }
}

const app = new Hono();

// Allow both dev (Vite) and prod (same-origin) — local-only app, no security concern
app.use('*', cors({ origin: ['http://localhost:5842', 'http://localhost:3847'] }));

// Detect GPU encoder at startup
let startupEncoder = 'libx264';
detectEncoder()
  .then((enc) => {
    startupEncoder = enc;
    console.log(`[startup] Encoder: ${getEncoderLabel(enc as any)}`);
  })
  .catch(() => {
    console.warn('[startup] GPU detection failed, defaulting to libx264');
  });

// Sweep jobs older than 1 hour every 10 minutes (catches abandoned sessions)
setInterval(async () => {
  const paths = collectStaleJobs();
  for (const p of paths) await deleteFile(p);
}, 10 * 60 * 1000);

app.route('/api/compress', compressRouter);
app.route('/api/status', statusRouter);

// Expose detected encoder to frontend
app.get('/api/encoder', (c) => {
  return c.json({ encoder: startupEncoder, label: getEncoderLabel(startupEncoder as any) });
});

// Health check
app.get('/api/health', (c) => c.json({ ok: true }));

// Serve built frontend (production / compiled exe mode)
// Uses process.cwd() explicitly — serveStatic uses import.meta.dir which breaks in compiled binaries
const publicDir = join(process.cwd(), 'public');
if (existsSync(publicDir)) {
  app.get('/*', async (c) => {
    const reqPath = c.req.path === '/' ? '/index.html' : c.req.path;
    let filePath = join(publicDir, reqPath);
    let file = Bun.file(filePath);
    if (!await file.exists()) {
      // SPA fallback
      filePath = join(publicDir, 'index.html');
      file = Bun.file(filePath);
    }
    if (!await file.exists()) return c.notFound();
    const contentType = MIME[extname(filePath)] ?? 'application/octet-stream';
    return new Response(file, { headers: { 'Content-Type': contentType } });
  });
}

const PORT = 3847;
console.log(`[server] Listening on http://localhost:${PORT}`);

// In production (public/ exists) open the browser automatically
if (existsSync(publicDir)) {
  spawn('cmd', ['/c', 'start', '', `http://localhost:${PORT}`], {
    detached: true,
    stdio: 'ignore',
  }).unref();
}

export default {
  port: PORT,
  fetch: app.fetch,
  maxRequestBodySize: 1024 * 1024 * 1024, // 1 GB
};
