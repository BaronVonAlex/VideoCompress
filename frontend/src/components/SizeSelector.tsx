import { useState } from 'react';

const PRESETS = [8, 10, 25, 50];

interface Props {
  value: number;
  onChange: (mb: number) => void;
}

export function SizeSelector({ value, onChange }: Props) {
  const [custom, setCustom] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const selectPreset = (mb: number) => {
    setUseCustom(false);
    setCustom('');
    onChange(mb);
  };

  const handleCustom = (raw: string) => {
    setCustom(raw);
    const n = parseFloat(raw);
    if (!isNaN(n) && n > 0) {
      setUseCustom(true);
      onChange(n);
    }
  };

  return (
    <div className="w-full">
      <p className="text-terminal-text-dim text-xs mb-2 uppercase tracking-widest">Target max size</p>
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((mb) => (
          <button
            key={mb}
            onClick={() => selectPreset(mb)}
            className={`px-3 py-1.5 text-sm border rounded transition-colors
              ${!useCustom && value === mb
                ? 'border-terminal-green text-terminal-green bg-terminal-green-muted'
                : 'border-terminal-border text-terminal-text-dim hover:border-terminal-green-dim hover:text-terminal-text-primary'
              }`}
          >
            {mb} MB
          </button>
        ))}
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="1"
            placeholder="custom"
            value={custom}
            onChange={(e) => handleCustom(e.target.value)}
            className={`w-24 px-2 py-1.5 text-sm bg-terminal-surface border rounded outline-none transition-colors
              ${useCustom
                ? 'border-terminal-green text-terminal-green'
                : 'border-terminal-border text-terminal-text-dim'
              } focus:border-terminal-green`}
          />
          <span className="text-terminal-text-dim text-xs">MB</span>
        </div>
      </div>
    </div>
  );
}
