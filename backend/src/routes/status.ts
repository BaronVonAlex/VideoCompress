import { Hono } from 'hono';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { getJob } from '../services/jobs.ts';
import { scheduleCleanup } from '../utils/cleanup.ts';

export const statusRouter = new Hono();

statusRouter.get('/:jobId', (c) => {
  const { jobId } = c.req.param();
  const job = getJob(jobId);

  if (!job) {
    return c.json({ error: 'Job not found' }, 404);
  }

  return c.json({
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    pass: job.pass,
    encoder: job.encoder,
    inputSizeBytes: job.inputSizeBytes,
    outputSizeBytes: job.outputSizeBytes,
    errorMessage: job.errorMessage,
    downloadUrl: job.status === 'done' ? `/api/status/download/${jobId}` : null,
  });
});

statusRouter.get('/download/:jobId', async (c) => {
  const { jobId } = c.req.param();
  const job = getJob(jobId);

  if (!job) {
    return c.json({ error: 'Job not found' }, 404);
  }
  if (job.status !== 'done') {
    return c.json({ error: 'Job not complete' }, 400);
  }

  let fileStat;
  try {
    fileStat = await stat(job.outputPath);
  } catch {
    return c.json({ error: 'Output file not found' }, 404);
  }

  const fileStream = createReadStream(job.outputPath);
  const webStream = new ReadableStream({
    start(controller) {
      fileStream.on('data', (chunk) => controller.enqueue(chunk));
      fileStream.on('end', () => controller.close());
      fileStream.on('error', (e) => controller.error(e));
    },
  });

  scheduleCleanup([job.inputPath, job.outputPath]);

  return new Response(webStream, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="compressed_${jobId}.mp4"`,
      'Content-Length': String(fileStat.size),
    },
  });
});
