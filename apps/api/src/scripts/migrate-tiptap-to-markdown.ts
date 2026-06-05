import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/index.js';
import { entries } from '@/features/entries/entries.table.js';
import {
  isTiptapJson,
  markdownToPlainText,
  tiptapToMarkdown,
} from '@/lib/tiptap-to-markdown.js';

/**
 * Convert legacy Tiptap JSON entry content to Markdown.
 *
 * Usage:
 *   pnpm run script:migrate-tiptap-to-markdown -- --run true
 *   pnpm run script:migrate-tiptap-to-markdown -- --user-id <app_user_id> --run true
 *   pnpm run script:migrate-tiptap-to-markdown -- --limit 50 --run true
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

function parseBoolean(value: string | boolean | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  return value.toLowerCase() === 'true';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const run = parseBoolean(args.run, false);
  const userId = typeof args['user-id'] === 'string' ? args['user-id'] : undefined;
  const limit = typeof args.limit === 'string' ? Number.parseInt(args.limit, 10) : undefined;

  const rows = userId
    ? await db.select().from(entries).where(eq(entries.userId, userId))
    : await db.select().from(entries);

  const candidates = rows.filter((row) => isTiptapJson(row.content));
  const toProcess = limit ? candidates.slice(0, limit) : candidates;

  console.log(`Found ${candidates.length} Tiptap entries (${toProcess.length} selected).`);
  console.log(`Mode: ${run ? 'WRITE' : 'DRY RUN'}`);

  let converted = 0;
  let skipped = 0;

  for (const entry of toProcess) {
    const markdown = tiptapToMarkdown(entry.content);
    const plainText = markdownToPlainText(markdown);

    if (!markdown && !plainText) {
      skipped += 1;
      continue;
    }

    converted += 1;
    console.log(`- ${entry.id}: ${entry.content.slice(0, 40)}... -> ${markdown.slice(0, 40)}...`);

    if (run) {
      await db
        .update(entries)
        .set({
          content: markdown,
          plainText,
          updatedAt: new Date(),
        })
        .where(eq(entries.id, entry.id));
    }
  }

  console.log(`Done. Converted: ${converted}, skipped: ${skipped}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
