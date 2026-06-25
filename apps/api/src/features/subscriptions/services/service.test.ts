import { beforeEach, describe, expect, it, vi } from 'vitest';

const customersCreateMock = vi.fn();
const checkoutSessionsCreateMock = vi.fn();
const billingPortalSessionsCreateMock = vi.fn();
const subscriptionsRetrieveMock = vi.fn();

const selectMock = vi.fn();
const fromMock = vi.fn();
const whereMock = vi.fn();
const insertMock = vi.fn();
const valuesMock = vi.fn();
const onConflictDoUpdateMock = vi.fn();

const findByStripeCustomerIdMock = vi.fn();
const setStripeCustomerIdMock = vi.fn();

vi.mock('@/lib/stripe/stripe.js', () => ({
	stripe: {
		customers: {
			create: (...args: unknown[]) => customersCreateMock(...args),
		},
		checkout: {
			sessions: {
				create: (...args: unknown[]) => checkoutSessionsCreateMock(...args),
			},
		},
		billingPortal: {
			sessions: {
				create: (...args: unknown[]) => billingPortalSessionsCreateMock(...args),
			},
		},
		subscriptions: {
			retrieve: (...args: unknown[]) => subscriptionsRetrieveMock(...args),
		},
	},
}));

vi.mock('@/lib/db/index.js', () => ({
	db: {
		select: (...args: unknown[]) => {
			selectMock(...args);
			return { from: fromMock };
		},
		insert: (...args: unknown[]) => {
			insertMock(...args);
			return {
				values: (...valueArgs: unknown[]) => {
					valuesMock(...valueArgs);
					return {
						onConflictDoUpdate: (...conflictArgs: unknown[]) =>
							onConflictDoUpdateMock(...conflictArgs),
					};
				},
			};
		},
	},
}));

vi.mock('@/features/app-users/app-users.service.js', () => ({
	appUsersService: {
		findByStripeCustomerId: (...args: unknown[]) =>
			findByStripeCustomerIdMock(...args),
		setStripeCustomerId: (...args: unknown[]) => setStripeCustomerIdMock(...args),
	},
}));

vi.mock('@/config/env.js', () => ({
	env: {
		STRIPE_PRICE_PRO: 'price_monthly',
		STRIPE_PRICE_PRO_YEARLY: 'price_yearly',
		CLIENT_URL: 'http://localhost:5174',
	},
}));

const appUser = {
	id: 'user-1',
	email: 'writer@example.com',
	stripeCustomerId: null,
};

