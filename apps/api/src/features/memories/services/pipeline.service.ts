import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db/index.js';
import { entries } from '@/features/entries/entries.table.js';
import { wrapService } from '@/lib/service-wrapper.js';
import { memoryEvents, userMemories, type UserMemory } from '../table.js';
import {
  callCurator,
  CORE_CAP,
  WORKING_CAP,
  type CuratorStoreEntry,
} from '../helpers/pipeline.helpers.js';
import type { Entry } from '@/features/entries/entries.table.js';
import type { MemoryOp } from '@starter/shared';

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

async function loadActiveStore(userId: string): Promise<UserMemory[]> {
  return db
    .select()
    .from(userMemories)
    .where(and(eq(userMemories.userId, userId), eq(userMemories.status, 'active')))
    .limit(CORE_CAP + WORKING_CAP + 8);
}

function validateOps(
  ops: MemoryOp[],
  store: UserMemory[],
): { valid: true } | { valid: false; reason: string } {
  const storeIds = new Set(store.map((m) => m.id));

  for (const op of ops) {
    if (op.op !== 'create' && !storeIds.has(op.id)) {
      return { valid: false, reason: `op '${op.op}' references unknown id ${op.id}` };
    }
  }

  const coreIds = new Set(store.filter((m) => m.tier === 'core').map((m) => m.id));
  const workingIds = new Set(store.filter((m) => m.tier === 'working').map((m) => m.id));

  for (const op of ops) {
    if (op.op === 'create') {
      if (op.tier === 'core') coreIds.add(`_new_${coreIds.size}`);
      else workingIds.add(`_new_${workingIds.size}`);
    } else if (op.op === 'promote') {
      workingIds.delete(op.id);
      coreIds.add(op.id);
    } else if (op.op === 'demote') {
      coreIds.delete(op.id);
      workingIds.add(op.id);
    } else if (op.op === 'delete') {
      coreIds.delete(op.id);
      workingIds.delete(op.id);
    }
  }

  if (coreIds.size > CORE_CAP) {
    return { valid: false, reason: `core tier would reach ${coreIds.size} > cap ${CORE_CAP}` };
  }
  if (workingIds.size > WORKING_CAP) {
    return {
      valid: false,
      reason: `working tier would reach ${workingIds.size} > cap ${WORKING_CAP}`,
    };
  }

  return { valid: true };
}

async function applyOps(ops: MemoryOp[], store: UserMemory[], entry: Entry): Promise<void> {
  const storeById = new Map(store.map((m) => [m.id, m]));
  const now = new Date();

  for (const op of ops) {
    if (op.op === 'create') {
      const [created] = await db
        .insert(userMemories)
        .values({
          userId: entry.userId,
          category: op.category,
          tier: op.tier,
          title: op.fact.slice(0, 120),
          summary: op.fact,
          evidenceEntryId: entry.id,
          importance: clamp(op.importance),
          status: 'active',
          source: 'entry',
          firstSeenAt: now,
          lastSeenAt: now,
        })
        .returning();
      await db.insert(memoryEvents).values({
        memoryId: created.id,
        eventType: 'created',
        payload: { entryId: entry.id, tier: op.tier, reason: op.reason },
      });
    } else if (op.op === 'update') {
      if (!storeById.has(op.id)) continue;
      await db
        .update(userMemories)
        .set({
          ...(op.fact ? { title: op.fact.slice(0, 120), summary: op.fact } : {}),
          ...(op.importance !== undefined ? { importance: clamp(op.importance) } : {}),
          evidenceEntryId: entry.id,
          lastSeenAt: now,
          updatedAt: now,
        })
        .where(eq(userMemories.id, op.id));
      await db.insert(memoryEvents).values({
        memoryId: op.id,
        eventType: 'updated',
        payload: { entryId: entry.id, reason: op.reason },
      });
    } else if (op.op === 'promote') {
      if (!storeById.has(op.id)) continue;
      await db
        .update(userMemories)
        .set({ tier: 'core', updatedAt: now })
        .where(eq(userMemories.id, op.id));
      await db.insert(memoryEvents).values({
        memoryId: op.id,
        eventType: 'updated',
        payload: { entryId: entry.id, tierChange: { from: 'working', to: 'core' }, reason: op.reason },
      });
    } else if (op.op === 'demote') {
      if (!storeById.has(op.id)) continue;
      await db
        .update(userMemories)
        .set({ tier: 'working', updatedAt: now })
        .where(eq(userMemories.id, op.id));
      await db.insert(memoryEvents).values({
        memoryId: op.id,
        eventType: 'updated',
        payload: { entryId: entry.id, tierChange: { from: 'core', to: 'working' }, reason: op.reason },
      });
    } else if (op.op === 'delete') {
      if (!storeById.has(op.id)) continue;
      await db.insert(memoryEvents).values({
        memoryId: op.id,
        eventType: 'archived',
        payload: { entryId: entry.id, reason: op.reason },
      });
      await db
        .update(userMemories)
        .set({ status: 'archived', archivedAt: now, updatedAt: now })
        .where(eq(userMemories.id, op.id));
    }
  }
}

