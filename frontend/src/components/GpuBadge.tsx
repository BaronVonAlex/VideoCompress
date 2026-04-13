interface Props {
  label: string;
  encoder: string;
}

export function GpuBadge({ label, encoder }: Props) {
  const isGpu = encoder !== 'libx264';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs border rounded
        ${isGpu
          ? 'border-terminal-green text-terminal-green'
          : 'border-terminal-text-dim text-terminal-text-dim'
        }`}
    >
      <span>{isGpu ? '⚡' : '🖥'}</span>
      <span>{label}</span>
    </span>
  );
}
