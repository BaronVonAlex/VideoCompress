import { unlink } from 'node:fs/promises';

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    // File may already be gone; ignore
  }
}

export function scheduleCleanup(paths: string[], delayMs = 5 * 60 * 1000): void {
  setTimeout(async () => {
    for (const p of paths) {
      await deleteFile(p);
    }
  }, delayMs);
}
