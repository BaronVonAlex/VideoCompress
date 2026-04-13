import { ProgressBar } from './ProgressBar.tsx';

export type ItemStatus = 'pending' | 'uploading' | 'processing' | 'done' | 'error';

export interface QueueItem {
  localId: string;
  file: File;
  status: ItemStatus;
  jobId: string | null;
  progress: number;
  pass: 1 | 2;
  encoder: string;
  inputSizeBytes: number;
  outputSizeBytes: number | null;
  errorMessage: string | null;
  downloadUrl: string | null;
}

interface Props {
  item: QueueItem;
  onRemove: (localId: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const STATUS_LABEL: Record<ItemStatus, string> = {
  pending: 'QUEUED',
  uploading: 'UPLOADING',
  processing: 'ENCODING',
  done: 'DONE',
  error: 'ERROR',
};

const STATUS_COLOR: Record<ItemStatus, string> = {
  pending: 'text-terminal-text-dim',
  uploading: 'text-terminal-green-dim',
  processing: 'text-terminal-green-dim',
  done: 'text-terminal-green',
  error: 'text-terminal-red',
};

export function QueueItemRow({ item, onRemove }: Props) {
  const savedPct =
    item.outputSizeBytes !== null && item.inputSizeBytes
      ? (((item.inputSizeBytes - item.outputSizeBytes) / item.inputSizeBytes) * 100).toFixed(1)
      : null;

  return (
    <div className="border border-terminal-border rounded p-3 space-y-2 bg-terminal-surface">
      {/* Top row: filename + status + remove */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-terminal-text-primary text-xs font-mono truncate flex-1 min-w-0">
          {item.file.name}
        </span>
        <span className={`text-xs uppercase tracking-widest shrink-0 ${STATUS_COLOR[item.status]}`}>
          {STATUS_LABEL[item.status]}
        </span>
        {item.status === 'pending' && (
          <button
            onClick={() => onRemove(item.localId)}
            className="text-terminal-text-dim hover:text-terminal-red text-sm leading-none shrink-0 ml-1"
            title="Remove from queue"
          >
            ×
          </button>
        )}
      </div>

      {/* Progress bar (uploading / processing) */}
      {(item.status === 'uploading' || item.status === 'processing') && (
        <div>
          {item.status === 'uploading' ? (
            <div className="text-terminal-text-dim text-xs animate-pulse">Uploading…</div>
          ) : (
            <ProgressBar progress={item.progress} pass={item.pass} encoder={item.encoder} />
          )}
        </div>
      )}

      {/* Done: stats + download */}
      {item.status === 'done' && item.outputSizeBytes !== null && (
        <div className="flex items-center gap-3">
          <span className="text-terminal-text-dim text-xs">
            {formatBytes(item.inputSizeBytes)} → {formatBytes(item.outputSizeBytes)}
          </span>
          {savedPct && (
            <span className="text-terminal-green text-xs font-bold">−{savedPct}%</span>
          )}
          <a
            href={item.downloadUrl!}
            download
            className="ml-auto text-xs border border-terminal-green text-terminal-green rounded px-2 py-0.5 hover:bg-terminal-green-muted transition-colors"
          >
            ↓ Download
          </a>
        </div>
      )}

      {/* Error */}
      {item.status === 'error' && (
        <div className="text-terminal-red text-xs">
          ✗ {item.errorMessage ?? 'Unknown error'}
        </div>
      )}

      {/* Pending: file size */}
      {item.status === 'pending' && (
        <div className="text-terminal-text-dim text-xs">{formatBytes(item.inputSizeBytes)}</div>
      )}
    </div>
  );
}

export function makeQueueItem(file: File): QueueItem {
  return {
    localId: crypto.randomUUID(),
    file,
    status: 'pending',
    jobId: null,
    progress: 0,
    pass: 1,
    encoder: '',
    inputSizeBytes: file.size,
    outputSizeBytes: null,
    errorMessage: null,
    downloadUrl: null,
  };
}
