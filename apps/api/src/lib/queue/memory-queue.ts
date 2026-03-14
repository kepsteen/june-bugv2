export const MEMORY_JOB_VERSION = 1;
export const MEMORY_EXCHANGE = 'memory.events';
export const MEMORY_ROUTING_KEY = 'entry.changed';
export const MEMORY_QUEUE = 'memory.extract';
export const MEMORY_DLX = 'memory.events.dlx';
export const MEMORY_DLQ = 'memory.extract.dlq';

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
