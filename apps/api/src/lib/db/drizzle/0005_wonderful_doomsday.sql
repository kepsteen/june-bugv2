DROP INDEX "entries_user_active_date_idx";--> statement-breakpoint
DROP INDEX "tags_user_active_idx";--> statement-breakpoint
ALTER TABLE "entries" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "tags" DROP COLUMN "is_active";