import { db } from "@/lib/db/index.js";
import { wrapService } from "@/lib/service-wrapper.js";
import { stripe } from "@/lib/stripe/stripe.js";
import { env } from "@/config/env.js";
import { AppError } from "@/lib/errors/index.js";
import { appUsersService } from "@/features/app-users/app-users.service.js";
import { subscriptions } from "../table.js";
import type { Subscription, NewSubscription } from "../table.js";
import type { AppUser } from "@/features/app-users/app-users.table.js";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

const subscriptionsServiceRaw = {
	// Reuses the user's Stripe customer if one exists, otherwise creates one and
	// persists the id on app_users so we never create duplicate customers.
	async findOrCreateCustomer({ appUser }: { appUser: AppUser }): Promise<string> {
		if (appUser.stripeCustomerId) return appUser.stripeCustomerId;

		const customer = await stripe.customers.create({
			email: appUser.email ?? undefined,
			metadata: { appUserId: appUser.id },
		});

		await appUsersService.setStripeCustomerId({
			id: appUser.id,
			stripeCustomerId: customer.id,
		});

		return customer.id;
	},

	async createCheckoutSession({
		appUser,
		priceId,
	}: {
		appUser: AppUser;
		priceId?: string;
	}): Promise<{ url: string }> {
		const customerId = await subscriptionsServiceRaw.findOrCreateCustomer({ appUser });

		const session = await stripe.checkout.sessions.create({
			mode: "subscription",
			customer: customerId,
			line_items: [{ price: priceId ?? env.STRIPE_PRICE_PRO, quantity: 1 }],
			success_url: `${env.CLIENT_URL}/settings/billing?checkout=success`,
			cancel_url: `${env.CLIENT_URL}/settings/billing?checkout=cancelled`,
			// Link the resulting subscription back to our user as a fallback.
			subscription_data: { metadata: { appUserId: appUser.id } },
			allow_promotion_codes: true,
		});

		if (!session.url) {
			throw new AppError("Stripe did not return a checkout URL", 502);
		}

		return { url: session.url };
	},

	async createPortalSession({ appUser }: { appUser: AppUser }): Promise<{ url: string }> {
		if (!appUser.stripeCustomerId) {
			throw new AppError("No Stripe customer for this user", 400);
		}

		const session = await stripe.billingPortal.sessions.create({
			customer: appUser.stripeCustomerId,
			return_url: `${env.CLIENT_URL}/settings/billing`,
		});

		return { url: session.url };
	},

	async getByAppUserId({ appUserId }: { appUserId: string }): Promise<Subscription | null> {
		const [found] = await db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.appUserId, appUserId));
		return found ?? null;
	},

	// Single writer for subscription state. Called from webhook handlers with the
	// Stripe.Subscription object straight off the event.
	async upsertFromStripeSubscription({
		subscription,
	}: {
		subscription: Stripe.Subscription;
	}): Promise<void> {
		const customerId =
			typeof subscription.customer === "string"
				? subscription.customer
				: subscription.customer.id;

		const appUser = await appUsersService.findByStripeCustomerId({
			stripeCustomerId: customerId,
		});
		if (!appUser) {
			throw new AppError(`No app user for Stripe customer ${customerId}`, 404);
		}

		// In API version dahlia, current_period_* live on the subscription ITEM.
		const item = subscription.items.data[0];

		const values: NewSubscription = {
			appUserId: appUser.id,
			stripeCustomerId: customerId,
			stripeSubscriptionId: subscription.id,
			stripePriceId: item.price.id,
			stripeCurrentPeriodStart: new Date(item.current_period_start * 1000),
			stripeCurrentPeriodEnd: new Date(item.current_period_end * 1000),
			stripeStatus: subscription.status,
			stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
			stripeCancelAt: subscription.cancel_at
				? new Date(subscription.cancel_at * 1000)
				: null,
			stripeCanceledAt: subscription.canceled_at
				? new Date(subscription.canceled_at * 1000)
				: null,
		};

		await db
			.insert(subscriptions)
			.values(values)
			.onConflictDoUpdate({
				target: subscriptions.appUserId,
				set: {
					stripeCustomerId: values.stripeCustomerId,
					stripeSubscriptionId: values.stripeSubscriptionId,
					stripePriceId: values.stripePriceId,
					stripeCurrentPeriodStart: values.stripeCurrentPeriodStart,
					stripeCurrentPeriodEnd: values.stripeCurrentPeriodEnd,
					stripeStatus: values.stripeStatus,
					stripeCancelAtPeriodEnd: values.stripeCancelAtPeriodEnd,
					stripeCancelAt: values.stripeCancelAt,
					stripeCanceledAt: values.stripeCanceledAt,
					updatedAt: new Date(),
				},
			});
	},

	// Fetches the latest subscription state from Stripe, then upserts it. Used by
	// the checkout.session.completed handler where we only have the subscription id.
	async syncByStripeSubscriptionId({
		stripeSubscriptionId,
	}: {
		stripeSubscriptionId: string;
	}): Promise<void> {
		const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
		await subscriptionsServiceRaw.upsertFromStripeSubscription({ subscription });
	},
};

export const subscriptionsService = wrapService(
	"subscriptionsService",
	subscriptionsServiceRaw,
);
