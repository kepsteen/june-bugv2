CREATE TYPE "public"."ai_usage_feature" AS ENUM('entry_title', 'memory_extraction', 'personalized_prompts');--> statement-breakpoint
CREATE TYPE "public"."ai_usage_status" AS ENUM('success', 'error', 'fallback');--> statement-breakpoint
CREATE TYPE "public"."queue_job_outcome" AS ENUM('success', 'idempotent_duplicate', 'stale_update', 'no_entry_text', 'no_candidates', 'validation_error', 'processing_error', 'max_retries_exceeded');--> statement-breakpoint
CREATE TYPE "public"."queue_job_status" AS ENUM('published', 'processing', 'retrying', 'completed', 'failed', 'dead_lettered', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."queue_job_type" AS ENUM('memory_entry_changed');--> statement-breakpoint
CREATE TABLE "ai_usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"feature" "ai_usage_feature" NOT NULL,
	"model" text NOT NULL,
	"status" "ai_usage_status" NOT NULL,
	"latency_ms" integer NOT NULL,
	"tokens_input" integer,
	"tokens_output" integer,
	"request_context" jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queue_job_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" text NOT NULL,
	"job_type" "queue_job_type" NOT NULL,
	"user_id" uuid NOT NULL,
	"entry_id" uuid,
	"status" "queue_job_status" NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"outcome" "queue_job_outcome",
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_job_events" ADD CONSTRAINT "queue_job_events_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_job_events" ADD CONSTRAINT "queue_job_events_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_events_user_idx" ON "ai_usage_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_usage_events_feature_idx" ON "ai_usage_events" USING btree ("feature");--> statement-breakpoint
CREATE INDEX "ai_usage_events_status_idx" ON "ai_usage_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_usage_events_created_at_idx" ON "ai_usage_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_events_user_created_idx" ON "ai_usage_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "queue_job_events_job_id_idx" ON "queue_job_events" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "queue_job_events_user_idx" ON "queue_job_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "queue_job_events_status_idx" ON "queue_job_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "queue_job_events_created_at_idx" ON "queue_job_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "queue_job_events_job_type_created_idx" ON "queue_job_events" USING btree ("job_type","created_at");--> statement-breakpoint
CREATE INDEX "queue_job_events_user_created_idx" ON "queue_job_events" USING btree ("user_id","created_at");