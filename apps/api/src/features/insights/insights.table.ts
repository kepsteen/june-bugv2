import { relations } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { appUsers } from '../app-users/app-users.table';

export const userInsights = pgTable('user_insights', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => appUsers.id, { onDelete: 'cascade' }),
  summary: text('summary').notNull(),
  topics: jsonb('topics').$type<string[]>().notNull(),
  personalizedPrompts: jsonb('personalized_prompts')
    .$type<{ category: string; prompt: string }[]>()
    .notNull(),
  entriesAnalyzedCount: integer('entries_analyzed_count').notNull(),
  lastAnalyzedAt: timestamp('last_analyzed_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userInsightsRelations = relations(userInsights, ({ one }) => ({
  user: one(appUsers, {
    fields: [userInsights.userId],
    references: [appUsers.id],
  }),
}));

export type UserInsight = typeof userInsights.$inferSelect;
export type NewUserInsight = typeof userInsights.$inferInsert;
