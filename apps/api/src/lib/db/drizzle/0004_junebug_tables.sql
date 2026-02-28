-- JuneBug application tables migration

-- Enums
DO $$ BEGIN
  CREATE TYPE "experience_level" AS ENUM('Junior', 'Mid-Level', 'Senior', 'Lead', 'Principal');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "mentorship_style" AS ENUM('Structured', 'Exploratory', 'Challenge-driven', 'Reflective');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "work_environment" AS ENUM('Individual contributor at company', 'Team lead/manager', 'Freelance/consultant', 'Student/bootcamp', 'Career transition/job seeking', 'Side projects only');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "journaling_frequency" AS ENUM('Daily', 'Every other day', 'Weekly', 'Custom schedule');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- App users table
CREATE TABLE IF NOT EXISTS "app_users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "auth_id" text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
  "email" text,
  "is_onboarded" boolean DEFAULT false NOT NULL,
  "full_name" text,
  "age" integer,
  "current_role" text,
  "experience_level" "experience_level",
  "mentorship_style" "mentorship_style",
  "development_goals" jsonb,
  "tech_stack" jsonb,
  "work_environment" "work_environment",
  "journaling_frequency" "journaling_frequency",
  "custom_schedule_days" jsonb,
  "journaling_time" text,
  "notification_preferences" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Entries table
CREATE TABLE IF NOT EXISTS "entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "app_users"("id") ON DELETE CASCADE,
  "entry_date" timestamp NOT NULL,
  "content" text DEFAULT '{"type":"doc","content":[]}' NOT NULL,
  "plain_text" text DEFAULT '',
  "ai_title" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "entries_user_date_idx" ON "entries" ("user_id", "entry_date");
CREATE INDEX IF NOT EXISTS "entries_user_active_date_idx" ON "entries" ("user_id", "is_active", "entry_date");

-- Tags table
CREATE TABLE IF NOT EXISTS "tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid REFERENCES "app_users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "is_system_generated" boolean DEFAULT false NOT NULL,
  "emoji" text,
  "color" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tags_user_name_idx" ON "tags" ("user_id", "name");
CREATE INDEX IF NOT EXISTS "tags_user_active_idx" ON "tags" ("user_id", "is_active");
CREATE INDEX IF NOT EXISTS "tags_system_idx" ON "tags" ("is_system_generated");

-- Entry tags table
CREATE TABLE IF NOT EXISTS "entry_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entry_id" uuid NOT NULL REFERENCES "entries"("id") ON DELETE CASCADE,
  "tag_id" uuid NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "entry_tags_entry_tag_idx" ON "entry_tags" ("entry_id", "tag_id");

-- Todos table
CREATE TABLE IF NOT EXISTS "todos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "app_users"("id") ON DELETE CASCADE,
  "text" text NOT NULL,
  "completed" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "todos_user_idx" ON "todos" ("user_id");
