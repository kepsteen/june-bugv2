CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_user_id" uuid NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"stripe_price_id" text NOT NULL,
	"stripe_current_period_start" timestamp NOT NULL,
	"stripe_current_period_end" timestamp NOT NULL,
	"stripe_status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_app_user_id_unique" UNIQUE("app_user_id")
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_app_user_id_app_users_id_fk" FOREIGN KEY ("app_user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;