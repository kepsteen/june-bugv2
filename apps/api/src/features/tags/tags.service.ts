import { db } from '@/lib/db/index.js';
import { tags } from './tags.table.js';
import { eq, and, or, isNull } from 'drizzle-orm';
import { NotFoundError, ConflictError, ForbiddenError } from '@/lib/errors/index.js';
import type { Tag } from './tags.table.js';

export const tagsService = {
  // System tags + user's custom tags
  async list(userId: string, includeInactive = false): Promise<Tag[]> {
    const activeCondition = includeInactive ? undefined : eq(tags.isActive, true);

    const userCondition = or(
      eq(tags.isSystemGenerated, true),
      eq(tags.userId, userId),
    );

    const conditions = activeCondition
      ? and(userCondition, activeCondition)
      : userCondition;

    return db.select().from(tags).where(conditions);
  },

  // System tags only
  async listSystem(): Promise<Tag[]> {
    return db.select().from(tags).where(
      and(eq(tags.isSystemGenerated, true), eq(tags.isActive, true)),
    );
  },

  // User's custom tags only
  async listUser(userId: string): Promise<Tag[]> {
    return db.select().from(tags).where(
      and(eq(tags.userId, userId), eq(tags.isActive, true)),
    );
  },

  async findById(id: string): Promise<Tag> {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    if (!tag) throw new NotFoundError('Tag not found');
    return tag;
  },

  async create(userId: string, data: { name: string; emoji?: string; color?: string }): Promise<Tag> {
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

  async update(
    id: string,
    userId: string,
    data: { name?: string; emoji?: string; color?: string },
  ): Promise<Tag> {
    const tag = await this.findById(id);

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

  async softDelete(id: string, userId: string): Promise<void> {
    const tag = await this.findById(id);

    if (tag.isSystemGenerated) throw new ForbiddenError('Cannot delete system tags');
    if (tag.userId !== userId) throw new ForbiddenError('You do not own this tag');

    await db
      .update(tags)
      .set({ isActive: false })
      .where(and(eq(tags.id, id), eq(tags.userId, userId)));
  },
};
