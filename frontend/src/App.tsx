import { useEffect, useRef, useState } from 'react';
import { Dropzone } from './components/Dropzone.tsx';
import { SizeSelector } from './components/SizeSelector.tsx';
import { GpuBadge } from './components/GpuBadge.tsx';
import { QueueItemRow, makeQueueItem } from './components/QueueItemRow.tsx';
import type { QueueItem } from './components/QueueItemRow.tsx';

interface EncoderInfo {
  encoder: string;
  label: string;
}

export default function App() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [targetSizeMB, setTargetSizeMB] = useState(8);
  const [preferGpu, setPreferGpu] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [encoderInfo, setEncoderInfo] = useState<EncoderInfo | null>(null);

  // Refs so async queue runner always reads fresh values
  const itemsRef = useRef<QueueItem[]>([]);
  itemsRef.current = items;
  const isRunningRef = useRef(false);

  useEffect(() => {
    fetch('/api/encoder')
      .then((r) => r.json())
      .then((d: EncoderInfo) => setEncoderInfo(d))
      .catch(() => {});
  }, []);

  const updateItem = (localId: string, patch: Partial<QueueItem>) => {
    setItems((prev) =>
      prev.map((i) => (i.localId === localId ? { ...i, ...patch } : i))
    );
  };

  // The async queue runner — called once when user clicks Compress
  const runQueue = async (targetMB: number, gpu: boolean) => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setIsRunning(true);

    while (true) {
      const next = itemsRef.current.find((i) => i.status === 'pending');
      if (!next) break;

      const { localId, file } = next;

      // 1. Upload
      updateItem(localId, { status: 'uploading' });

      let jobId: string;
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('targetSizeMB', String(targetMB));
        form.append('preferGpu', String(gpu));

        const res = await fetch('/api/compress', { method: 'POST', body: form });
        const data = await res.json();

        if (!res.ok) {
          updateItem(localId, {
            status: 'error',
            errorMessage: data.error ?? 'Upload failed',
          });
          continue;
        }
        jobId = data.jobId;
      } catch {
        updateItem(localId, {
          status: 'error',
          errorMessage: 'Could not reach backend. Is it running?',
        });
        continue;
      }

      // 2. Poll until done or error
      updateItem(localId, { status: 'processing', jobId });

      await new Promise<void>((resolve) => {
        const interval = setInterval(async () => {
          try {
            const res = await fetch(`/api/status/${jobId}`);
            if (!res.ok) return;
            const job = await res.json();

            if (job.status === 'done') {
              updateItem(localId, {
                status: 'done',
                progress: 100,
                pass: job.pass,
                encoder: job.encoder,
                inputSizeBytes: job.inputSizeBytes ?? file.size,
                outputSizeBytes: job.outputSizeBytes,
                downloadUrl: job.downloadUrl,
              });
              clearInterval(interval);
              resolve();
            } else if (job.status === 'error') {
              updateItem(localId, {
                status: 'error',
                errorMessage: job.errorMessage ?? 'Encoding failed',
              });
              clearInterval(interval);
              resolve();
            } else {
              updateItem(localId, {
                progress: job.progress,
                pass: job.pass,
                encoder: job.encoder,
                inputSizeBytes: job.inputSizeBytes ?? file.size,
              });
            }
          } catch {
            // Network hiccup — keep polling
          }
        }, 1000);
      });
    }

    isRunningRef.current = false;
    setIsRunning(false);
  };

  const handleAddFiles = (files: File[]) => {
    setItems((prev) => [...prev, ...files.map(makeQueueItem)]);
  };

  const handleRemoveItem = (localId: string) => {
    setItems((prev) => prev.filter((i) => i.localId !== localId));
  };

  const handleClearFinished = () => {
    setItems((prev) => prev.filter((i) => i.status === 'pending' || i.status === 'uploading' || i.status === 'processing'));
  };

  const handleReset = () => {
    // Clean up any server-side jobs for done/error items
    for (const item of items) {
      if (item.jobId && (item.status === 'done' || item.status === 'error')) {
        fetch(`/api/status/${item.jobId}`, { method: 'DELETE' }).catch(() => {});
      }
    }
    setItems([]);
    setIsRunning(false);
    isRunningRef.current = false;
  };

  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const doneCount = items.filter((i) => i.status === 'done' || i.status === 'error').length;
  const activeItem = items.find((i) => i.status === 'uploading' || i.status === 'processing');

  return (
    <div className="min-h-screen bg-terminal-bg flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-terminal-green text-xl font-bold tracking-widest uppercase">
            VideoCompress
          </h1>
          {encoderInfo && (
            <GpuBadge encoder={encoderInfo.encoder} label={encoderInfo.label} />
          )}
        </div>
        <div className="h-px bg-terminal-border mt-2" />
      </div>

      {/* Main card */}
      <div className="w-full max-w-lg bg-terminal-surface border border-terminal-border rounded p-6 space-y-5">

        {/* Dropzone — always visible, disabled while running */}
        <Dropzone onFiles={handleAddFiles} disabled={isRunning} />

        {/* Settings — hidden while running */}
        {!isRunning && items.length === 0 && (
          <>
            <SizeSelector value={targetSizeMB} onChange={setTargetSizeMB} />

            {/* GPU toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setPreferGpu((v) => !v)}
                className={`w-10 h-5 rounded-full border transition-colors relative
                  ${preferGpu ? 'bg-terminal-green-muted border-terminal-green' : 'bg-terminal-surface border-terminal-border'}`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform
                    ${preferGpu ? 'translate-x-5 bg-terminal-green' : 'translate-x-0.5 bg-terminal-text-dim'}`}
                />
              </div>
              <span className="text-terminal-text-dim text-xs uppercase tracking-widest">
                {preferGpu ? 'GPU accelerated' : 'CPU (best quality)'}
              </span>
            </label>
          </>
        )}

        {/* Settings when files are queued but not yet running */}
        {!isRunning && items.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <SizeSelector value={targetSizeMB} onChange={setTargetSizeMB} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
              <div
                onClick={() => setPreferGpu((v) => !v)}
                className={`w-10 h-5 rounded-full border transition-colors relative
                  ${preferGpu ? 'bg-terminal-green-muted border-terminal-green' : 'bg-terminal-surface border-terminal-border'}`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform
                    ${preferGpu ? 'translate-x-5 bg-terminal-green' : 'translate-x-0.5 bg-terminal-text-dim'}`}
                />
              </div>
              <span className="text-terminal-text-dim text-xs uppercase tracking-widest">
                {preferGpu ? 'GPU' : 'CPU'}
              </span>
            </label>
          </div>
        )}

        {/* Queue list */}
        {items.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-terminal-text-dim text-xs uppercase tracking-widest">
                Queue — {items.length} video{items.length !== 1 ? 's' : ''}
                {activeItem && ` · processing ${items.findIndex((i) => i.localId === activeItem.localId) + 1}/${items.length}`}
              </span>
              {doneCount > 0 && !isRunning && (
                <button
                  onClick={handleClearFinished}
                  className="text-terminal-text-dim text-xs hover:text-terminal-text-primary transition-colors"
                >
                  Clear finished
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {items.map((item) => (
                <QueueItemRow key={item.localId} item={item} onRemove={handleRemoveItem} />
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isRunning && items.length > 0 && pendingCount > 0 && (
          <button
            onClick={() => runQueue(targetSizeMB, preferGpu)}
            className="w-full py-3 text-sm font-bold uppercase tracking-widest border rounded transition-colors border-terminal-green text-terminal-green hover:bg-terminal-green-muted"
          >
            Compress {pendingCount} video{pendingCount !== 1 ? 's' : ''}
          </button>
        )}

        {!isRunning && items.length > 0 && pendingCount === 0 && (
          <button
            onClick={handleReset}
            className="w-full py-2 text-sm border border-terminal-border text-terminal-text-dim rounded hover:border-terminal-green-dim hover:text-terminal-text-primary transition-colors"
          >
            Start over
          </button>
        )}

        {isRunning && (
          <div className="text-terminal-text-dim text-xs uppercase tracking-widest text-center animate-pulse">
            Queue running — {pendingCount} remaining…
          </div>
        )}

        {items.length === 0 && (
          <div className="text-terminal-text-dim text-xs text-center">
            Select one or more videos above to get started
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="mt-6 text-terminal-text-dim text-xs text-center">
        Local only · No data leaves your machine · Powered by FFmpeg
      </div>
    </div>
  );
}
