import { db } from '@/lib/db/index.js';
import { tags } from './tags.table.js';
import { eq, and, or } from 'drizzle-orm';
import { NotFoundError, ConflictError, ForbiddenError } from '@/lib/errors/index.js';
import { wrapService } from '@/lib/service-wrapper.js';
import type { Tag } from './tags.table.js';

const tagsServiceRaw = {
  // System tags + user's custom tags
  async list({ userId }: { userId: string }): Promise<Tag[]> {
    const userCondition = or(
      eq(tags.isSystemGenerated, true),
      eq(tags.userId, userId),
    );

    return db.select().from(tags).where(userCondition);
  },

  // System tags only
  async listSystem(_options?: {}): Promise<Tag[]> {
    return db.select().from(tags).where(eq(tags.isSystemGenerated, true));
  },

  // User's custom tags only
  async listUser({ userId }: { userId: string }): Promise<Tag[]> {
    return db.select().from(tags).where(eq(tags.userId, userId));
  },

  async findById({ id }: { id: string }): Promise<Tag> {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    if (!tag) throw new NotFoundError('Tag not found');
    return tag;
  },

  async create({ userId, data }: { userId: string; data: { name: string; emoji?: string; color?: string } }): Promise<Tag> {
    // Check for duplicate name among user's tags
    const [existing] = await db.select().from(tags).where(
      and(eq(tags.userId, userId), eq(tags.name, data.name)),
    );
    if (existing) throw new ConflictError('A tag with this name already exists');

    const [created] = await db.insert(tags).values({
      userId,
      name: data.name,
      emoji: data.emoji,
      color: data.color,
      isSystemGenerated: false,
    }).returning();

    return created;
  },

  async update({ id, userId, data }: { id: string; userId: string; data: { name?: string; emoji?: string; color?: string } }): Promise<Tag> {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    if (!tag) throw new NotFoundError('Tag not found');

    // Only owner can update non-system tags
    if (tag.isSystemGenerated) throw new ForbiddenError('Cannot modify system tags');
    if (tag.userId !== userId) throw new ForbiddenError('You do not own this tag');

    // Check for name conflict if name is being changed
    if (data.name && data.name !== tag.name) {
      const [duplicate] = await db.select().from(tags).where(
        and(eq(tags.userId, userId), eq(tags.name, data.name)),
      );
      if (duplicate) throw new ConflictError('A tag with this name already exists');
    }

    const [updated] = await db
      .update(tags)
      .set(data)
      .where(and(eq(tags.id, id), eq(tags.userId, userId)))
      .returning();

    return updated;
  },

  async delete({ id, userId }: { id: string; userId: string }): Promise<void> {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    if (!tag) throw new NotFoundError('Tag not found');

    if (tag.isSystemGenerated) throw new ForbiddenError('Cannot delete system tags');
    if (tag.userId !== userId) throw new ForbiddenError('You do not own this tag');

    await db.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, userId)));
  },
};

export const tagsService = wrapService('tagsService', tagsServiceRaw);
