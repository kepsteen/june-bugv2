import { db } from '@/lib/db/index.js';
import { entries } from './entries.table.js';
import { eq, and, desc, gte, lte, ilike } from 'drizzle-orm';
import { NotFoundError } from '@/lib/errors/index.js';
import { wrapService } from '@/lib/service-wrapper.js';
import { aiService } from '@/lib/ai/ai.service.js';
import type { Entry, NewEntry } from './entries.table.js';

function getMidnightUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

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
    // Check for existing entry due to unique constraint
    const [existing] = await db
      .select().from(entries)
      .where(and(eq(entries.userId, userId), eq(entries.entryDate, date)));
    if (existing) {
      // Entry already exists for this date, return it
      return existing;
    }
    const [created] = await db.insert(entries).values({
      userId,
      entryDate: date,
      content: JSON.stringify({ type: 'doc', content: [] }),
      plainText: '',
    }).returning();
    return created;
  },

  async updateTitle({ id, content }: { id: string , content: string}): Promise<Entry> {
    
    const generatedTitle = await aiService.generateTitle({ content });
    
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
    return updated;
  },

  async delete({ id, userId }: { id: string; userId: string }): Promise<void> {
    const [existing] = await db.select().from(entries).where(and(eq(entries.id, id), eq(entries.userId, userId)));
    if (!existing) throw new NotFoundError('Entry not found');
    await db.delete(entries).where(and(eq(entries.id, id), eq(entries.userId, userId)));
  },

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
