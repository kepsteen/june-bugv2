import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/index.js';
import { NotFoundError } from '@/lib/errors/index.js';
import { wrapService } from '@/lib/service-wrapper.js';
import {
  memoryCategoryEnum,
  memoryEmbeddings,
  memoryStatusEnum,
  userMemories,
} from './memories.table.js';
import { entries } from '@/features/entries/entries.table.js';
import { memoriesPipelineService } from './memory-pipeline.service.js';
import { aiService, type MemoryCategory } from '@/lib/ai/ai.service.js';
import type { UserMemory } from './memories.table.js';
import {
  cosineSimilarity,
  scoreMemoryForRetrieval,
} from './memory-retrieval.helpers.js';

type MemoryCategoryEnum = (typeof memoryCategoryEnum.enumValues)[number];
type MemoryStatusEnum = (typeof memoryStatusEnum.enumValues)[number];

const memoriesServiceRaw = {
  async list({
    userId,
    category,
    status,
  }: {
    userId: string;
    category?: MemoryCategoryEnum;
    status?: MemoryStatusEnum;
  }): Promise<UserMemory[]> {
    const whereConditions = [eq(userMemories.userId, userId)];
    if (category) whereConditions.push(eq(userMemories.category, category));
    if (status) whereConditions.push(eq(userMemories.status, status));

    return db
      .select()
      .from(userMemories)
      .where(and(...whereConditions))
      .orderBy(desc(userMemories.importance), desc(userMemories.lastSeenAt));
  },

  async enqueueRefresh({
    userId,
    reason,
  }: {
    userId: string;
    reason: 'manual' | 'backfill' | 'debug';
  }): Promise<{
    accepted: true;
    message: string;
    request: { userId: string; reason: 'manual' | 'backfill' | 'debug'; entryId?: string };
  }> {
    const [latestEntry] = await db
      .select()
      .from(entries)
      .where(eq(entries.userId, userId))
      .orderBy(desc(entries.updatedAt))
      .limit(1);

    if (latestEntry) {
      await memoriesPipelineService.publishEntryChangedJob({
        userId,
        entryId: latestEntry.id,
        entryUpdatedAt: latestEntry.updatedAt.toISOString(),
      });
    }

    return {
      accepted: true,
      message: latestEntry
        ? 'Latest entry has been enqueued for memory refresh.'
        : 'No entries available to refresh memories yet.',
      request: { userId, reason, entryId: latestEntry?.id },
    };
  },

  async delete({ id, userId }: { id: string; userId: string }): Promise<void> {
    const [existing] = await db
      .select({ id: userMemories.id })
      .from(userMemories)
      .where(and(eq(userMemories.id, id), eq(userMemories.userId, userId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Memory not found');
    }

    await db
      .delete(userMemories)
      .where(and(eq(userMemories.id, id), eq(userMemories.userId, userId)));
  },

  async deleteMany({
    userId,
    category,
    status,
  }: {
    userId: string;
    category?: MemoryCategoryEnum;
    status?: MemoryStatusEnum;
  }): Promise<void> {
    const whereConditions = [eq(userMemories.userId, userId)];
    if (category) whereConditions.push(eq(userMemories.category, category));
    if (status) whereConditions.push(eq(userMemories.status, status));

    await db.delete(userMemories).where(and(...whereConditions));
  },

  async generatePersonalizedPrompts({
    userId,
    focusCategory,
    entryDraft,
  }: {
    userId: string;
    focusCategory?: MemoryCategory;
    entryDraft?: string;
  }): Promise<{
    prompts: Awaited<ReturnType<typeof aiService.generatePersonalizedPrompts>>;
    retrieval: {
      structuredCount: number;
      semanticCount: number;
      consideredCount: number;
    };
  }> {
    const memories = await db
      .select()
      .from(userMemories)
      .where(
        and(
          eq(userMemories.userId, userId),
          inArray(userMemories.status, ['active', 'stale']),
        ),
      )
      .orderBy(desc(userMemories.lastSeenAt))
      .limit(250);

    const structuredRanked = memories
      .map((memory) => {
        return {
          memory,
          score: scoreMemoryForRetrieval({ memory, focusCategory }),
        };
      })
      .sort((a, b) => b.score - a.score);

    const topStructured = structuredRanked.slice(0, 12).map((item) => item.memory);

    const semanticQuery = (entryDraft?.trim() || focusCategory || 'developer progress and goals').trim();
    const { embedding: queryVector } = await aiService.embedText({
      text: semanticQuery,
      userId,
    });
    const embeddingRows = await db
      .select({
        memory: userMemories,
        embedding: memoryEmbeddings.embedding,
      })
      .from(memoryEmbeddings)
      .innerJoin(userMemories, eq(memoryEmbeddings.memoryId, userMemories.id))
      .where(
        and(
          eq(userMemories.userId, userId),
          inArray(userMemories.status, ['active', 'stale']),
        ),
      )
      .limit(250);

    const topSemantic = embeddingRows
      .map((row) => ({
        memory: row.memory,
        similarity: cosineSimilarity(row.embedding, queryVector),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 8)
      .map((item) => item.memory);

    const retrievalPool = new Map<string, UserMemory>();
    for (const memory of topStructured) retrievalPool.set(memory.id, memory);
    for (const memory of topSemantic) retrievalPool.set(memory.id, memory);

    const candidateMemories = [...retrievalPool.values()];
    const prompts = await aiService.generatePersonalizedPrompts({
      memories: candidateMemories.map((memory) => ({
        category: memory.category,
        title: memory.title,
        summary: memory.summary,
        importance: memory.importance,
        confidence: memory.confidence,
        status: memory.status,
        projectName: memory.projectName,
        milestoneState: memory.milestoneState,
      })),
      focusCategory,
      entryDraft,
      maxPrompts: 5,
      userId,
    });

    return {
      prompts,
      retrieval: {
        structuredCount: topStructured.length,
        semanticCount: topSemantic.length,
        consideredCount: candidateMemories.length,
      },
    };
  },
};

export const memoriesService = wrapService('memoriesService', memoriesServiceRaw);
