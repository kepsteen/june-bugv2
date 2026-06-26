import { relations } from 'drizzle-orm';
import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { appUsers } from '../app-users/app-users.table';

export const todos = pgTable(
  'todos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    completed: boolean('completed').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('todos_user_idx').on(table.userId)],
  // TODO: consider an index on userId,createdAt to handle sort by date queries
);

export const todosRelations = relations(todos, ({ one }) => ({
  user: one(appUsers, {
    fields: [todos.userId],
    references: [appUsers.id],
  }),
}));

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
