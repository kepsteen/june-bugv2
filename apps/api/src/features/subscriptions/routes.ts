import { env } from "@/config/env.js";
import { asyncHandler } from "@/lib/async-handler.js";
import { AuthMiddleware } from "@/middleware/auth-middleware.js";
import { validateBody } from "@/middleware/validation-middleware.js";
import { appUsersService } from "../app-users/app-users.service.js";
import {
	checkoutBodySchema,
	resolvePriceIdForCadence,
	type BillingCadence,
} from "./helpers/billing.helpers.js";
import { subscriptionsService } from "./services/service.js";
import {
	Router,
	type Request,
	type Response,
	type Router as RouterType,
} from "express";

const router: RouterType = Router();

async function getAppUser(res: Response) {
	const authUser = res.locals.user;
	return appUsersService.findOrCreate({
		authId: authUser.id,
		email: authUser.email,
	});
}

// POST /checkout — start a subscription purchase, return the Stripe URL
router.post(
	"/checkout",
	AuthMiddleware(),
	validateBody(checkoutBodySchema),
	asyncHandler(async (req: Request, res: Response) => {
		const appUser = await getAppUser(res);
		const cadence = req.body.cadence as BillingCadence;
		const priceId = resolvePriceIdForCadence(cadence, {
			monthly: env.STRIPE_PRICE_PRO,
			yearly: env.STRIPE_PRICE_PRO_YEARLY,
		});
		const result = await subscriptionsService.createCheckoutSession({
			appUser,
			priceId,
		});
		return res.json({ data: result.url });
	}),
);

// POST /portal — open the Stripe billing portal, return the URL
router.post(
	"/portal",
	AuthMiddleware(),
	asyncHandler(async (req: Request, res: Response) => {
		const appUser = await getAppUser(res);
		const result = await subscriptionsService.createPortalSession({ appUser });
		res.json({ data: result.url });
	}),
);

// GET /me — current subscription state for this user
router.get(
	"/me",
	AuthMiddleware(),
	asyncHandler(async (req: Request, res: Response) => {
		const appUser = await getAppUser(res);
		const result = await subscriptionsService.getByAppUserId({
			appUserId: appUser.id,
		});
		res.json({ data: result });
	}),
);

export default router;
