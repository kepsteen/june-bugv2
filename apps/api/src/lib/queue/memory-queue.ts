export const MEMORY_JOB_VERSION = 1;

export type MemoryEntryChangedJob = {
  jobVersion: typeof MEMORY_JOB_VERSION;
  jobId: string;
  userId: string;
  entryId: string;
  entryUpdatedAt: string;
};

export function buildMemoryProcessKey(payload: Pick<MemoryEntryChangedJob, 'entryId' | 'entryUpdatedAt'>) {
  return `memory-process:${payload.entryId}:${payload.entryUpdatedAt}`;
}
