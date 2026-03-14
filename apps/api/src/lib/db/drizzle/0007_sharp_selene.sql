CREATE TABLE "entry_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"focus_category" "memory_category",
	"prompt" text NOT NULL,
	"rationale" text NOT NULL,
	"anchor_category" "memory_category",
	"anchor_memory_title" text,
	"sort_order" integer NOT NULL,
	"retrieval_structured_count" integer DEFAULT 0 NOT NULL,
	"retrieval_semantic_count" integer DEFAULT 0 NOT NULL,
	"retrieval_considered_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entry_prompts" ADD CONSTRAINT "entry_prompts_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_prompts" ADD CONSTRAINT "entry_prompts_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entry_prompts_user_idx" ON "entry_prompts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "entry_prompts_entry_idx" ON "entry_prompts" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "entry_prompts_focus_category_idx" ON "entry_prompts" USING btree ("focus_category");--> statement-breakpoint
CREATE INDEX "entry_prompts_user_entry_category_idx" ON "entry_prompts" USING btree ("user_id","entry_id","focus_category");--> statement-breakpoint
CREATE UNIQUE INDEX "entry_prompts_entry_category_sort_idx" ON "entry_prompts" USING btree ("entry_id","focus_category","sort_order");