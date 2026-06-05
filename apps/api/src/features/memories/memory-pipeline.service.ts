import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db/index.js';
import { entries } from '@/features/entries/entries.table.js';
import { wrapService } from '@/lib/service-wrapper.js';
import { observabilityService } from '@/features/observability/observability.service.js';
import {
  buildMemoryProcessKey,
  MEMORY_EXCHANGE,
  MEMORY_JOB_VERSION,
  MEMORY_ROUTING_KEY,
  type MemoryEntryChangedJob,
} from '@/lib/queue/memory-queue.js';
import { getPublisherChannel, isRabbitMqEnabled } from '@/lib/queue/rabbitmq.js';
import {
  memoryEvents,
  userMemories,
  type UserMemory,
  type NewUserMemory,
} from './memories.table.js';
import { upsertMemoryEmbedding } from './memory-embedding.helpers.js';
import {
  buildCanonicalKey,
  normalizeForKey,
} from './memory-pipeline.helpers.js';
import { aiService } from '@/lib/ai/ai.service.js';

export class MemoryJobValidationError extends Error {}

const categoryImportance: Record<UserMemory['category'], number> = {
  goal: 0.95,
  project: 0.9,
  milestone: 0.88,
  blocker: 0.85,
  win: 0.9,
  learning: 0.75,
  skill_growth: 0.78,
  preference: 0.6,
  habit: 0.65,
  relationship: 0.65,
  value: 0.6,
  other: 0.45,
};

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

