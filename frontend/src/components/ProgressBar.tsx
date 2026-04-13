interface Props {
  progress: number; // 0–100
  pass: 1 | 2;
  encoder: string;
}

export function ProgressBar({ progress, pass, encoder }: Props) {
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-terminal-text-dim text-xs uppercase tracking-widest">
          Pass {pass} / 2 — {encoder}
        </span>
        <span className="text-terminal-green text-xs font-bold">{progress}%</span>
      </div>

      {/* Track */}
      <div className="w-full h-3 bg-terminal-surface border border-terminal-border rounded overflow-hidden">
        <div
          className="h-full bg-terminal-green transition-all duration-300 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Scanline animation hint */}
      <div className="mt-1 text-terminal-green-dim text-xs font-mono overflow-hidden whitespace-nowrap">
        {'█'.repeat(Math.floor(progress / 5))}
        <span className="opacity-40">{'░'.repeat(20 - Math.floor(progress / 5))}</span>
      </div>
    </div>
  );
}
