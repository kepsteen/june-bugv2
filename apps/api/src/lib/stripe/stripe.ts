import { env } from "@/config/env.js";
import Stripe from "stripe";

const stripeSecretKey = env.STRIPE_SECRET_KEY;

export const stripe = new Stripe(stripeSecretKey, {
	apiVersion: "2026-05-27.dahlia",
});
