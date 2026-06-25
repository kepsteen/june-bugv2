import { describe, expect, it } from 'vitest';
import {
	checkoutBodySchema,
	getSubscriptionPeriodEndDate,
	getSubscriptionPeriodEndLabel,
	isActiveSubscriptionStatus,
	isSubscriptionScheduledToCancel,
	resolvePriceIdForCadence,
} from './billing.helpers.js';

describe('billing helpers', () => {
	it('defaults checkout cadence to monthly', () => {
		expect(checkoutBodySchema.parse({})).toEqual({ cadence: 'monthly' });
	});

	it('accepts monthly and yearly cadence values', () => {
		expect(checkoutBodySchema.parse({ cadence: 'yearly' })).toEqual({
			cadence: 'yearly',
		});
	});

	it('rejects invalid cadence values', () => {
		expect(() => checkoutBodySchema.parse({ cadence: 'weekly' })).toThrow();
	});

	it('resolves monthly and yearly price ids', () => {
		const prices = {
			monthly: 'price_monthly',
			yearly: 'price_yearly',
		};

		expect(resolvePriceIdForCadence('monthly', prices)).toBe('price_monthly');
		expect(resolvePriceIdForCadence('yearly', prices)).toBe('price_yearly');
	});

	it('treats active and trialing subscriptions as active', () => {
		expect(isActiveSubscriptionStatus('active')).toBe(true);
		expect(isActiveSubscriptionStatus('trialing')).toBe(true);
		expect(isActiveSubscriptionStatus('canceled')).toBe(false);
		expect(isActiveSubscriptionStatus('past_due')).toBe(false);
	});

	it('detects scheduled cancellations from cancel_at or cancel_at_period_end', () => {
		expect(
			isSubscriptionScheduledToCancel({
				stripeStatus: 'active',
				stripeCancelAtPeriodEnd: true,
				stripeCancelAt: null,
				stripeCurrentPeriodEnd: '2026-07-25T20:33:19.000Z',
			}),
		).toBe(true);
		expect(
			isSubscriptionScheduledToCancel({
				stripeStatus: 'active',
				stripeCancelAtPeriodEnd: false,
				stripeCancelAt: '2026-07-25T20:33:19.000Z',
				stripeCurrentPeriodEnd: '2026-07-25T20:33:19.000Z',
			}),
		).toBe(true);
		expect(
			isSubscriptionScheduledToCancel({
				stripeStatus: 'active',
				stripeCancelAtPeriodEnd: false,
				stripeCancelAt: null,
				stripeCurrentPeriodEnd: '2026-07-25T20:33:19.000Z',
			}),
		).toBe(false);
	});

	it('labels renewing vs ending subscriptions correctly', () => {
		const active = {
			stripeStatus: 'active',
			stripeCancelAtPeriodEnd: false,
			stripeCancelAt: null,
			stripeCurrentPeriodEnd: '2026-07-25T20:33:19.000Z',
		};

		expect(getSubscriptionPeriodEndLabel(active)).toBe('Renews on');
		expect(getSubscriptionPeriodEndDate(active).toISOString()).toBe(
			'2026-07-25T20:33:19.000Z',
		);

		const canceling = {
			...active,
			stripeCancelAt: '2026-07-25T20:33:19.000Z',
		};

		expect(getSubscriptionPeriodEndLabel(canceling)).toBe('Access until');
	});
});
