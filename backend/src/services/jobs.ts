export type JobStatus = 'queued' | 'processing' | 'done' | 'error';

export interface JobState {
  jobId: string;
  status: JobStatus;
  progress: number; // 0-100
  pass: 1 | 2;
  encoder: string;
  inputPath: string;
  outputPath: string;
  inputSizeBytes: number;
  outputSizeBytes?: number;
  errorMessage?: string;
  createdAt: number;
}

const jobs = new Map<string, JobState>();

export function createJob(
  jobId: string,
  inputPath: string,
  outputPath: string,
  inputSizeBytes: number,
  encoder: string
): JobState {
  const job: JobState = {
    jobId,
    status: 'queued',
    progress: 0,
    pass: 1,
    encoder,
    inputPath,
    outputPath,
    inputSizeBytes,
    createdAt: Date.now(),
  };
  jobs.set(jobId, job);
  return job;
}

export function getJob(jobId: string): JobState | undefined {
  return jobs.get(jobId);
}

export function updateJob(jobId: string, patch: Partial<JobState>): void {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, patch);
  }
}

export function deleteJob(jobId: string): void {
  jobs.delete(jobId);
}

// Returns file paths of jobs older than maxAgeMs so the caller can delete them
export function collectStaleJobs(maxAgeMs = 60 * 60 * 1000): string[] {
  const cutoff = Date.now() - maxAgeMs;
  const paths: string[] = [];
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) {
      paths.push(job.inputPath, job.outputPath);
      jobs.delete(id);
    }
  }
  return paths;
}
