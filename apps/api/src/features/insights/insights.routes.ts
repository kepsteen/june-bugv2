import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { AuthMiddleware } from '../../middleware/auth-middleware.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { insightsService } from './insights.service.js';
import { appUsersService } from '../app-users/app-users.service.js';

const router: RouterType = Router({ mergeParams: true });

// Helper: get or create app user from Better Auth session
async function getAppUser(res: Response) {
  const authUser = res.locals.user;
  return appUsersService.findOrCreate({ authId: authUser.id, email: authUser.email });
}

// GET /prompts - get cached personalized prompts
router.get(
  '/prompts',
  AuthMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const appUser = await getAppUser(res);
    const prompts = await insightsService.getPersonalizedPrompts(appUser.id);
    res.json({ data: prompts });
  })
);

// POST /refresh - manually trigger insights refresh
router.post(
  '/refresh',
  AuthMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const appUser = await getAppUser(res);
    await insightsService.refreshInsights(appUser.id);
    const prompts = await insightsService.getPersonalizedPrompts(appUser.id);
    res.json({ data: prompts });
  })
);

// GET /memories - get all active memories (for future management UI)
router.get(
  '/memories',
  AuthMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const appUser = await getAppUser(res);
    const memories = await insightsService.getMemories(appUser.id);
    res.json({ data: memories });
  })
);

export default router;
