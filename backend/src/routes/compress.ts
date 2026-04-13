import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'node:path';
import { writeFile, stat, mkdir } from 'node:fs/promises';
import { detectEncoder } from '../services/gpu.ts';
import { getVideoDuration, runEncode } from '../services/ffmpeg.ts';
import { calculateBitrate } from '../utils/bitrate.ts';
import { createJob, updateJob } from '../services/jobs.ts';

const TEMP_DIR = join(process.cwd(), 'temp');
await mkdir(TEMP_DIR, { recursive: true });

export const compressRouter = new Hono();

compressRouter.post('/', async (c) => {
  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: 'Invalid multipart form data' }, 400);
  }

  const file = formData.get('file') as File | null;
  const targetSizeMBRaw = formData.get('targetSizeMB');
  const preferGpu = formData.get('preferGpu') !== 'false';

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'Missing file' }, 400);
  }
  if (!targetSizeMBRaw) {
    return c.json({ error: 'Missing targetSizeMB' }, 400);
  }

  const targetSizeMB = parseFloat(String(targetSizeMBRaw));
  if (isNaN(targetSizeMB) || targetSizeMB <= 0) {
    return c.json({ error: 'Invalid targetSizeMB' }, 400);
  }

  const jobId = uuidv4();
  const ext = file.name.split('.').pop() ?? 'mp4';
  const inputPath = join(TEMP_DIR, `${jobId}_input.${ext}`);
  const outputPath = join(TEMP_DIR, `${jobId}_output.mp4`);

  // Save upload to disk
  const buffer = await file.arrayBuffer();
  await writeFile(inputPath, Buffer.from(buffer));

  const inputStat = await stat(inputPath);
  const encoder = preferGpu ? await detectEncoder() : 'libx264';

  let duration: number;
  try {
    duration = await getVideoDuration(inputPath);
  } catch (e: any) {
    const isNotFound = e.code === 'ENOENT' || e.message?.includes('ENOENT');
    const msg = isNotFound
      ? 'ffprobe not found. Install FFmpeg and make sure it is in your PATH (winget install ffmpeg).'
      : `Could not read video duration: ${e.message}`;
    return c.json({ error: msg }, 422);
  }

  let bitrateResult;
  try {
    bitrateResult = calculateBitrate(targetSizeMB, duration);
  } catch (e: any) {
    return c.json({ error: e.message }, 422);
  }

  const job = createJob(jobId, inputPath, outputPath, inputStat.size, encoder);

  // Run encoding asynchronously
  runEncode({
    inputPath,
    outputPath,
    encoder,
    videoBitrateKbps: bitrateResult.videoBitrateKbps,
    jobId,
    duration,
  })
    .then(async () => {
      const outputStat = await stat(outputPath);
      updateJob(jobId, {
        status: 'done',
        progress: 100,
        outputSizeBytes: outputStat.size,
      });
    })
    .catch((err: Error) => {
      updateJob(jobId, {
        status: 'error',
        errorMessage: err.message,
      });
    });

  return c.json({ jobId, encoder, videoBitrateKbps: bitrateResult.videoBitrateKbps });
});
