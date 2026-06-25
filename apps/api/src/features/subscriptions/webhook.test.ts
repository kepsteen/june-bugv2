import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

const constructEventMock = vi.fn();
const syncByStripeSubscriptionIdMock = vi.fn();
const upsertFromStripeSubscriptionMock = vi.fn();

vi.mock('@/lib/stripe/stripe.js', () => ({
	stripe: {
		webhooks: {
			constructEvent: (...args: unknown[]) => constructEventMock(...args),
		},
	},
}));

vi.mock('@/config/env.js', () => ({
	env: {
		STRIPE_WEBHOOK_SECRET: 'whsec_test',
	},
}));

vi.mock('./services/service.js', () => ({
	subscriptionsService: {
		syncByStripeSubscriptionId: (...args: unknown[]) =>
			syncByStripeSubscriptionIdMock(...args),
		upsertFromStripeSubscription: (...args: unknown[]) =>
			upsertFromStripeSubscriptionMock(...args),
	},
}));

function createResponse() {
	const res = {
		statusCode: 200,
		body: undefined as unknown,
		status(code: number) {
			this.statusCode = code;
			return this;
		},
		send(payload: unknown) {
			this.body = payload;
			return this;
		},
		json(payload: unknown) {
			this.body = payload;
			return this;
		},
	} as Response & { statusCode: number; body: unknown };

	return res;
}

describe('subscriptionsWebhookHandler', () => {
	beforeEach(() => {
		constructEventMock.mockReset();
		syncByStripeSubscriptionIdMock.mockReset();
		upsertFromStripeSubscriptionMock.mockReset();
		syncByStripeSubscriptionIdMock.mockResolvedValue(undefined);
		upsertFromStripeSubscriptionMock.mockResolvedValue(undefined);
	});

	it('returns 400 when webhook signature verification fails', async () => {
		constructEventMock.mockImplementation(() => {
			throw new Error('bad signature');
		});

		const { subscriptionsWebhookHandler } = await import('./webhook.js');
		const req = {
			body: Buffer.from('{}'),
			headers: { 'stripe-signature': 'sig_test' },
		} as Request;
		const res = createResponse();

		await subscriptionsWebhookHandler(req, res);

		expect(res.statusCode).toBe(400);
		expect(res.body).toContain('Webhook signature verification failed');
	});

	it('syncs subscriptions on checkout.session.completed', async () => {
		constructEventMock.mockReturnValue({
			id: 'evt_1',
			type: 'checkout.session.completed',
			data: {
				object: {
					subscription: 'sub_123',
				},
			},
		});

		const { subscriptionsWebhookHandler } = await import('./webhook.js');
		const req = {
			body: Buffer.from('{}'),
			headers: { 'stripe-signature': 'sig_test' },
		} as Request;
		const res = createResponse();

		await subscriptionsWebhookHandler(req, res);

		expect(syncByStripeSubscriptionIdMock).toHaveBeenCalledWith({
			stripeSubscriptionId: 'sub_123',
		});
		expect(res.body).toEqual({ received: true });
	});

	it('upserts subscriptions on customer.subscription.updated', async () => {
		const subscription = { id: 'sub_123', status: 'active' };
		constructEventMock.mockReturnValue({
			id: 'evt_2',
			type: 'customer.subscription.updated',
			data: { object: subscription },
		});

		const { subscriptionsWebhookHandler } = await import('./webhook.js');
		const req = {
			body: Buffer.from('{}'),
			headers: { 'stripe-signature': 'sig_test' },
		} as Request;
		const res = createResponse();

		await subscriptionsWebhookHandler(req, res);

		expect(upsertFromStripeSubscriptionMock).toHaveBeenCalledWith({
			subscription,
		});
		expect(res.body).toEqual({ received: true });
	});

	it('upserts subscriptions on customer.subscription.deleted', async () => {
		const subscription = { id: 'sub_123', status: 'canceled' };
		constructEventMock.mockReturnValue({
			id: 'evt_3',
			type: 'customer.subscription.deleted',
			data: { object: subscription },
		});

		const { subscriptionsWebhookHandler } = await import('./webhook.js');
		const req = {
			body: Buffer.from('{}'),
			headers: { 'stripe-signature': 'sig_test' },
		} as Request;
		const res = createResponse();

		await subscriptionsWebhookHandler(req, res);

		expect(upsertFromStripeSubscriptionMock).toHaveBeenCalledWith({
			subscription,
		});
	});

	it('acks permanent handler failures with handled false', async () => {
		const { AppError } = await import('@/lib/errors/AppError.js');

		constructEventMock.mockReturnValue({
			id: 'evt_4',
			type: 'customer.subscription.updated',
			data: { object: { id: 'sub_missing' } },
		});
		upsertFromStripeSubscriptionMock.mockRejectedValue(
			new AppError('No app user for Stripe customer cus_missing', 404),
		);

		const { subscriptionsWebhookHandler } = await import('./webhook.js');
		const req = {
			body: Buffer.from('{}'),
			headers: { 'stripe-signature': 'sig_test' },
		} as Request;
		const res = createResponse();

		await subscriptionsWebhookHandler(req, res);

		expect(res.body).toEqual({ received: true, handled: false });
	});
});
