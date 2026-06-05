import { relations } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
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
    content: text('content').notNull().default(''),
    plainText: text('plain_text').default(''),
    Title: text('title'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('entries_user_date_idx').on(table.userId, table.entryDate),
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
