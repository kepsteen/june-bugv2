import type { MemoryCategory, MemoryOp, MemoryTier } from '@starter/shared';
import z from 'zod';
import { aiGateway } from '@/lib/ai/ai.gateway.js';

export const CORE_CAP = 8;
export const WORKING_CAP = 24;

export type CuratorStoreEntry = {
  id: string;
  tier: MemoryTier;
  category: MemoryCategory;
  summary: string;
  importance: number;
};

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

const memoryTierSchema = z.enum(['core', 'working']);

// OpenAI structured output requires:
//   1. No oneOf/anyOf (discriminatedUnion) — use separate arrays per op type instead.
//   2. All properties must be in `required` — no .optional(). Use .nullable() for absent fields.
const curatorResponseSchema = z.object({
  creates: z.array(z.object({
    tier: memoryTierSchema,
    category: memoryCategorySchema,
    fact: z.string().min(1).max(280),
    importance: z.number().min(0).max(1),
    reason: z.string().min(1).max(200),
  })),
  updates: z.array(z.object({
    id: z.string(),
    fact: z.string().min(1).max(280).nullable(),
    importance: z.number().min(0).max(1).nullable(),
    reason: z.string().min(1).max(200),
  })),
  promotes: z.array(z.object({
    id: z.string(),
    reason: z.string().min(1).max(200),
  })),
  demotes: z.array(z.object({
    id: z.string(),
    reason: z.string().min(1).max(200),
  })),
  deletes: z.array(z.object({
    id: z.string(),
    reason: z.string().min(1).max(200),
  })),
});

function flattenCuratorResponse(data: z.infer<typeof curatorResponseSchema>): MemoryOp[] {
  const ops: MemoryOp[] = [];
  for (const c of data.creates) ops.push({ op: 'create', ...c });
  for (const u of data.updates) {
    ops.push({
      op: 'update',
      id: u.id,
      reason: u.reason,
      ...(u.fact != null ? { fact: u.fact } : {}),
      ...(u.importance != null ? { importance: u.importance } : {}),
    });
  }
  for (const p of data.promotes) ops.push({ op: 'promote', ...p });
  for (const d of data.demotes) ops.push({ op: 'demote', ...d });
  for (const d of data.deletes) ops.push({ op: 'delete', ...d });
  return ops;
}

function buildPrompt(
  store: CuratorStoreEntry[],
  entryText: string,
  extraInstruction?: string,
): string {
  const coreMemories = store.filter((m) => m.tier === 'core');
  const workingMemories = store.filter((m) => m.tier === 'working');

  const storeLines = [
    `CORE (${coreMemories.length}/${CORE_CAP} — protected, long-term goals/identity/preferences):`,
    ...coreMemories.map(
      (m) => `  [${m.id}] [${m.category}] importance=${m.importance.toFixed(2)} — ${m.summary}`,
    ),
    '',
    `WORKING (${workingMemories.length}/${WORKING_CAP} — recent, evictable context):`,
    ...workingMemories.map(
      (m) => `  [${m.id}] [${m.category}] importance=${m.importance.toFixed(2)} — ${m.summary}`,
    ),
  ].join('\n');

  return [
    'You are a curator of a developer memory store for a journaling app.',
    `Caps: core=${CORE_CAP}, working=${WORKING_CAP}. Current: core=${coreMemories.length}, working=${workingMemories.length}.`,
    '',
    'RULES:',
    '- Keep only STANDING, DURABLE facts: long-term goals, active projects, core preferences, recurring patterns.',
    '- REJECT: transient states ("stuck on CSS today"), trivial tooling ("uses VS Code"), one-off events.',
    '- Core = immune to eviction. Promote sparingly: only long-term goals/identity/core preferences.',
    '- Working = freely evictable. Demote or delete to make room before adding.',
    '- If adding would breach a cap, emit delete/demote ops in the SAME response to keep within cap.',
    '- Prefer update/supersession over delete+create for evolved facts.',
    '- Emit only the minimum ops needed. No ops = valid if entry adds nothing durable.',
    '',
    'CURRENT STORE:',
    store.length > 0 ? storeLines : '(empty)',
    '',
    'JOURNAL ENTRY:',
    entryText.slice(0, 3000),
    '',
    ...(extraInstruction ? [extraInstruction, ''] : []),
    'Return JSON with ALL five arrays present (use [] for unused ones):',
    '{ "creates": [...], "updates": [...], "promotes": [...], "demotes": [...], "deletes": [...] }',
    'creates item: { tier, category, fact(≤280), importance(0-1), reason }',
    'updates item: { id, fact(string or null), importance(number or null), reason }',
    'promotes | demotes | deletes item: { id, reason }',
    'IDs must be exact UUIDs from the store above.',
  ].join('\n');
}

export async function callCurator({
  store,
  entryText,
  userId,
  entryId,
  extraInstruction,
}: {
  store: CuratorStoreEntry[];
  entryText: string;
  userId: string;
  entryId?: string;
  extraInstruction?: string;
}): Promise<MemoryOp[]> {
  if (!entryText.trim() && store.length === 0) return [];

  const { data } = await aiGateway.generateObject({
    model: 'openai/gpt-4o-mini',
    prompt: buildPrompt(store, entryText, extraInstruction),
    schema: curatorResponseSchema,
    userId,
    feature: 'memory_curation',
    requestContext: { entryId, storeSize: store.length },
  });

  return flattenCuratorResponse(data);
}
