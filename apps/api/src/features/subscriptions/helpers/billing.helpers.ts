import { z } from "zod";
import {
	ACTIVE_SUBSCRIPTION_STATUSES,
	resolvePlan,
} from "@starter/shared";

export type BillingCadence = "monthly" | "yearly";

export const checkoutBodySchema = z.object({
	cadence: z.enum(["monthly", "yearly"]).default("monthly"),
});

export { ACTIVE_SUBSCRIPTION_STATUSES };

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
	return resolvePlan(status) === "pro";
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
