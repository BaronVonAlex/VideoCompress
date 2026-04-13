import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { spawnSync } from 'node:child_process';
import { detectEncoder, getEncoderLabel } from './services/gpu.ts';
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

app.use('*', cors({ origin: 'http://localhost:5842' })); // frontend dev port

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

app.route('/api/compress', compressRouter);
app.route('/api/status', statusRouter);

// Expose detected encoder to frontend
app.get('/api/encoder', (c) => {
  return c.json({ encoder: startupEncoder, label: getEncoderLabel(startupEncoder as any) });
});

// Health check
app.get('/api/health', (c) => c.json({ ok: true }));

const PORT = 3847;
console.log(`[server] Listening on http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
  maxRequestBodySize: 1024 * 1024 * 1024, // 1 GB
};
