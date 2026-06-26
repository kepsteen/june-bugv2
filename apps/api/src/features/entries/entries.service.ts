import { db } from '@/lib/db/index.js';
import { entries } from './entries.table.js';
import { eq, and, desc, gte, lte, ilike } from 'drizzle-orm';
import { AppError, NotFoundError } from '@/lib/errors/index.js';
import { wrapService } from '@/lib/service-wrapper.js';
import { aiGateway } from '@/lib/ai/ai.gateway.js';
import { memoriesPipelineService } from '@/features/memories/index.js';
import z from 'zod';
import type { Entry } from './entries.table.js';

function getMidnightUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function generateEntryTitle({
  content,
  userId,
  entryId,
}: {
  content: string;
  userId: string;
  entryId?: string;
}): Promise<string> {
  if (!content?.trim()) {
    throw new AppError('Content is required for title generation', 400);
  }

  const model = 'openai/gpt-4o-mini';
  const { data } = await aiGateway.generateObject({
    model,
    prompt: `Generate a concise title (max 50 chars, do not use quotes) for this journal entry:\n\n${content}`,
    schema: z.object({
      title: z
        .string()
        .max(50)
        .refine((val) => !val.includes('"') && !val.includes("'"), {
          message: 'Title must not contain quotes',
        }),
    }),
    userId,
    feature: 'entry_title',
    requestContext: entryId ? { entryId } : undefined,
  });

  return data.title;
}


/*
  TODO: Consider creating a helper method to check if the userId owns the entry ID.
  function findUserEntry{
    query to get entry by ID and userId
    if no entry, throw error
    return entry;
  }
*/

const entriesServiceRaw = {
  async list({ userId }: { userId: string }): Promise<Entry[]> {
    return db.select().from(entries).where(eq(entries.userId, userId)).orderBy(desc(entries.entryDate));
  },

  async findById({ id, userId }: { id: string; userId: string }): Promise<Entry> {
    const [entry] = await db.select().from(entries).where(and(eq(entries.id, id), eq(entries.userId, userId)));
    if (!entry) throw new NotFoundError('Entry not found');
    return entry;
  },

  async createOrGetByDate({ userId, entryDate }: { userId: string; entryDate?: Date }): Promise<Entry> {
    const date = getMidnightUTC(entryDate ?? new Date());
    const [existing] = await db
      .select().from(entries)
      .where(and(eq(entries.userId, userId), eq(entries.entryDate, date)));
    if (existing) {
      return existing;
    }
    const [created] = await db.insert(entries).values({
      userId,
      entryDate: date,
      content: '',
      plainText: '',
    }).returning();

    void memoriesPipelineService.publishEntryChangedJob({
      userId,
      entryId: created.id,
      entryUpdatedAt: created.updatedAt.toISOString(),
    }).catch((error) => {
      console.error('[entriesService] Failed to publish memory job for create:', error);
    });

    return created;
  },

  //TODO: We need to check if the userId owns the entryID. Bad actor can pass any entry ID and update the title.
  async updateTitle({ id, userId, content }: { id: string; userId: string; content: string }): Promise<Entry> {
    const generatedTitle = await generateEntryTitle({ content, userId, entryId: id });

    const [updated] = await db
      .update(entries)
      .set({ Title: generatedTitle, updatedAt: new Date() })
      .where(eq(entries.id, id))
      .returning();
    return updated;
  },

  async update({ id, userId, data }: { id: string; userId: string; data: Partial<Entry> }): Promise<Entry> {
    const [existing] = await db.select().from(entries).where(and(eq(entries.id, id), eq(entries.userId, userId)));
    if (!existing) throw new NotFoundError('Entry not found');
    const [updated] = await db
      .update(entries)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(entries.id, id), eq(entries.userId, userId)))
      .returning();

    void memoriesPipelineService.publishEntryChangedJob({
      userId,
      entryId: updated.id,
      entryUpdatedAt: updated.updatedAt.toISOString(),
    }).catch((error) => {
      console.error('[entriesService] Failed to publish memory job for update:', error);
    });

    return updated;
  },

  async delete({ id, userId }: { id: string; userId: string }): Promise<void> {
    const [existing] = await db.select().from(entries).where(and(eq(entries.id, id), eq(entries.userId, userId)));
    if (!existing) throw new NotFoundError('Entry not found');
    await db.delete(entries).where(and(eq(entries.id, id), eq(entries.userId, userId)));
  },

  //TODO: I would recommend adding pagination for search queries.
  // TIDI: wild card LIKE queries do not scale well. Fine for now, but this should be optimized later.
  async search({ userId, q }: { userId: string; q: string }): Promise<Entry[]> {
    if (!q.trim()) return entriesServiceRaw.list({ userId });
    return db.select().from(entries)
      .where(and(eq(entries.userId, userId), ilike(entries.plainText, `%${q}%`)))
      .orderBy(desc(entries.entryDate));
  },

  async getByRange({ userId, start, end }: { userId: string; start: Date; end: Date }): Promise<Entry[]> {
    return db.select().from(entries)
      .where(and(eq(entries.userId, userId), gte(entries.entryDate, start), lte(entries.entryDate, end)))
      .orderBy(desc(entries.entryDate));
  },
};

export const entriesService = wrapService('entriesService', entriesServiceRaw);
