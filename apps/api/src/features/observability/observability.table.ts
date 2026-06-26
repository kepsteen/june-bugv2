import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { appUsers } from '../app-users/app-users.table';
import { entries } from '../entries/entries.table';

// AI Usage Events
export const aiUsageStatusEnum = pgEnum('ai_usage_status', [
  'success',
  'error',
  'fallback',
]);

export const aiUsageFeatureEnum = pgEnum('ai_usage_feature', [
  'entry_title',
  'memory_extraction',
  'memory_embedding',
  'memory_curation',
  'personalized_prompts',
]);

export const aiUsageEvents = pgTable(
  'ai_usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    feature: aiUsageFeatureEnum('feature').notNull(),
    model: text('model').notNull(),
    status: aiUsageStatusEnum('status').notNull(),
    latencyMs: integer('latency_ms').notNull(),
    tokensInput: integer('tokens_input'),
    tokensOutput: integer('tokens_output'),
    requestContext: jsonb('request_context').$type<{
      entryId?: string;
      focusCategory?: string;
      memoryCount?: number;
      memoryId?: string;
    }>(),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('ai_usage_events_user_idx').on(table.userId),
    index('ai_usage_events_feature_idx').on(table.feature),
    index('ai_usage_events_status_idx').on(table.status),
    index('ai_usage_events_created_at_idx').on(table.createdAt),
    index('ai_usage_events_user_created_idx').on(table.userId, table.createdAt),
  ],
);

export const aiUsageEventsRelations = relations(aiUsageEvents, ({ one }) => ({
  user: one(appUsers, {
    fields: [aiUsageEvents.userId],
    references: [appUsers.id],
  }),
}));

export type AiUsageEvent = typeof aiUsageEvents.$inferSelect;
export type NewAiUsageEvent = typeof aiUsageEvents.$inferInsert;

// Queue Job Events
export const queueJobStatusEnum = pgEnum('queue_job_status', [
  'published',
  'processing',
  'retrying',
  'completed',
  'failed',
  'dead_lettered',
  'skipped',
]);

export const queueJobTypeEnum = pgEnum('queue_job_type', [
  'memory_entry_changed',
]);

export const queueJobOutcomeEnum = pgEnum('queue_job_outcome', [
  'success',
  'idempotent_duplicate',
  'stale_update',
  'no_entry_text',
  'no_candidates',
  'validation_error',
  'processing_error',
  'max_retries_exceeded',
]);

export const queueJobEvents = pgTable(
  'queue_job_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: text('job_id').notNull(),
    jobType: queueJobTypeEnum('job_type').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    entryId: uuid('entry_id').references(() => entries.id, {
      onDelete: 'set null',
    }),
    status: queueJobStatusEnum('status').notNull(),
    retryCount: integer('retry_count').notNull().default(0),
    outcome: queueJobOutcomeEnum('outcome'),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('queue_job_events_job_id_idx').on(table.jobId),
    index('queue_job_events_user_idx').on(table.userId),
    index('queue_job_events_status_idx').on(table.status),
    index('queue_job_events_created_at_idx').on(table.createdAt),
    index('queue_job_events_job_type_created_idx').on(table.jobType, table.createdAt),
    index('queue_job_events_user_created_idx').on(table.userId, table.createdAt),
  ],
);

export const queueJobEventsRelations = relations(queueJobEvents, ({ one }) => ({
  user: one(appUsers, {
    fields: [queueJobEvents.userId],
    references: [appUsers.id],
  }),
  entry: one(entries, {
    fields: [queueJobEvents.entryId],
    references: [entries.id],
  }),
}));

export type QueueJobEvent = typeof queueJobEvents.$inferSelect;
export type NewQueueJobEvent = typeof queueJobEvents.$inferInsert;