const memoriesPipelineServiceRaw = {
  async publishEntryChangedJob({
    userId,
    entryId,
    entryUpdatedAt,
  }: {
    userId: string;
    entryId: string;
    entryUpdatedAt: string;
  }) {
    const jobId = randomUUID();

    if (!isRabbitMqEnabled()) {
      await observabilityService.recordQueueJobEvent({
        jobId,
        jobType: 'memory_entry_changed',
        userId,
        entryId,
        status: 'skipped',
        retryCount: 0,
        outcome: 'idempotent_duplicate',
        metadata: { reason: 'rabbitmq-disabled' },
      });
      return { published: false as const, reason: 'rabbitmq-disabled' };
    }

    const channel = await getPublisherChannel();
    const job: MemoryEntryChangedJob = {
      jobVersion: MEMORY_JOB_VERSION,
      jobId,
      userId,
      entryId,
      entryUpdatedAt,
    };

    const published = channel.publish(
      MEMORY_EXCHANGE,
      MEMORY_ROUTING_KEY,
      Buffer.from(JSON.stringify(job)),
      {
        persistent: true,
        contentType: 'application/json',
        messageId: job.jobId,
        type: 'memory.entry.changed',
        timestamp: Date.now(),
      },
    );

    await observabilityService.recordQueueJobEvent({
      jobId,
      jobType: 'memory_entry_changed',
      userId,
      entryId,
      status: 'published',
      retryCount: 0,
      metadata: { published, entryUpdatedAt },
    });

    return {
      published,
      job,
    };
  },

  async processEntryChangedJob({ payload }: { payload: unknown }) {
    const parsed = payload as Partial<MemoryEntryChangedJob>;

    if (
      parsed?.jobVersion !== MEMORY_JOB_VERSION ||
      !parsed.userId ||
      !parsed.entryId ||
      !parsed.entryUpdatedAt
    ) {
      throw new MemoryJobValidationError('Invalid memory job payload');
    }

    const jobId = parsed.jobId ?? 'unknown';
    const idempotencyKey = buildMemoryProcessKey({
      entryId: parsed.entryId,
      entryUpdatedAt: parsed.entryUpdatedAt,
    });

    await observabilityService.recordQueueJobEvent({
      jobId,
      jobType: 'memory_entry_changed',
      userId: parsed.userId,
      entryId: null,
      status: 'processing',
      retryCount: 0,
      metadata: { idempotencyKey, entryId: parsed.entryId },
    });

    const [alreadyProcessed] = await db
      .select({ id: memoryEvents.id })
      .from(memoryEvents)
      .where(
        and(
          eq(memoryEvents.eventType, 'updated'),
          sql`${memoryEvents.payload} ->> 'idempotencyKey' = ${idempotencyKey}`,
        ),
      )
      .limit(1);

    if (alreadyProcessed) {
      await observabilityService.recordQueueJobEvent({
        jobId,
        jobType: 'memory_entry_changed',
        userId: parsed.userId,
        entryId: null,
        status: 'skipped',
        retryCount: 0,
        outcome: 'idempotent_duplicate',
        metadata: { idempotencyKey, entryId: parsed.entryId, reason: 'idempotent-duplicate' },
      });
      return { skipped: true as const, reason: 'idempotent-duplicate', idempotencyKey };
    }

    const [entry] = await db
      .select()
      .from(entries)
      .where(and(eq(entries.id, parsed.entryId), eq(entries.userId, parsed.userId)))
      .limit(1);

    if (!entry) {
      await observabilityService.recordQueueJobEvent({
        jobId,
        jobType: 'memory_entry_changed',
        userId: parsed.userId,
        entryId: null,
        status: 'failed',
        retryCount: 0,
        outcome: 'validation_error',
        errorMessage: 'Entry not found for memory job',
        metadata: { idempotencyKey, entryId: parsed.entryId },
      });
      throw new MemoryJobValidationError('Entry not found for memory job');
    }

    const payloadUpdatedAt = new Date(parsed.entryUpdatedAt);
    if (Number.isNaN(payloadUpdatedAt.getTime())) {
      await observabilityService.recordQueueJobEvent({
        jobId,
        jobType: 'memory_entry_changed',
        userId: parsed.userId,
        entryId: parsed.entryId,
        status: 'failed',
        retryCount: 0,
        outcome: 'validation_error',
        errorMessage: 'Invalid entryUpdatedAt timestamp',
        metadata: { idempotencyKey },
      });
      throw new MemoryJobValidationError('Invalid entryUpdatedAt timestamp');
    }

    const plainText = (entry.plainText ?? '').trim();
    if (!plainText) {
      await db.insert(memoryEvents).values({
        memoryId: null,
        eventType: 'updated',
        payload: {
          idempotencyKey,
          jobId: parsed.jobId,
          entryId: entry.id,
          userId: parsed.userId,
          outcome: 'no-entry-text',
          processedAt: new Date().toISOString(),
        },
      });
      await observabilityService.recordQueueJobEvent({
        jobId,
        jobType: 'memory_entry_changed',
        userId: parsed.userId,
        entryId: parsed.entryId,
        status: 'skipped',
        retryCount: 0,
        outcome: 'no_entry_text',
        metadata: { idempotencyKey, reason: 'empty-entry-text' },
      });
      return { skipped: true as const, reason: 'empty-entry-text', idempotencyKey };
    }

    const existingMemories = await db
      .select()
      .from(userMemories)
      .where(
        and(
          eq(userMemories.userId, parsed.userId),
          inArray(userMemories.status, ['active', 'stale']),
        ),
      )
      .orderBy(desc(userMemories.lastSeenAt))
      .limit(150);

    const extracted = await aiService.extractMemoriesFromEntry({
      entryText: plainText,
      existingMemories: existingMemories.map((m) => ({
        category: m.category,
        title: m.title,
        summary: m.summary,
      })),
      userId: parsed.userId,
      entryId: entry.id,
    });

    if (extracted.length === 0) {
      await db.insert(memoryEvents).values({
        memoryId: null,
        eventType: 'updated',
        payload: {
          idempotencyKey,
          jobId: parsed.jobId,
          entryId: entry.id,
          userId: parsed.userId,
          outcome: 'no-candidates',
          processedAt: new Date().toISOString(),
        },
      });
      await observabilityService.recordQueueJobEvent({
        jobId,
        jobType: 'memory_entry_changed',
        userId: parsed.userId,
        entryId: parsed.entryId,
        status: 'skipped',
        retryCount: 0,
        outcome: 'no_candidates',
        metadata: { idempotencyKey, reason: 'no-candidates' },
      });
      return { skipped: true as const, reason: 'no-candidates', idempotencyKey };
    }

    const existingByCanonical = new Map<string, UserMemory>();
    const existingByTitle = new Map<string, UserMemory>();
    for (const memory of existingMemories) {
      if (memory.canonicalKey) existingByCanonical.set(memory.canonicalKey, memory);
      existingByTitle.set(`${memory.category}:${normalizeForKey(memory.title)}`, memory);
    }

    const changedMemoryIds: string[] = [];
    const now = new Date();

    for (const candidate of extracted) {
      const canonicalKey = buildCanonicalKey(candidate.category, candidate.fact);
      const title = candidate.fact.slice(0, 120);
      const fallbackTitleKey = `${candidate.category}:${normalizeForKey(title)}`;
      const matched =
        (canonicalKey ? existingByCanonical.get(canonicalKey) : undefined) ??
        existingByTitle.get(fallbackTitleKey);

      if (candidate.operation === 'archive_hint' && matched) {
        await db
          .update(userMemories)
          .set({
            status: 'stale',
            archivedAt: null,
            confidence: clamp(candidate.confidence),
            lastSeenAt: now,
            updatedAt: now,
          })
          .where(eq(userMemories.id, matched.id));
        changedMemoryIds.push(matched.id);

        await db.insert(memoryEvents).values({
          memoryId: matched.id,
          eventType: 'archived',
          payload: { reason: 'archive_hint', idempotencyKey, entryId: entry.id },
        });
        continue;
      }

      if (matched) {
        await db
          .update(userMemories)
          .set({
            title,
            summary: candidate.fact,
            evidenceEntryId: entry.id,
            confidence: clamp(Math.max(matched.confidence, candidate.confidence)),
            importance: clamp(Math.max(matched.importance, categoryImportance[candidate.category])),
            status: 'active',
            source: 'entry',
            lastSeenAt: now,
            updatedAt: now,
          })
          .where(eq(userMemories.id, matched.id));

        changedMemoryIds.push(matched.id);
        await db.insert(memoryEvents).values({
          memoryId: matched.id,
          eventType: 'merged',
          payload: {
            idempotencyKey,
            entryId: entry.id,
            canonicalKey,
            confidence: candidate.confidence,
            evidenceSpan: candidate.evidenceSpan,
          },
        });
        continue;
      }

      const insertValues: NewUserMemory = {
        userId: parsed.userId,
        category: candidate.category,
        title,
        summary: candidate.fact,
        evidenceEntryId: entry.id,
        canonicalKey,
        confidence: clamp(candidate.confidence),
        importance: categoryImportance[candidate.category],
        firstSeenAt: now,
        lastSeenAt: now,
        status: 'active',
        source: 'entry',
      };

      const [created] = await db.insert(userMemories).values(insertValues).returning();
      changedMemoryIds.push(created.id);

      await db.insert(memoryEvents).values({
        memoryId: created.id,
        eventType: 'created',
        payload: {
          idempotencyKey,
          entryId: entry.id,
          canonicalKey,
          confidence: candidate.confidence,
          evidenceSpan: candidate.evidenceSpan,
        },
      });
    }

    for (const memoryId of changedMemoryIds) {
      const [memory] = await db
        .select()
        .from(userMemories)
        .where(eq(userMemories.id, memoryId))
        .limit(1);
      if (!memory) continue;
      await upsertMemoryEmbedding({
        memoryId: memory.id,
        text: `${memory.title}\n${memory.summary}`,
        userId: parsed.userId,
        entryId: entry.id,
      });
    }

    await db.insert(memoryEvents).values({
      memoryId: null,
      eventType: 'updated',
      payload: {
        idempotencyKey,
        jobId: parsed.jobId,
        userId: parsed.userId,
        entryId: entry.id,
        processedAt: new Date().toISOString(),
        changedMemoryCount: changedMemoryIds.length,
      },
    });

    await observabilityService.recordQueueJobEvent({
      jobId,
      jobType: 'memory_entry_changed',
      userId: parsed.userId,
      entryId: parsed.entryId,
      status: 'completed',
      retryCount: 0,
      outcome: 'success',
      metadata: { idempotencyKey, changedMemoryCount: changedMemoryIds.length },
    });

    return { processed: true as const, idempotencyKey, changedMemoryIds };
  },
};

export const memoriesPipelineService = wrapService(
  'memoriesPipelineService',
  memoriesPipelineServiceRaw,
);
