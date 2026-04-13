import { useCallback, useState } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

const VIDEO_EXTS = /\.(mp4|mkv|mov|avi|webm|wmv|flv|m4v|ts|mts|m2ts)$/i;

export function Dropzone({ onFiles, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const handleFileList = useCallback(
    (fileList: FileList | File[]) => {
      const valid: File[] = [];
      const invalid: string[] = [];
      for (const f of Array.from(fileList)) {
        if (f.type.startsWith('video/') || VIDEO_EXTS.test(f.name)) {
          valid.push(f);
        } else {
          invalid.push(f.name);
        }
      }
      if (invalid.length) {
        setError(`Not a video file: ${invalid.slice(0, 3).join(', ')}${invalid.length > 3 ? '…' : ''}`);
      } else {
        setError('');
      }
      if (valid.length) onFiles(valid);
    },
    [onFiles]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      handleFileList(e.dataTransfer.files);
    },
    [handleFileList, disabled]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) handleFileList(e.target.files);
      e.target.value = '';
    },
    [handleFileList]
  );

  return (
    <div className="w-full">
      <label
        className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed border-terminal-border' :
            dragging
              ? 'border-terminal-green bg-terminal-green-muted cursor-copy'
              : 'border-terminal-border hover:border-terminal-green-dim bg-terminal-surface cursor-pointer'
          }`}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          type="file"
          accept="video/*"
          multiple
          disabled={disabled}
          className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          onChange={onInputChange}
        />
        <div className="text-center pointer-events-none">
          <div className="text-2xl mb-1 text-terminal-text-dim">⬆</div>
          <div className="text-terminal-text-primary text-sm">Drop videos here or click to browse</div>
          <div className="text-terminal-text-dim text-xs mt-1">MP4, MKV, MOV, AVI, WebM… · multiple files supported</div>
        </div>
      </label>
      {error && <p className="mt-1 text-terminal-red text-xs">{error}</p>}
    </div>
  );
}
