import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/index.js';
import { aiService } from '@/lib/ai/ai.service.js';
import {
  memoryEmbeddings,
  userMemories,
} from '@/features/memories/memories.table.js';
import { MEMORY_EMBEDDING_FALLBACK_MODEL } from '@/lib/ai/ai.service.js';

/**
 * Re-embed memories that still use placeholder deterministic-hash-v1 vectors.
 *
 * Usage:
 *   pnpm run script:backfill-memory-embeddings -- --run true
 *   pnpm run script:backfill-memory-embeddings -- --user-id <app_user_id> --run true
 *   pnpm run script:backfill-memory-embeddings -- --limit 50 --run true
 *
 * Optional:
 *   --user-id <app_user_id>   Limit to one app user
 *   --limit <number>          Max rows to process (default: all)
 *   --run <true|false>        Execute writes (default: false)
 */
type ArgMap = Record<string, string | boolean>;

function parseArgs(argv: string[]): ArgMap {
  const args: ArgMap = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;

    const [rawKey, inlineValue] = token.slice(2).split('=');
    const key = rawKey.trim();
    if (!key) continue;

    if (inlineValue !== undefined) {
      args[key] = inlineValue;
      continue;
    }

    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
      continue;
    }

    args[key] = true;
  }

  return args;
}

function parseBoolean(value: string | boolean | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  return value.toLowerCase() === 'true';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const run = parseBoolean(args.run, false);
  const userId = typeof args['user-id'] === 'string' ? args['user-id'] : undefined;
  const limit =
    typeof args.limit === 'string' && Number.isFinite(Number(args.limit))
      ? Number(args.limit)
      : undefined;

  const rows = await db
    .select({
      memoryId: memoryEmbeddings.memoryId,
      embeddingModel: memoryEmbeddings.embeddingModel,
      userId: userMemories.userId,
      title: userMemories.title,
      summary: userMemories.summary,
    })
    .from(memoryEmbeddings)
    .innerJoin(userMemories, eq(memoryEmbeddings.memoryId, userMemories.id))
    .where(eq(memoryEmbeddings.embeddingModel, MEMORY_EMBEDDING_FALLBACK_MODEL));

  const filtered = rows.filter((row) => (userId ? row.userId === userId : true));
  const targetRows = limit ? filtered.slice(0, limit) : filtered;

  console.log(
    `Found ${filtered.length} fallback embeddings` +
      (userId ? ` for user ${userId}` : '') +
      (limit ? `; processing first ${targetRows.length}` : `; processing ${targetRows.length}`),
  );

  if (!run) {
    console.log('Dry run only. Re-run with --run true to update embeddings.');
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const row of targetRows) {
    const text = `${row.title}\n${row.summary}`.trim();
    if (!text) {
      skipped += 1;
      continue;
    }

    const { embedding, embeddingModel } = await aiService.embedText({
      text,
      userId: row.userId,
      memoryId: row.memoryId,
    });

    if (embeddingModel === MEMORY_EMBEDDING_FALLBACK_MODEL) {
      console.warn(
        `[skip] memory ${row.memoryId}: still using fallback model (AI gateway unavailable or failed)`,
      );
      skipped += 1;
      continue;
    }

    await db
      .update(memoryEmbeddings)
      .set({
        embedding,
        embeddingModel,
        updatedAt: new Date(),
      })
      .where(eq(memoryEmbeddings.memoryId, row.memoryId));

    updated += 1;
    console.log(`[updated] memory ${row.memoryId} -> ${embeddingModel}`);
  }

  console.log(`Done. Updated ${updated}, skipped ${skipped}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
