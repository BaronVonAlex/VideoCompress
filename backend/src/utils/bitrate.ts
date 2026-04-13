const SAFETY_BUFFER = 0.97;
const AUDIO_BITRATE_BPS = 128_000; // 128 kbps fixed audio

export interface BitrateResult {
  videoBitrateKbps: number;
  audioBitrateKbps: number;
  effectiveTargetBytes: number;
}

export function calculateBitrate(targetSizeMB: number, durationSeconds: number): BitrateResult {
  const targetSizeBytes = targetSizeMB * 1024 * 1024;
  const effectiveTargetBytes = targetSizeBytes * SAFETY_BUFFER;
  const totalBits = effectiveTargetBytes * 8;
  const videoBitrateBps = totalBits / durationSeconds - AUDIO_BITRATE_BPS;

  if (videoBitrateBps <= 0) {
    throw new Error(
      `Target size ${targetSizeMB} MB is too small for a ${durationSeconds.toFixed(1)}s video`
    );
  }

  return {
    videoBitrateKbps: Math.floor(videoBitrateBps / 1000),
    audioBitrateKbps: 128,
    effectiveTargetBytes,
  };
}

export function estimateQualityLabel(videoBitrateKbps: number): string {
  if (videoBitrateKbps >= 4000) return 'excellent';
  if (videoBitrateKbps >= 1500) return 'good';
  if (videoBitrateKbps >= 500) return 'fair';
  return 'poor';
}
