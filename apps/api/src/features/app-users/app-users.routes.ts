import { Router, type Router as RouterType, type Request, type Response, type NextFunction } from 'express';
import { AuthMiddleware } from '../../middleware/auth-middleware.js';
import { appUsersService } from './app-users.service.js';

const router: RouterType = Router();

// GET /me - returns current app user (creates if not exists)
router.get('/me', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = res.locals.user;
    const appUser = await appUsersService.findOrCreate(authUser.id, authUser.email);
    res.json({ data: appUser });
  } catch (error) {
    next(error);
  }
});

// PUT /onboarding - update onboarding data
router.put('/onboarding', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = res.locals.user;
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

    const updated = await appUsersService.updateOnboarding(authUser.id, {
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
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

// GET /onboarding/status - returns { isOnboarded, user }
router.get('/onboarding/status', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = res.locals.user;
    const status = await appUsersService.getOnboardingStatus(authUser.id);
    res.json({ data: status });
  } catch (error) {
    next(error);
  }
});

export default router;
