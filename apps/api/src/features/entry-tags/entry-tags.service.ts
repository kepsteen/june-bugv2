import { db } from '@/lib/db/index.js';
import { entryTags } from './entry-tags.table.js';
import { tags } from '../tags/tags.table.js';
import { entries } from '../entries/entries.table.js';
import { eq, and, inArray } from 'drizzle-orm';
import { NotFoundError } from '@/lib/errors/index.js';
import { wrapService } from '@/lib/service-wrapper.js';
import type { Tag } from '../tags/tags.table.js';
import type { Entry } from '../entries/entries.table.js';

const entryTagsServiceRaw = {
  // Get tags for an entry (verify entry ownership, join with tags)
  async getEntryTags({ entryId, userId }: { entryId: string; userId: string }): Promise<Tag[]> {
    // Verify entry ownership
    const [entry] = await db.select().from(entries).where(
      and(eq(entries.id, entryId), eq(entries.userId, userId)),
    );
    if (!entry) throw new NotFoundError('Entry not found');

    const rows = await db
      .select({ tag: tags })
      .from(entryTags)
      .innerJoin(tags, eq(entryTags.tagId, tags.id))
      .where(eq(entryTags.entryId, entryId));

    return rows.map((r) => r.tag);
  },

  // Add a tag to an entry
  async addTagToEntry({ entryId, tagId, userId }: { entryId: string; tagId: string; userId: string }): Promise<void> {
    // Verify entry ownership
    const [entry] = await db.select().from(entries).where(
      and(eq(entries.id, entryId), eq(entries.userId, userId)),
    );
    if (!entry) throw new NotFoundError('Entry not found');

    // Verify tag exists
    const [tag] = await db.select().from(tags).where(eq(tags.id, tagId));
    if (!tag) throw new NotFoundError('Tag not found');

    // Insert (ignore duplicate due to unique constraint)
    await db.insert(entryTags).values({ entryId, tagId }).onConflictDoNothing();
  },

  // Remove a tag from an entry
  async removeTagFromEntry({ entryId, tagId, userId }: { entryId: string; tagId: string; userId: string }): Promise<void> {
    // Verify entry ownership
    const [entry] = await db.select().from(entries).where(
      and(eq(entries.id, entryId), eq(entries.userId, userId)),
    );
    if (!entry) throw new NotFoundError('Entry not found');

    await db.delete(entryTags).where(
      and(eq(entryTags.entryId, entryId), eq(entryTags.tagId, tagId)),
    );
  },

  // Bulk set tags (delete existing, insert new)
  async setEntryTags({ entryId, tagIds, userId }: { entryId: string; tagIds: string[]; userId: string }): Promise<void> {
    // Verify entry ownership
    const [entry] = await db.select().from(entries).where(
      and(eq(entries.id, entryId), eq(entries.userId, userId)),
    );
    if (!entry) throw new NotFoundError('Entry not found');

    // Delete all existing tags for this entry
    await db.delete(entryTags).where(eq(entryTags.entryId, entryId));

    // Insert new tags if any
    if (tagIds.length > 0) {
      await db.insert(entryTags).values(
        tagIds.map((tagId) => ({ entryId, tagId })),
      );
    }
  },

  // Get entries with a specific tag
  async getEntriesWithTag({ tagId, userId }: { tagId: string; userId: string }): Promise<Entry[]> {
    // Verify tag exists
    const [tag] = await db.select().from(tags).where(eq(tags.id, tagId));
    if (!tag) throw new NotFoundError('Tag not found');

    const rows = await db
      .select({ entry: entries })
      .from(entryTags)
      .innerJoin(entries, eq(entryTags.entryId, entries.id))
      .where(
        and(
          eq(entryTags.tagId, tagId),
          eq(entries.userId, userId),
        ),
      );

    return rows.map((r) => r.entry);
  },
};

export const entryTagsService = wrapService('entryTagsService', entryTagsServiceRaw);
