import { describe, expect, it } from 'vitest';
import {
	checkoutBodySchema,
	resolvePriceIdForCadence,
} from './helpers/billing.helpers.js';

describe('subscriptions checkout route contract', () => {
	it('validates checkout cadence before creating a session', () => {
		expect(checkoutBodySchema.parse({ cadence: 'monthly' })).toEqual({
			cadence: 'monthly',
		});
		expect(checkoutBodySchema.parse({ cadence: 'yearly' })).toEqual({
			cadence: 'yearly',
		});
		expect(() => checkoutBodySchema.parse({ cadence: 'quarterly' })).toThrow();
	});

	it('maps cadence to the configured monthly and yearly price ids', () => {
		const prices = {
			monthly: 'price_monthly',
			yearly: 'price_yearly',
		};

		expect(resolvePriceIdForCadence('monthly', prices)).toBe('price_monthly');
		expect(resolvePriceIdForCadence('yearly', prices)).toBe('price_yearly');
	});
});
