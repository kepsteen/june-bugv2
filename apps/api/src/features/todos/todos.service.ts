import { db } from '@/lib/db/index.js';
import { todos } from './todos.table.js';
import { eq, and, desc } from 'drizzle-orm';
import { NotFoundError } from '@/lib/errors/index.js';
import { wrapService } from '@/lib/service-wrapper.js';
import type { Todo } from './todos.table.js';

const todosServiceRaw = {
  async list({ userId }: { userId: string }): Promise<Todo[]> {
    return db.select().from(todos).where(eq(todos.userId, userId)).orderBy(desc(todos.createdAt));
  },

  async create({ userId, text }: { userId: string; text: string }): Promise<Todo> {
    const [created] = await db.insert(todos).values({ userId, text }).returning();
    return created;
  },

  async toggle({ id, userId }: { id: string; userId: string }): Promise<Todo> {
    // Fetch current state
    const [existing] = await db.select().from(todos).where(
      and(eq(todos.id, id), eq(todos.userId, userId)),
    );
    if (!existing) throw new NotFoundError('Todo not found');

    const [updated] = await db
      .update(todos)
      .set({ completed: !existing.completed, updatedAt: new Date() })
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .returning();

    return updated;
  },

  async delete({ id, userId }: { id: string; userId: string }): Promise<void> {
    const [existing] = await db.select().from(todos).where(
      and(eq(todos.id, id), eq(todos.userId, userId)),
    );
    if (!existing) throw new NotFoundError('Todo not found');

    await db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, userId)));
  },
};

export const todosService = wrapService('todosService', todosServiceRaw);
