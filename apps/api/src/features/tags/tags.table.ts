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

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => appUsers.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    isSystemGenerated: boolean('is_system_generated').default(false).notNull(),
    emoji: text('emoji'),
    color: text('color'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('tags_user_name_idx').on(table.userId, table.name),
    index('tags_user_active_idx').on(table.userId, table.isActive),
    index('tags_system_idx').on(table.isSystemGenerated),
  ],
);

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(appUsers, {
    fields: [tags.userId],
    references: [appUsers.id],
  }),
  entryTags: many(entryTags),
}));

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
