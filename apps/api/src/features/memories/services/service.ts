import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/index.js';
import { NotFoundError } from '@/lib/errors/index.js';
import { wrapService } from '@/lib/service-wrapper.js';
import {
  memoryCategoryEnum,
  memoryEmbeddings,
  memoryStatusEnum,
  userMemories,
} from '../table.js';
import { entries } from '@/features/entries/entries.table.js';
import { memoriesPipelineService } from './pipeline.service.js';
import { embedMemoryText } from '../helpers/embedding.helpers.js';
import { aiGateway } from '@/lib/ai/ai.gateway.js';
import type {
  MemoryCategory,
  MemoryForPrompt,
  PersonalizedPromptSuggestion,
} from '@starter/shared';
import type { UserMemory } from '../table.js';
import {
  cosineSimilarity,
  scoreMemoryForRetrieval,
} from '../helpers/retrieval.helpers.js';
import z from 'zod';

type MemoryCategoryEnum = (typeof memoryCategoryEnum.enumValues)[number];
type MemoryStatusEnum = (typeof memoryStatusEnum.enumValues)[number];

const memoryCategorySchema = z.enum([
  'goal',
  'project',
  'milestone',
  'blocker',
  'win',
  'learning',
  'skill_growth',
  'preference',
  'habit',
  'relationship',
  'value',
  'other',
]);

const personalizedPromptSchema = z.object({
  prompt: z.string().min(1).max(220),
  rationale: z.string().min(1).max(180),
  anchor: z
    .object({
      category: memoryCategorySchema,
      memoryTitle: z.string().min(1).max(120),
    })
    .nullable(),
});

async function generatePersonalizedPromptSuggestions({
  memories,
  focusCategory,
  entryDraft,
  maxPrompts = 5,
  userId,
  entryId,
}: {
  memories: MemoryForPrompt[];
  focusCategory?: MemoryCategory;
  entryDraft?: string;
  maxPrompts?: number;
  userId: string;
  entryId?: string;
}): Promise<PersonalizedPromptSuggestion[]> {
  const safeMax = Math.max(3, Math.min(maxPrompts, 5));
  const activeMemories = memories.filter((memory) => memory.status !== 'archived');
  const model = 'openai/gpt-4o-mini';
  const requestContext = { entryId, focusCategory, memoryCount: activeMemories.length };

  if (activeMemories.length === 0) {
    return [
      {
        prompt: 'What meaningful progress did I make today, and what is the next step?',
        rationale: 'Fallback prompt when no active memory exists yet.',
        anchor: null,
      },
    ];
  }

  const memoryContext = activeMemories
    .slice(0, 30)
    .map(
      (memory) =>
        `- [${memory.category}] ${memory.title} | ${memory.summary} | importance=${memory.importance.toFixed(2)} confidence=${memory.confidence.toFixed(2)} status=${memory.status}`,
    )
    .join('\n');

  const prompt = [
    'You generate personalized developer journaling prompts.',
    'Return JSON only with this shape: { "prompts": [...] }.',
    'Each prompt item must include: prompt, rationale, anchor.',
    'Anchor must be either an object { category, memoryTitle } or null.',
    'Generate 3-5 prompts focused on measurable progress and outcomes.',
    'At least one prompt should anchor to an active goal or project when available.',
    focusCategory ? `Prioritize focus category: ${focusCategory}.` : 'No forced category.',
    entryDraft?.trim() ? `Entry draft context:\n${entryDraft}` : 'No draft context provided.',
    '',
    'Memory context:',
    memoryContext,
  ].join('\n');

  const { data } = await aiGateway.generateObject({
    model,
    prompt,
    schema: z.object({
      prompts: z.array(personalizedPromptSchema).min(3).max(5),
    }),
    userId,
    feature: 'personalized_prompts',
    requestContext,
  });

  const prompts = data.prompts ?? [];
  const unique = new Map<string, PersonalizedPromptSuggestion>();
  for (const suggestion of prompts) unique.set(suggestion.prompt, suggestion);
  return [...unique.values()].slice(0, safeMax);
}

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
    prompts: PersonalizedPromptSuggestion[];
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
    const { embedding: queryVector } = await embedMemoryText({
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
    const prompts = await generatePersonalizedPromptSuggestions({
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
