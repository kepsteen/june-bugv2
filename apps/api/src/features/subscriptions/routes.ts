import { asyncHandler } from "@/lib/async-handler";
import { AuthMiddleware } from "@/middleware/auth-middleware";
import { validateBody } from "@/middleware/validation-middleware";
import {
	Router,
	type Request,
	type Response,
	type Router as RouterType,
} from "express";

const router: RouterType = Router();

router.post(
	"/subscriptions/create-checkout-session",
	AuthMiddleware(),
	validateBody(personalizedPromptsBodySchema),
	asyncHandler(async (req: Request, res: Response) => {
		const appUser = await getAppUser(res);
		const entryId = req.body.entryId as string;
		const focusCategory = req.body.focusCategory as
			| (typeof memoryCategoryEnum.enumValues)[number]
			| undefined;
		const entryDraft =
			typeof req.body.entryDraft === "string" ? req.body.entryDraft : undefined;

		const data = await promptsService.getOrCreateForEntry({
			userId: appUser.id,
			entryId,
			focusCategory,
			entryDraft,
		});

		res.json({ data });
	}),
);