async function runCuration(entry: Entry): Promise<void> {
  const plainText = (entry.plainText ?? '').trim();

  if (!plainText) {
    await db
      .update(entries)
      .set({ memoryCuratedAt: new Date() })
      .where(eq(entries.id, entry.id));
    return;
  }

  const store = await loadActiveStore(entry.userId);
  const storeInput: CuratorStoreEntry[] = store.map((m) => ({
    id: m.id,
    tier: m.tier,
    category: m.category,
    summary: m.summary,
    importance: m.importance,
  }));

  let ops = await callCurator({
    store: storeInput,
    entryText: plainText,
    userId: entry.userId,
    entryId: entry.id,
  });

  const validation = validateOps(ops, store);
  if (!validation.valid) {
    ops = await callCurator({
      store: storeInput,
      entryText: plainText,
      userId: entry.userId,
      entryId: entry.id,
      extraInstruction: `CONSTRAINT VIOLATION: ${validation.reason}. You MUST emit delete/demote ops to stay within caps before adding new memories.`,
    });
    const revalidation = validateOps(ops, store);
    if (!revalidation.valid) {
      console.warn(`[memory-curator] Discarding ops after two violations: ${revalidation.reason}`);
      ops = [];
    }
  }

  await applyOps(ops, store, entry);
  await db
    .update(entries)
    .set({ memoryCuratedAt: new Date() })
    .where(eq(entries.id, entry.id));
}

const memoriesCuratorServiceRaw = {
  async curateEntry(entry: Entry): Promise<void> {
    try {
      await runCuration(entry);
    } catch (error) {
      console.error('[memory-curator] Curation failed, entry stays due:', error);
    }
  },

  async consolidateMemories({ userId }: { userId: string }): Promise<void> {
    const dueEntries = await db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          or(isNull(entries.memoryCuratedAt), sql`${entries.memoryCuratedAt} < ${entries.updatedAt}`),
        ),
      )
      .orderBy(entries.entryDate);

    for (const entry of dueEntries) {
      const [claimed] = await db
        .update(entries)
        .set({ memoryCuratedAt: new Date() })
        .where(
          and(
            eq(entries.id, entry.id),
            or(
              isNull(entries.memoryCuratedAt),
              sql`${entries.memoryCuratedAt} < ${entries.updatedAt}`,
            ),
          ),
        )
        .returning({ id: entries.id });

      if (!claimed) continue;

      try {
        await runCuration(entry);
      } catch (error) {
        console.error(`[memory-curator] Failed entry ${entry.id}, resetting to due:`, error);
        await db
          .update(entries)
          .set({ memoryCuratedAt: null })
          .where(eq(entries.id, entry.id));
      }
    }
  },
};

export const memoriesCuratorService = wrapService(
  'memoriesCuratorService',
  memoriesCuratorServiceRaw,
);
