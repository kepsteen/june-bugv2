CREATE TYPE "public"."memory_tier" AS ENUM('core', 'working');--> statement-breakpoint
ALTER TYPE "public"."ai_usage_feature" ADD VALUE 'memory_curation' BEFORE 'personalized_prompts';--> statement-breakpoint
ALTER TABLE "memory_embeddings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "memory_embeddings" CASCADE;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "memory_curated_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_memories" ADD COLUMN "tier" "memory_tier" DEFAULT 'working' NOT NULL;--> statement-breakpoint
CREATE INDEX "user_memories_user_tier_idx" ON "user_memories" USING btree ("user_id","tier");