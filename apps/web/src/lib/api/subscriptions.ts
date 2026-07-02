import { resolvePlan } from '@starter/shared';
import { request } from './client';

export type BillingCycle = 'monthly' | 'yearly';

export interface Subscription {
  id: string;
  appUserId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  stripeCurrentPeriodStart: string;
  stripeCurrentPeriodEnd: string;
  stripeStatus: string;
  stripeCancelAtPeriodEnd: boolean;
  stripeCancelAt: string | null;
  stripeCanceledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function isActiveSubscription(
  subscription: Subscription | null | undefined,
): boolean {
  if (!subscription) return false;
  return resolvePlan(subscription.stripeStatus) === 'pro';
}

export function isSubscriptionScheduledToCancel(
  subscription: Subscription | null | undefined,
): boolean {
  if (!subscription) return false;
  return (
    subscription.stripeCancelAtPeriodEnd || subscription.stripeCancelAt != null
  );
}

export function getSubscriptionPeriodEndLabel(
  subscription: Subscription,
): 'Renews on' | 'Access until' {
  return isSubscriptionScheduledToCancel(subscription)
    ? 'Access until'
    : 'Renews on';
}

export function getSubscriptionPeriodEndDate(subscription: Subscription): Date {
  if (subscription.stripeCancelAt) {
    return new Date(subscription.stripeCancelAt);
  }

  return new Date(subscription.stripeCurrentPeriodEnd);
}

export const subscriptionsApi = {
  getMe: () => request<{ data: Subscription | null }>('/api/subscriptions/me'),
  createCheckout: (data: { cadence: BillingCycle }) =>
    request<{ data: string }>('/api/subscriptions/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createPortal: () =>
    request<{ data: string }>('/api/subscriptions/portal', {
      method: 'POST',
    }),
};
