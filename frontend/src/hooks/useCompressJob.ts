import { useEffect, useRef, useState } from 'react';

export type JobStatus = 'queued' | 'processing' | 'done' | 'error';

export interface JobState {
  jobId: string;
  status: JobStatus;
  progress: number;
  pass: 1 | 2;
  encoder: string;
  inputSizeBytes: number;
  outputSizeBytes?: number;
  errorMessage?: string;
  downloadUrl?: string;
}

export function useCompressJob(jobId: string | null): JobState | null {
  const [state, setState] = useState<JobState | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobId) {
      setState(null);
      return;
    }

    const poll = async () => {
      try {
        const res = await fetch(`/api/status/${jobId}`);
        if (!res.ok) return;
        const data: JobState = await res.json();
        setState(data);

        if (data.status === 'done' || data.status === 'error') {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch {
        // Network hiccup — keep polling
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId]);

  return state;
}
