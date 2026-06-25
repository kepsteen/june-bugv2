import { z } from "zod";

export type BillingCadence = "monthly" | "yearly";

export const checkoutBodySchema = z.object({
	cadence: z.enum(["monthly", "yearly"]).default("monthly"),
});

export const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"] as const;

export type SubscriptionCancellationFields = {
	stripeStatus: string;
	stripeCancelAtPeriodEnd: boolean;
	stripeCancelAt: Date | string | null;
	stripeCurrentPeriodEnd: Date | string;
};

export function resolvePriceIdForCadence(
	cadence: BillingCadence,
	prices: { monthly: string; yearly: string },
): string {
	return cadence === "yearly" ? prices.yearly : prices.monthly;
}

export function isActiveSubscriptionStatus(status: string): boolean {
	return (ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status);
}

export function isSubscriptionScheduledToCancel(
	subscription: SubscriptionCancellationFields,
): boolean {
	return (
		subscription.stripeCancelAtPeriodEnd || subscription.stripeCancelAt != null
	);
}

export function getSubscriptionPeriodEndDate(
	subscription: SubscriptionCancellationFields,
): Date {
	if (subscription.stripeCancelAt) {
		return new Date(subscription.stripeCancelAt);
	}

	return new Date(subscription.stripeCurrentPeriodEnd);
}

export function getSubscriptionPeriodEndLabel(
	subscription: SubscriptionCancellationFields,
): "Renews on" | "Access until" {
	return isSubscriptionScheduledToCancel(subscription)
		? "Access until"
		: "Renews on";
}
