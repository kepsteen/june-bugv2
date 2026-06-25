ALTER TABLE "app_users" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_stripe_customer_id_unique" UNIQUE("stripe_customer_id");