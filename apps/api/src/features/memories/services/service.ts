import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/index.js';
import { NotFoundError } from '@/lib/errors/index.js';
import { wrapService } from '@/lib/service-wrapper.js';
import { memoryCategoryEnum, memoryStatusEnum, userMemories } from '../table.js';
import { entries } from '@/features/entries/entries.table.js';
import { memoriesCuratorService } from './pipeline.service.js';
import { aiGateway } from '@/lib/ai/ai.gateway.js';
import type { MemoryCategory, MemoryForPrompt, PersonalizedPromptSuggestion } from '@starter/shared';
import type { UserMemory } from '../table.js';
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
  const activeMemories = memories.filter((m) => m.status !== 'archived');

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
    .map(
      (m) =>
        `- [${m.tier.toUpperCase()}][${m.category}] ${m.title} | ${m.summary} | importance=${m.importance.toFixed(2)}`,
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
    'Memory context (CORE = protected long-term; WORKING = recent context):',
    memoryContext,
  ].join('\n');

  const { data } = await aiGateway.generateObject({
    model: 'openai/gpt-4o-mini',
    prompt,
    schema: z.object({ prompts: z.array(personalizedPromptSchema).min(3).max(5) }),
    userId,
    feature: 'personalized_prompts',
    requestContext: { entryId, focusCategory, memoryCount: activeMemories.length },
  });

  const unique = new Map<string, PersonalizedPromptSuggestion>();
  for (const suggestion of data.prompts ?? []) unique.set(suggestion.prompt, suggestion);
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
    const conditions = [eq(userMemories.userId, userId)];
    if (category) conditions.push(eq(userMemories.category, category));
    if (status) conditions.push(eq(userMemories.status, status));

    return db
      .select()
      .from(userMemories)
      .where(and(...conditions))
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
    request: { userId: string; reason: string; entryId?: string };
  }> {
    const [latestEntry] = await db
      .select()
      .from(entries)
      .where(eq(entries.userId, userId))
      .orderBy(desc(entries.updatedAt))
      .limit(1);

    if (latestEntry) {
      void memoriesCuratorService.curateEntry(latestEntry).catch((err) => {
        console.error('[memoriesService] enqueueRefresh curation error:', err);
      });
    }

    return {
      accepted: true,
      message: latestEntry
        ? 'Memory curation triggered for your latest entry.'
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

    if (!existing) throw new NotFoundError('Memory not found');

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
    const conditions = [eq(userMemories.userId, userId)];
    if (category) conditions.push(eq(userMemories.category, category));
    if (status) conditions.push(eq(userMemories.status, status));

    await db.delete(userMemories).where(and(...conditions));
  },

  async generatePersonalizedPrompts({
    userId,
    focusCategory,
    entryDraft,
    entryId,
  }: {
    userId: string;
    focusCategory?: MemoryCategory;
    entryDraft?: string;
    entryId?: string;
  }): Promise<{ prompts: PersonalizedPromptSuggestion[]; memoryCount: number }> {
    const store = await db
      .select()
      .from(userMemories)
      .where(
        and(
          eq(userMemories.userId, userId),
          inArray(userMemories.status, ['active', 'stale']),
        ),
      )
      .orderBy(desc(userMemories.importance))
      .limit(32);

    const prompts = await generatePersonalizedPromptSuggestions({
      memories: store.map((m) => ({
        category: m.category,
        tier: m.tier,
        title: m.title,
        summary: m.summary,
        importance: m.importance,
        confidence: m.confidence,
        status: m.status,
        projectName: m.projectName,
        milestoneState: m.milestoneState,
      })),
      focusCategory,
      entryDraft,
      maxPrompts: 5,
      userId,
      entryId,
    });

    return { prompts, memoryCount: store.length };
  },
};

export const memoriesService = wrapService('memoriesService', memoriesServiceRaw);
