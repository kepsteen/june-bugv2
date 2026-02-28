import { relations } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { appUsers } from '../app-users/app-users.table';
import { entryTags } from '../entry-tags/entry-tags.table';

export const entries = pgTable(
  'entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    entryDate: timestamp('entry_date').notNull(),
    content: text('content').notNull().default('{"type":"doc","content":[]}'),
    plainText: text('plain_text').default(''),
    aiTitle: text('ai_title'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('entries_user_date_idx').on(table.userId, table.entryDate),
    index('entries_user_active_date_idx').on(
      table.userId,
      table.isActive,
      table.entryDate,
    ),
  ],
);

export const entriesRelations = relations(entries, ({ one, many }) => ({
  user: one(appUsers, {
    fields: [entries.userId],
    references: [appUsers.id],
  }),
  entryTags: many(entryTags),
}));

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
