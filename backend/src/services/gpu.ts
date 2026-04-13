import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type Encoder = 'h264_nvenc' | 'h264_amf' | 'h264_qsv' | 'libx264';

const NULL_OUTPUT = process.platform === 'win32' ? 'NUL' : '/dev/null';

function testEncoder(encoder: string): boolean {
  // Generate a 1-frame black video and encode it with the candidate encoder
  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-f', 'lavfi',
      '-i', 'color=black:s=320x240:d=1',
      '-c:v', encoder,
      '-frames:v', '1',
      '-f', 'null',
      NULL_OUTPUT,
    ],
    { timeout: 10_000, stdio: 'pipe' }
  );
  return result.status === 0;
}

let detectedEncoder: Encoder | null = null;

export async function detectEncoder(): Promise<Encoder> {
  if (detectedEncoder) return detectedEncoder;

  const candidates: Encoder[] = ['h264_nvenc', 'h264_amf', 'h264_qsv'];
  for (const enc of candidates) {
    if (testEncoder(enc)) {
      console.log(`[gpu] Detected encoder: ${enc}`);
      detectedEncoder = enc;
      return enc;
    }
  }

  console.log('[gpu] No GPU encoder found, falling back to libx264');
  detectedEncoder = 'libx264';
  return 'libx264';
}

export function getEncoderLabel(encoder: Encoder): string {
  switch (encoder) {
    case 'h264_nvenc': return 'NVIDIA NVENC';
    case 'h264_amf':   return 'AMD AMF';
    case 'h264_qsv':   return 'Intel QSV';
    case 'libx264':    return 'CPU (libx264)';
  }
}

export function isGpuEncoder(encoder: Encoder): boolean {
  return encoder !== 'libx264';
}
