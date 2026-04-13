import { useEffect, useState } from 'react';
import { Dropzone } from './components/Dropzone.tsx';
import { SizeSelector } from './components/SizeSelector.tsx';
import { ProgressBar } from './components/ProgressBar.tsx';
import { ResultCard } from './components/ResultCard.tsx';
import { GpuBadge } from './components/GpuBadge.tsx';
import { useCompressJob } from './hooks/useCompressJob.ts';

type AppPhase = 'idle' | 'compressing' | 'done' | 'error';

interface EncoderInfo {
  encoder: string;
  label: string;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [targetSizeMB, setTargetSizeMB] = useState(8);
  const [preferGpu, setPreferGpu] = useState(true);
  const [phase, setPhase] = useState<AppPhase>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [encoderInfo, setEncoderInfo] = useState<EncoderInfo | null>(null);

  const job = useCompressJob(jobId);

  // Fetch detected encoder on mount
  useEffect(() => {
    fetch('/api/encoder')
      .then((r) => r.json())
      .then((d: EncoderInfo) => setEncoderInfo(d))
      .catch(() => {});
  }, []);

  // React to job completion
  useEffect(() => {
    if (!job) return;
    if (job.status === 'done') setPhase('done');
    if (job.status === 'error') setPhase('error');
  }, [job?.status]);

  const handleCompress = async () => {
    if (!file) return;
    if (jobId) discardJob(jobId);
    setSubmitError('');
    setPhase('compressing');
    setJobId(null);

    const form = new FormData();
    form.append('file', file);
    form.append('targetSizeMB', String(targetSizeMB));
    form.append('preferGpu', String(preferGpu));

    try {
      const res = await fetch('/api/compress', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? 'Unknown error');
        setPhase('error');
        return;
      }
      setJobId(data.jobId);
    } catch (e: any) {
      setSubmitError('Could not reach backend. Is it running?');
      setPhase('error');
    }
  };

  const discardJob = (id: string) => {
    fetch(`/api/status/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleReset = () => {
    if (jobId) discardJob(jobId);
    setFile(null);
    setJobId(null);
    setPhase('idle');
    setSubmitError('');
  };

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
      <div className="w-full max-w-lg bg-terminal-surface border border-terminal-border rounded p-6 space-y-6">

        {phase === 'idle' && (
          <>
            <Dropzone onFile={setFile} />
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

            <button
              disabled={!file}
              onClick={handleCompress}
              className={`w-full py-3 text-sm font-bold uppercase tracking-widest border rounded transition-colors
                ${file
                  ? 'border-terminal-green text-terminal-green hover:bg-terminal-green-muted'
                  : 'border-terminal-border text-terminal-text-dim cursor-not-allowed'
                }`}
            >
              Compress
            </button>
          </>
        )}

        {phase === 'compressing' && (
          <div className="space-y-4">
            <p className="text-terminal-text-dim text-xs uppercase tracking-widest">
              {job ? `Job ${job.jobId.slice(0, 8)}…` : 'Uploading…'}
            </p>
            {job && (
              <ProgressBar
                progress={job.progress}
                pass={job.pass}
                encoder={job.encoder}
              />
            )}
            {!job && (
              <div className="text-terminal-text-dim text-xs animate-pulse">Sending to encoder…</div>
            )}
          </div>
        )}

        {phase === 'done' && job && job.outputSizeBytes !== undefined && (
          <ResultCard
            inputSizeBytes={job.inputSizeBytes}
            outputSizeBytes={job.outputSizeBytes}
            downloadUrl={job.downloadUrl!}
            onReset={handleReset}
          />
        )}

        {phase === 'error' && (
          <div className="space-y-4">
            <div className="text-terminal-red text-sm">
              ✗ {submitError || job?.errorMessage || 'An unknown error occurred.'}
            </div>
            <button
              onClick={handleReset}
              className="w-full py-2 text-sm border border-terminal-border text-terminal-text-dim rounded hover:border-terminal-green-dim hover:text-terminal-text-primary transition-colors"
            >
              Try again
            </button>
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