describe('subscriptionsService', () => {
	beforeEach(() => {
		customersCreateMock.mockReset();
		checkoutSessionsCreateMock.mockReset();
		billingPortalSessionsCreateMock.mockReset();
		subscriptionsRetrieveMock.mockReset();
		selectMock.mockReset();
		fromMock.mockReset();
		whereMock.mockReset();
		insertMock.mockReset();
		valuesMock.mockReset();
		onConflictDoUpdateMock.mockReset();
		findByStripeCustomerIdMock.mockReset();
		setStripeCustomerIdMock.mockReset();

		fromMock.mockReturnValue({ where: whereMock });
		whereMock.mockResolvedValue([]);
		setStripeCustomerIdMock.mockResolvedValue({
			...appUser,
			stripeCustomerId: 'cus_new',
		});
		onConflictDoUpdateMock.mockResolvedValue(undefined);
	});

	it('creates a Stripe customer when one does not exist yet', async () => {
		customersCreateMock.mockResolvedValue({ id: 'cus_new' });

		const { subscriptionsService } = await import('../services/service.js');

		const customerId = await subscriptionsService.findOrCreateCustomer({
			appUser: appUser as never,
		});

		expect(customerId).toBe('cus_new');
		expect(customersCreateMock).toHaveBeenCalledWith({
			email: 'writer@example.com',
			metadata: { appUserId: 'user-1' },
		});
		expect(setStripeCustomerIdMock).toHaveBeenCalledWith({
			id: 'user-1',
			stripeCustomerId: 'cus_new',
		});
	});

	it('reuses an existing Stripe customer id', async () => {
		const { subscriptionsService } = await import('../services/service.js');

		const customerId = await subscriptionsService.findOrCreateCustomer({
			appUser: { ...appUser, stripeCustomerId: 'cus_existing' } as never,
		});

		expect(customerId).toBe('cus_existing');
		expect(customersCreateMock).not.toHaveBeenCalled();
	});

	it('creates a checkout session with the requested price id', async () => {
		customersCreateMock.mockResolvedValue({ id: 'cus_new' });
		checkoutSessionsCreateMock.mockResolvedValue({
			url: 'https://checkout.stripe.test/session',
		});

		const { subscriptionsService } = await import('../services/service.js');

		const result = await subscriptionsService.createCheckoutSession({
			appUser: appUser as never,
			priceId: 'price_yearly',
		});

		expect(result).toEqual({ url: 'https://checkout.stripe.test/session' });
		expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: 'subscription',
				customer: 'cus_new',
				line_items: [{ price: 'price_yearly', quantity: 1 }],
				success_url: 'http://localhost:5174/settings/billing?checkout=success',
				cancel_url: 'http://localhost:5174/settings/billing?checkout=cancelled',
			}),
		);
	});

	it('rejects portal sessions when the user has no Stripe customer', async () => {
		const { subscriptionsService } = await import('../services/service.js');

		await expect(
			subscriptionsService.createPortalSession({ appUser: appUser as never }),
		).rejects.toThrow('No Stripe customer for this user');
	});

	it('upserts subscription rows from Stripe subscription objects', async () => {
		findByStripeCustomerIdMock.mockResolvedValue({ id: 'user-1' });

		const { subscriptionsService } = await import('../services/service.js');

		await subscriptionsService.upsertFromStripeSubscription({
			subscription: {
				id: 'sub_123',
				customer: 'cus_123',
				status: 'active',
				cancel_at_period_end: false,
				cancel_at: 1_785_011_599,
				canceled_at: 1_782_419_641,
				items: {
					data: [
						{
							price: { id: 'price_monthly' },
							current_period_start: 1_700_000_000,
							current_period_end: 1_700_086_400,
						},
					],
				},
			} as never,
		});

		expect(findByStripeCustomerIdMock).toHaveBeenCalledWith({
			stripeCustomerId: 'cus_123',
		});
		expect(valuesMock).toHaveBeenCalledWith(
			expect.objectContaining({
				appUserId: 'user-1',
				stripeSubscriptionId: 'sub_123',
				stripePriceId: 'price_monthly',
				stripeStatus: 'active',
				stripeCancelAtPeriodEnd: false,
				stripeCancelAt: new Date(1_785_011_599 * 1000),
				stripeCanceledAt: new Date(1_782_419_641 * 1000),
			}),
		);
		expect(onConflictDoUpdateMock).toHaveBeenCalledOnce();
	});

	it('syncs subscriptions by Stripe subscription id', async () => {
		const stripeSubscription = {
			id: 'sub_123',
			customer: 'cus_123',
			status: 'active',
			items: {
				data: [
					{
						price: { id: 'price_monthly' },
						current_period_start: 1_700_000_000,
						current_period_end: 1_700_086_400,
					},
				],
			},
		};

		subscriptionsRetrieveMock.mockResolvedValue(stripeSubscription);
		findByStripeCustomerIdMock.mockResolvedValue({ id: 'user-1' });

		const { subscriptionsService } = await import('../services/service.js');

		await subscriptionsService.syncByStripeSubscriptionId({
			stripeSubscriptionId: 'sub_123',
		});

		expect(subscriptionsRetrieveMock).toHaveBeenCalledWith('sub_123');
		expect(onConflictDoUpdateMock).toHaveBeenCalledOnce();
	});
});
