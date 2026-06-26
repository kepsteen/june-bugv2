import { relations } from 'drizzle-orm';
import { pgTable, uuid, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { entries } from '../entries/entries.table';
import { tags } from '../tags/tags.table';

export const entryTags = pgTable(
  'entry_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entryId: uuid('entry_id')
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('entry_tags_entry_tag_idx').on(table.entryId, table.tagId),
    //TODO: add index on tagId
  ],
);

export const entryTagsRelations = relations(entryTags, ({ one }) => ({
  entry: one(entries, {
    fields: [entryTags.entryId],
    references: [entries.id],
  }),
  tag: one(tags, {
    fields: [entryTags.tagId],
    references: [tags.id],
  }),
}));

export type EntryTag = typeof entryTags.$inferSelect;
