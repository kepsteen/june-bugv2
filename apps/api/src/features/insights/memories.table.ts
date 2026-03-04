import { relations } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { appUsers } from '../app-users/app-users.table';
import { entries } from '../entries/entries.table';

export const memoryCategoryEnum = pgEnum('memory_category', [
  'career_goal',
  'project',
  'milestone',
  'preference',
  'technical',
  'personal',
]);

export const userMemories = pgTable(
  'user_memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    category: memoryCategoryEnum('category').notNull(),
    sourceEntryId: uuid('source_entry_id').references(() => entries.id, {
      onDelete: 'set null',
    }),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('memories_user_active_idx').on(table.userId, table.isActive),
    index('memories_category_idx').on(table.category),
  ]
);

export const userMemoriesRelations = relations(userMemories, ({ one }) => ({
  user: one(appUsers, {
    fields: [userMemories.userId],
    references: [appUsers.id],
  }),
  sourceEntry: one(entries, {
    fields: [userMemories.sourceEntryId],
    references: [entries.id],
  }),
}));

export type UserMemory = typeof userMemories.$inferSelect;
export type NewUserMemory = typeof userMemories.$inferInsert;
