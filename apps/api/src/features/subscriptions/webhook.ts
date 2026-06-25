import type { Request, Response } from "express";
import { stripe } from "@/lib/stripe/stripe.js";
import { env } from "@/config/env.js";
import { subscriptionsService } from "./services/service.js";
import type Stripe from "stripe";
import { AppError } from "@/lib/errors/AppError.js";

export async function subscriptionsWebhookHandler(req: Request, res: Response) {
	const signature = req.headers["stripe-signature"] as string;

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(
			req.body,
			signature,
			env.STRIPE_WEBHOOK_SECRET,
		);
	} catch (err) {
		// Signature failed → it's not really from Stripe (or wrong secret).
		// Respond 400 so Stripe knows it failed.
		return res.status(400).send(`Webhook signature verification failed`);
	}

	try {
		switch (event.type) {
			case "checkout.session.completed": {
				const session = event.data.object as Stripe.Checkout.Session;
				if (session.subscription) {
					await subscriptionsService.syncByStripeSubscriptionId({
						stripeSubscriptionId: session.subscription as string,
					});
				}
				break;
			}

			case "customer.subscription.updated":
			case "customer.subscription.deleted": {
				const subscription = event.data.object as Stripe.Subscription;
				await subscriptionsService.upsertFromStripeSubscription({
					subscription,
				});
				break;
			}

			default:
				// Unhandled event types are fine — just acknowledge them.
				break;
		}
	} catch (err) {
		console.error(
			`[stripe webhook] handler failed for ${event.type} (${event.id})`,
			err,
		);

		const status = err instanceof AppError ? err.statusCode : 500;

		// Permanent (4xx): ack so Stripe stops retrying something that can't succeed.
		if (status >= 400 && status < 500) {
			return res.json({ received: true, handled: false });
		}

		// Transient (5xx / unknown): non-2xx so Stripe retries with backoff.
		return res.status(500).send("Webhook handler failed");
	}

	// ALWAYS 200 quickly once handled, or Stripe will retry the delivery.
	res.json({ received: true });
}
