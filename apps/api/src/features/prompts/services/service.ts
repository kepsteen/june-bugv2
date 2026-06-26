import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/index.js';
import { wrapService } from '@/lib/service-wrapper.js';
import { NotFoundError } from '@/lib/errors/index.js';
import { entries } from '@/features/entries/entries.table.js';
import { memoriesService, memoriesCuratorService } from '@/features/memories/index.js';
import { entryPrompts } from '../table.js';
import type { MemoryCategory } from '@starter/shared';
import {
  buildInsertValues,
  mapRowsToStoredPromptsResult,
  type StoredPersonalizedPromptsResult,
} from '../helpers/prompts.helpers.js';

function buildFocusCategoryCondition(focusCategory?: MemoryCategory) {
  return focusCategory
    ? eq(entryPrompts.focusCategory, focusCategory)
    : isNull(entryPrompts.focusCategory);
}

async function findEntryForUser({ entryId, userId }: { entryId: string; userId: string }) {
  const [entry] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.id, entryId), eq(entries.userId, userId)))
    .limit(1);

  if (!entry) throw new NotFoundError('Entry not found');
  return entry;
}

async function listStoredPrompts({
  userId,
  entryId,
  focusCategory,
}: {
  userId: string;
  entryId: string;
  focusCategory?: MemoryCategory;
}) {
  return db
    .select()
    .from(entryPrompts)
    .where(
      and(
        eq(entryPrompts.userId, userId),
        eq(entryPrompts.entryId, entryId),
        buildFocusCategoryCondition(focusCategory),
      ),
    )
    .orderBy(asc(entryPrompts.sortOrder));
}

const promptsServiceRaw = {
  async getOrCreateForEntry({
    userId,
    entryId,
    focusCategory,
    entryDraft,
  }: {
    userId: string;
    entryId: string;
    focusCategory?: MemoryCategory;
    entryDraft?: string;
  }): Promise<StoredPersonalizedPromptsResult> {
    const entry = await findEntryForUser({ entryId, userId });
    const existing = await listStoredPrompts({ userId, entryId, focusCategory });
    if (existing.length > 0) return mapRowsToStoredPromptsResult(existing);

    try {
      await memoriesCuratorService.consolidateMemories({ userId });
    } catch (err) {
      console.error('[promptsService] Memory consolidation failed, using current store:', err);
    }

    const generated = await memoriesService.generatePersonalizedPrompts({
      userId,
      focusCategory,
      entryDraft: entryDraft?.trim() ? entryDraft : (entry.plainText?.trim() || undefined),
      entryId,
    });

    const insertValues = buildInsertValues({
      generated,
      userId,
      entryId,
      focusCategory,
    });

    if (insertValues.length > 0) {
      await db
        .insert(entryPrompts)
        .values(insertValues)
        .onConflictDoNothing({
          target: [
            entryPrompts.entryId,
            entryPrompts.focusCategory,
            entryPrompts.sortOrder,
          ],
        });
    }

    const stored = await listStoredPrompts({ userId, entryId, focusCategory });
    return mapRowsToStoredPromptsResult(stored);
  },

  async regenerateForEntry({
    userId,
    entryId,
    focusCategory,
    entryDraft,
  }: {
    userId: string;
    entryId: string;
    focusCategory?: MemoryCategory;
    entryDraft?: string;
  }): Promise<StoredPersonalizedPromptsResult> {
    const entry = await findEntryForUser({ entryId, userId });

    try {
      await memoriesCuratorService.consolidateMemories({ userId });
    } catch (err) {
      console.error('[promptsService] Memory consolidation failed during regenerate, using current store:', err);
    }

    const generated = await memoriesService.generatePersonalizedPrompts({
      userId,
      focusCategory,
      entryDraft: entryDraft?.trim() ? entryDraft : (entry.plainText?.trim() || undefined),
    });

    await db
      .delete(entryPrompts)
      .where(
        and(
          eq(entryPrompts.userId, userId),
          eq(entryPrompts.entryId, entryId),
          buildFocusCategoryCondition(focusCategory),
        ),
      );

    const insertValues = buildInsertValues({
      generated,
      userId,
      entryId,
      focusCategory,
    });

    if (insertValues.length > 0) {
      await db.insert(entryPrompts).values(insertValues);
    }

    const stored = await listStoredPrompts({ userId, entryId, focusCategory });
    return mapRowsToStoredPromptsResult(stored);
  },
};

export const promptsService = wrapService('promptsService', promptsServiceRaw);
