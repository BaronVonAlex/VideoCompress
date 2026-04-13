import { useCallback, useState } from 'react';

interface Props {
  onFile: (file: File) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function Dropzone({ onFile }: Props) {
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<File | null>(null);
  const [error, setError] = useState('');

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('video/')) {
        setError('Only video files are supported.');
        return;
      }
      setError('');
      setSelected(file);
      onFile(file);
    },
    [onFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="w-full">
      <label
        className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded cursor-pointer transition-colors
          ${dragging
            ? 'border-terminal-green bg-terminal-green-muted'
            : 'border-terminal-border hover:border-terminal-green-dim bg-terminal-surface'
          }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          type="file"
          accept="video/*"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={onInputChange}
        />
        {selected ? (
          <div className="text-center pointer-events-none">
            <div className="text-terminal-green text-sm">▶ {selected.name}</div>
            <div className="text-terminal-text-dim text-xs mt-1">{formatBytes(selected.size)}</div>
          </div>
        ) : (
          <div className="text-center pointer-events-none">
            <div className="text-3xl mb-2 text-terminal-text-dim">⬆</div>
            <div className="text-terminal-text-primary text-sm">Drop video here or click to browse</div>
            <div className="text-terminal-text-dim text-xs mt-1">MP4, MKV, MOV, AVI, WebM…</div>
          </div>
        )}
      </label>
      {error && <p className="mt-2 text-terminal-red text-xs">{error}</p>}
    </div>
  );
}
