import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { appUsers } from '../app-users/app-users.table';
import { entries } from '../entries/entries.table';
import { memoryCategoryEnum } from '../memories/memories.table';

export const entryPrompts = pgTable(
  'entry_prompts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    entryId: uuid('entry_id')
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    focusCategory: memoryCategoryEnum('focus_category'),
    prompt: text('prompt').notNull(),
    rationale: text('rationale').notNull(),
    anchorCategory: memoryCategoryEnum('anchor_category'),
    anchorMemoryTitle: text('anchor_memory_title'),
    sortOrder: integer('sort_order').notNull(),
    retrievalStructuredCount: integer('retrieval_structured_count').notNull().default(0),
    retrievalSemanticCount: integer('retrieval_semantic_count').notNull().default(0),
    retrievalConsideredCount: integer('retrieval_considered_count').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('entry_prompts_user_idx').on(table.userId),
    index('entry_prompts_entry_idx').on(table.entryId),
    index('entry_prompts_focus_category_idx').on(table.focusCategory),
    index('entry_prompts_user_entry_category_idx').on(table.userId, table.entryId, table.focusCategory),
    uniqueIndex('entry_prompts_entry_category_sort_idx').on(
      table.entryId,
      table.focusCategory,
      table.sortOrder,
    ),
  ],
);

export const entryPromptsRelations = relations(entryPrompts, ({ one }) => ({
  user: one(appUsers, {
    fields: [entryPrompts.userId],
    references: [appUsers.id],
  }),
  entry: one(entries, {
    fields: [entryPrompts.entryId],
    references: [entries.id],
  }),
}));

export type EntryPrompt = typeof entryPrompts.$inferSelect;
export type NewEntryPrompt = typeof entryPrompts.$inferInsert;
