import { relations } from "drizzle-orm";
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { appUsers } from "../app-users/app-users.table";

export const subscriptions = pgTable("subscriptions", {
	id: uuid("id").primaryKey().defaultRandom(),
	appUserId: uuid("app_user_id")
		.notNull()
		.unique()
		.references(() => appUsers.id, { onDelete: "cascade" }),
	stripeCustomerId: text("stripe_customer_id").notNull(),
	stripeSubscriptionId: text("stripe_subscription_id").notNull(),
	stripePriceId: text("stripe_price_id").notNull(),
	stripeCurrentPeriodStart: timestamp("stripe_current_period_start").notNull(),
	stripeCurrentPeriodEnd: timestamp("stripe_current_period_end").notNull(),
	stripeStatus: text("stripe_status").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
	appUser: one(appUsers, {
		fields: [subscriptions.appUserId],
		references: [appUsers.id],
	}),
}));

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
