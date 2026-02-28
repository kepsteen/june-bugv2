import { db } from '@/lib/db/index.js';
import { entries } from './entries.table.js';
import { eq, and, desc, gte, lte, ilike } from 'drizzle-orm';
import { NotFoundError, ForbiddenError } from '@/lib/errors/index.js';
import type { Entry, NewEntry } from './entries.table.js';

function getMidnightUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export const entriesService = {
  async list(userId: string, includeInactive = false): Promise<Entry[]> {
    const conditions = includeInactive
      ? [eq(entries.userId, userId)]
      : [eq(entries.userId, userId), eq(entries.isActive, true)];
    return db.select().from(entries).where(and(...conditions)).orderBy(desc(entries.entryDate));
  },

  async findById(id: string, userId: string): Promise<Entry> {
    const [entry] = await db.select().from(entries).where(and(eq(entries.id, id), eq(entries.userId, userId)));
    if (!entry) throw new NotFoundError('Entry not found');
    return entry;
  },

  async createOrGetByDate(userId: string, entryDate?: Date): Promise<Entry> {
    const date = getMidnightUTC(entryDate ?? new Date());
    const [existing] = await db
      .select().from(entries)
      .where(and(eq(entries.userId, userId), eq(entries.entryDate, date), eq(entries.isActive, true)));
    if (existing) return existing;
    const [created] = await db.insert(entries).values({
      userId,
      entryDate: date,
      content: JSON.stringify({ type: 'doc', content: [] }),
      plainText: '',
      isActive: true,
    }).returning();
    return created;
  },

  async update(id: string, userId: string, data: Partial<Entry>): Promise<Entry> {
    const existing = await this.findById(id, userId);
    if (!existing.isActive) throw new ForbiddenError('Cannot update deleted entry');
    const [updated] = await db
      .update(entries)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(entries.id, id), eq(entries.userId, userId)))
      .returning();
    return updated;
  },

  async softDelete(id: string, userId: string): Promise<void> {
    await this.findById(id, userId);
    await db.update(entries).set({ isActive: false, updatedAt: new Date() }).where(and(eq(entries.id, id), eq(entries.userId, userId)));
  },

  async permanentDelete(id: string, userId: string): Promise<void> {
    await this.findById(id, userId);
    await db.delete(entries).where(and(eq(entries.id, id), eq(entries.userId, userId)));
  },

  async search(userId: string, q: string): Promise<Entry[]> {
    if (!q.trim()) return this.list(userId);
    return db.select().from(entries)
      .where(and(eq(entries.userId, userId), eq(entries.isActive, true), ilike(entries.plainText, `%${q}%`)))
      .orderBy(desc(entries.entryDate));
  },

  async getByRange(userId: string, start: Date, end: Date): Promise<Entry[]> {
    return db.select().from(entries)
      .where(and(eq(entries.userId, userId), eq(entries.isActive, true), gte(entries.entryDate, start), lte(entries.entryDate, end)))
      .orderBy(desc(entries.entryDate));
  },
};
