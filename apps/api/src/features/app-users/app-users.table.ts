import { relations } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { user } from '../auth/auth.table';
import { entries } from '../entries/entries.table';
import { tags } from '../tags/tags.table';
import { todos } from '../todos/todos.table';

export const experienceLevelEnum = pgEnum('experience_level', [
  'Junior',
  'Mid-Level',
  'Senior',
  'Lead',
  'Principal',
]);

export const mentorshipStyleEnum = pgEnum('mentorship_style', [
  'Structured',
  'Exploratory',
  'Challenge-driven',
  'Reflective',
]);

export const workEnvironmentEnum = pgEnum('work_environment', [
  'Individual contributor at company',
  'Team lead/manager',
  'Freelance/consultant',
  'Student/bootcamp',
  'Career transition/job seeking',
  'Side projects only',
]);

export const journalingFrequencyEnum = pgEnum('journaling_frequency', [
  'Daily',
  'Every other day',
  'Weekly',
  'Custom schedule',
]);

export const appUsers = pgTable('app_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  authId: text('auth_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  email: text('email'),
  isOnboarded: boolean('is_onboarded').default(false).notNull(),
  fullName: text('full_name'),
  age: integer('age'),
  currentRole: text('current_role'),
  experienceLevel: experienceLevelEnum('experience_level'),
  mentorshipStyle: mentorshipStyleEnum('mentorship_style'),
  developmentGoals: jsonb('development_goals').$type<string[]>(),
  techStack: jsonb('tech_stack').$type<string[]>(),
  workEnvironment: workEnvironmentEnum('work_environment'),
  journalingFrequency: journalingFrequencyEnum('journaling_frequency'),
  customScheduleDays: jsonb('custom_schedule_days').$type<string[]>(),
  journalingTime: text('journaling_time'),
  notificationPreferences: jsonb('notification_preferences').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const appUsersRelations = relations(appUsers, ({ many }) => ({
  entries: many(entries),
  tags: many(tags),
  todos: many(todos),
}));

export type AppUser = typeof appUsers.$inferSelect;
export type NewAppUser = typeof appUsers.$inferInsert;
