import { relations } from 'drizzle-orm';
import {
  index,
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

export const memoryCategoryEnum = pgEnum('memory_category', [
  'goal',
  'project',
  'milestone',
  'blocker',
  'win',
  'learning',
  'skill_growth',
  'preference',
  'habit',
  'relationship',
  'value',
  'other',
]);

export const memoryStatusEnum = pgEnum('memory_status', [
  'active',
  'stale',
  'archived',
]);

export const memorySourceEnum = pgEnum('memory_source', [
  'onboarding',
  'entry',
  'system',
]);

export const milestoneStateEnum = pgEnum('milestone_state', [
  'planned',
  'in_progress',
  'completed',
  'blocked',
]);

export const memoryEventTypeEnum = pgEnum('memory_event_type', [
  'created',
  'updated',
  'merged',
  'archived',
]);

export const memoryTierEnum = pgEnum('memory_tier', ['core', 'working']);

export const userMemories = pgTable(
  'user_memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    category: memoryCategoryEnum('category').notNull(),
    tier: memoryTierEnum('tier').notNull().default('working'),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    evidenceEntryId: uuid('evidence_entry_id').references(() => entries.id, {
      onDelete: 'set null',
    }),
    canonicalKey: text('canonical_key'),
    confidence: real('confidence').notNull().default(0.5),
    importance: real('importance').notNull().default(0.5),
    firstSeenAt: timestamp('first_seen_at').defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
    status: memoryStatusEnum('status').notNull().default('active'),
    source: memorySourceEnum('source').notNull().default('entry'),
    goalId: text('goal_id'),
    projectName: text('project_name'),
    impactType: text('impact_type'),
    impactSummary: text('impact_summary'),
    milestoneState: milestoneStateEnum('milestone_state'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    archivedAt: timestamp('archived_at'),
  },
  (table) => [
    index('user_memories_user_idx').on(table.userId),
    index('user_memories_category_idx').on(table.category),
    index('user_memories_status_idx').on(table.status),
    index('user_memories_last_seen_idx').on(table.lastSeenAt),
    index('user_memories_goal_idx').on(table.goalId),
    index('user_memories_project_idx').on(table.projectName),
    index('user_memories_user_category_status_idx').on(
      table.userId,
      table.category,
      table.status,
    ),
    index('user_memories_user_canonical_key_idx').on(
      table.userId,
      table.canonicalKey,
    ),
    index('user_memories_user_tier_idx').on(table.userId, table.tier),
  ],
);

export const memoryEvents = pgTable(
  'memory_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memoryId: uuid('memory_id').references(() => userMemories.id, {
      onDelete: 'cascade',
    }),
    eventType: memoryEventTypeEnum('event_type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('memory_events_memory_idx').on(table.memoryId),
    index('memory_events_event_type_idx').on(table.eventType),
    index('memory_events_created_at_idx').on(table.createdAt),
  ],
);

export const userMemoriesRelations = relations(userMemories, ({ one, many }) => ({
  user: one(appUsers, {
    fields: [userMemories.userId],
    references: [appUsers.id],
  }),
  evidenceEntry: one(entries, {
    fields: [userMemories.evidenceEntryId],
    references: [entries.id],
  }),
  events: many(memoryEvents),
}));

export const memoryEventsRelations = relations(memoryEvents, ({ one }) => ({
  memory: one(userMemories, {
    fields: [memoryEvents.memoryId],
    references: [userMemories.id],
  }),
}));

export type UserMemory = typeof userMemories.$inferSelect;
export type NewUserMemory = typeof userMemories.$inferInsert;
export type MemoryEvent = typeof memoryEvents.$inferSelect;
export type NewMemoryEvent = typeof memoryEvents.$inferInsert;
