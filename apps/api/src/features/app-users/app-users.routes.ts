import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { AuthMiddleware } from '../../middleware/auth-middleware.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { appUsersService } from './app-users.service.js';

const router: RouterType = Router();

// GET /me - returns current app user (creates if not exists)
router.get('/me', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const authUser = res.locals.user;
  const appUser = await appUsersService.findOrCreate({ authId: authUser.id, email: authUser.email });
  res.json({ data: appUser });
}));

// PUT /onboarding - update onboarding data
router.put('/onboarding', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const authUser = res.locals.user;
  await appUsersService.findOrCreate({ authId: authUser.id, email: authUser.email });
  const {
    fullName,
    age,
    currentRole,
    experienceLevel,
    mentorshipStyle,
    developmentGoals,
    techStack,
    workEnvironment,
    journalingFrequency,
    customScheduleDays,
    journalingTime,
    notificationPreferences,
  } = req.body;

  const updated = await appUsersService.updateOnboarding({
    authId: authUser.id,
    data: {
      fullName,
      age,
      currentRole,
      experienceLevel,
      mentorshipStyle,
      developmentGoals,
      techStack,
      workEnvironment,
      journalingFrequency,
      customScheduleDays,
      journalingTime,
      notificationPreferences,
    },
  });

  res.json({ data: updated });
}));

// GET /onboarding/status - returns { isOnboarded, user }
router.get('/onboarding/status', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const authUser = res.locals.user;
  const status = await appUsersService.getOnboardingStatus({ authId: authUser.id });
  res.json({ data: status });
}));

export default router;
