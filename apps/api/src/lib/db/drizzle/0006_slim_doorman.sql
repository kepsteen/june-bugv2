CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
 
CREATE TYPE "public"."memory_category" AS ENUM('goal', 'project', 'milestone', 'blocker', 'win', 'learning', 'skill_growth', 'preference', 'habit', 'relationship', 'value', 'other');--> statement-breakpoint
CREATE TYPE "public"."memory_event_type" AS ENUM('created', 'updated', 'merged', 'archived');--> statement-breakpoint
CREATE TYPE "public"."memory_source" AS ENUM('onboarding', 'entry', 'system');--> statement-breakpoint
CREATE TYPE "public"."memory_status" AS ENUM('active', 'stale', 'archived');--> statement-breakpoint
CREATE TYPE "public"."milestone_state" AS ENUM('planned', 'in_progress', 'completed', 'blocked');--> statement-breakpoint
CREATE TABLE "memory_embeddings" (
	"memory_id" uuid PRIMARY KEY NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"embedding_model" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memory_id" uuid,
	"event_type" "memory_event_type" NOT NULL,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "memory_category" NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"evidence_entry_id" uuid,
	"canonical_key" text,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"importance" real DEFAULT 0.5 NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"status" "memory_status" DEFAULT 'active' NOT NULL,
	"source" "memory_source" DEFAULT 'entry' NOT NULL,
	"goal_id" text,
	"project_name" text,
	"impact_type" text,
	"impact_summary" text,
	"milestone_state" "milestone_state",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "memory_embeddings" ADD CONSTRAINT "memory_embeddings_memory_id_user_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."user_memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_events" ADD CONSTRAINT "memory_events_memory_id_user_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."user_memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_memories" ADD CONSTRAINT "user_memories_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_memories" ADD CONSTRAINT "user_memories_evidence_entry_id_entries_id_fk" FOREIGN KEY ("evidence_entry_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memory_embeddings_updated_idx" ON "memory_embeddings" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "memory_events_memory_idx" ON "memory_events" USING btree ("memory_id");--> statement-breakpoint
CREATE INDEX "memory_events_event_type_idx" ON "memory_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "memory_events_created_at_idx" ON "memory_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_memories_user_idx" ON "user_memories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_memories_category_idx" ON "user_memories" USING btree ("category");--> statement-breakpoint
CREATE INDEX "user_memories_status_idx" ON "user_memories" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_memories_last_seen_idx" ON "user_memories" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "user_memories_goal_idx" ON "user_memories" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "user_memories_project_idx" ON "user_memories" USING btree ("project_name");--> statement-breakpoint
CREATE INDEX "user_memories_user_category_status_idx" ON "user_memories" USING btree ("user_id","category","status");--> statement-breakpoint
CREATE INDEX "user_memories_user_canonical_key_idx" ON "user_memories" USING btree ("user_id","canonical_key");