import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import type { Encoder } from './gpu.ts';
import { updateJob } from './jobs.ts';

const NULL_OUTPUT = process.platform === 'win32' ? 'NUL' : '/dev/null';

// ─── Duration ────────────────────────────────────────────────────────────────

export async function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      inputPath,
    ]);

    let out = '';
    proc.stdout.on('data', (d: Buffer) => (out += d.toString()));
    proc.on('close', (code) => {
      const seconds = parseFloat(out.trim());
      if (code !== 0 || isNaN(seconds)) {
        reject(new Error('ffprobe failed to read duration'));
      } else {
        resolve(seconds);
      }
    });
  });
}

// ─── Progress parsing ────────────────────────────────────────────────────────

function parseTime(line: string): number | null {
  const m = line.match(/time=(\d+):(\d+):([\d.]+)/);
  if (!m) return null;
  return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
}

// ─── Encoding ────────────────────────────────────────────────────────────────

async function runFfmpeg(args: string[], jobId: string, duration: number, pass: 1 | 2): Promise<void> {
  return new Promise((resolve, reject) => {
    updateJob(jobId, { status: 'processing', pass });

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });

    proc.stderr.on('data', (chunk: Buffer) => {
      const line = chunk.toString();
      const elapsed = parseTime(line);
      if (elapsed !== null && duration > 0) {
        // Pass 1 = 0–50%, Pass 2 = 50–100%
        const passOffset = pass === 1 ? 0 : 50;
        const progress = Math.min(passOffset + (elapsed / duration) * 50, pass === 1 ? 49 : 100);
        updateJob(jobId, { progress: Math.round(progress) });
      }
    });

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
  });
}

// ─── Two-pass CPU (libx264) ──────────────────────────────────────────────────

async function runTwoPassCpu(
  inputPath: string,
  outputPath: string,
  videoBitrateKbps: number,
  jobId: string,
  duration: number
): Promise<void> {
  const passlogFile = outputPath.replace(/\.[^.]+$/, '');

  // Pass 1
  await runFfmpeg([
    '-y', '-i', inputPath,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-b:v', `${videoBitrateKbps}k`,
    '-pass', '1',
    '-passlogfile', passlogFile,
    '-an',
    '-f', 'null', NULL_OUTPUT,
  ], jobId, duration, 1);

  // Pass 2
  await runFfmpeg([
    '-y', '-i', inputPath,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-b:v', `${videoBitrateKbps}k`,
    '-pass', '2',
    '-passlogfile', passlogFile,
    '-c:a', 'aac', '-b:a', '128k',
    outputPath,
  ], jobId, duration, 2);
}

// ─── VBR GPU (NVENC / AMF / QSV) ─────────────────────────────────────────────

async function runVbrGpu(
  inputPath: string,
  outputPath: string,
  encoder: Encoder,
  videoBitrateKbps: number,
  jobId: string,
  duration: number
): Promise<void> {
  const maxrate = Math.round(videoBitrateKbps * 1.5);
  const bufsize = videoBitrateKbps * 4;

  let encoderFlags: string[];
  if (encoder === 'h264_nvenc') {
    encoderFlags = [
      '-preset', 'p7',
      '-tune', 'hq',
      '-rc', 'vbr',
      '-multipass', 'fullres',
    ];
  } else if (encoder === 'h264_amf') {
    encoderFlags = ['-quality', 'quality'];
  } else {
    // h264_qsv
    encoderFlags = ['-preset', 'veryslow'];
  }

  // GPU encoders run in a single invocation; treat as pass 2 visually
  updateJob(jobId, { pass: 2 });
  await runFfmpeg([
    '-y', '-i', inputPath,
    '-c:v', encoder,
    ...encoderFlags,
    '-b:v', `${videoBitrateKbps}k`,
    '-maxrate', `${maxrate}k`,
    '-bufsize', `${bufsize}k`,
    '-c:a', 'aac', '-b:a', '128k',
    outputPath,
  ], jobId, duration, 2);
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function runEncode(opts: {
  inputPath: string;
  outputPath: string;
  encoder: Encoder;
  videoBitrateKbps: number;
  jobId: string;
  duration: number;
}): Promise<void> {
  const { inputPath, outputPath, encoder, videoBitrateKbps, jobId, duration } = opts;

  if (encoder === 'libx264') {
    await runTwoPassCpu(inputPath, outputPath, videoBitrateKbps, jobId, duration);
  } else {
    await runVbrGpu(inputPath, outputPath, encoder, videoBitrateKbps, jobId, duration);
  }
}
