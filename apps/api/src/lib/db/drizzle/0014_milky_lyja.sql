ALTER TABLE "subscriptions" ADD COLUMN "stripe_cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "stripe_cancel_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "stripe_canceled_at" timestamp;