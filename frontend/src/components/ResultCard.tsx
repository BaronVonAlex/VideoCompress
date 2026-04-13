interface Props {
  inputSizeBytes: number;
  outputSizeBytes: number;
  downloadUrl: string;
  onReset: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ResultCard({ inputSizeBytes, outputSizeBytes, downloadUrl, onReset }: Props) {
  const savedBytes = inputSizeBytes - outputSizeBytes;
  const savedPct = ((savedBytes / inputSizeBytes) * 100).toFixed(1);

  return (
    <div className="w-full border border-terminal-green rounded p-4 bg-terminal-surface">
      <div className="text-terminal-green text-sm font-bold mb-4 uppercase tracking-widest">
        ✓ Compression complete
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4 text-center">
        <div>
          <div className="text-terminal-text-dim text-xs uppercase tracking-widest mb-1">Before</div>
          <div className="text-terminal-text-primary text-sm">{formatBytes(inputSizeBytes)}</div>
        </div>
        <div>
          <div className="text-terminal-text-dim text-xs uppercase tracking-widest mb-1">Saved</div>
          <div className="text-terminal-green text-sm font-bold">−{savedPct}%</div>
        </div>
        <div>
          <div className="text-terminal-text-dim text-xs uppercase tracking-widest mb-1">After</div>
          <div className="text-terminal-text-primary text-sm">{formatBytes(outputSizeBytes)}</div>
        </div>
      </div>

      <div className="flex gap-3">
        <a
          href={downloadUrl}
          download
          className="flex-1 text-center py-2 text-sm border border-terminal-green text-terminal-green rounded hover:bg-terminal-green-muted transition-colors"
        >
          ↓ Download
        </a>
        <button
          onClick={onReset}
          className="flex-1 py-2 text-sm border border-terminal-border text-terminal-text-dim rounded hover:border-terminal-green-dim hover:text-terminal-text-primary transition-colors"
        >
          Compress another
        </button>
      </div>
    </div>
  );
}
