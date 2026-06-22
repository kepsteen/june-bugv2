import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { z } from 'zod';
import { AuthMiddleware } from '@/middleware/auth-middleware.js';
import { asyncHandler } from '@/lib/async-handler.js';
import { validateBody } from '@/middleware/validation-middleware.js';
import { appUsersService } from '../app-users/app-users.service.js';
import { memoryCategoryEnum } from '../memories/table.js';
import { promptsService } from './services/service.js';

const router: RouterType = Router();

const personalizedPromptsBodySchema = z.object({
  entryId: z.uuid(),
  focusCategory: z.enum(memoryCategoryEnum.enumValues).optional(),
  entryDraft: z.string().max(5000).nullish(),
});

async function getAppUser(res: Response) {
  const authUser = res.locals.user;
  return appUsersService.findOrCreate({ authId: authUser.id, email: authUser.email });
}

router.post(
  '/personalized',
  AuthMiddleware(),
  validateBody(personalizedPromptsBodySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const appUser = await getAppUser(res);
    const entryId = req.body.entryId as string;
    const focusCategory = req.body.focusCategory as
      | (typeof memoryCategoryEnum.enumValues)[number]
      | undefined;
    const entryDraft =
      typeof req.body.entryDraft === 'string' ? req.body.entryDraft : undefined;

    const data = await promptsService.getOrCreateForEntry({
      userId: appUser.id,
      entryId,
      focusCategory,
      entryDraft,
    });

    res.json({ data });
  }),
);

router.post(
  '/personalized/regenerate',
  AuthMiddleware(),
  validateBody(personalizedPromptsBodySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const appUser = await getAppUser(res);
    const entryId = req.body.entryId as string;
    const focusCategory = req.body.focusCategory as
      | (typeof memoryCategoryEnum.enumValues)[number]
      | undefined;
    const entryDraft =
      typeof req.body.entryDraft === 'string' ? req.body.entryDraft : undefined;

    const data = await promptsService.regenerateForEntry({
      userId: appUser.id,
      entryId,
      focusCategory,
      entryDraft,
    });

    res.json({ data });
  }),
);

export default router;
