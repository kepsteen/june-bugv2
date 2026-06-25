import type { Request, Response, NextFunction } from 'express';
import { can, resolvePlan, type FeatureKey } from '@starter/shared';
import { UpgradeRequiredError } from '@/lib/errors/index.js';
import { appUsersService } from '@/features/app-users/app-users.service.js';
import { subscriptionsService } from '@/features/subscriptions/index.js';

export function requireEntitlement(feature: FeatureKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = res.locals.user;
      const appUser = await appUsersService.findOrCreate({
        authId: authUser.id,
        email: authUser.email,
      });

      if (appUser.isAdmin) {
        next();
        return;
      }

      const subscription = await subscriptionsService.getByAppUserId({
        appUserId: appUser.id,
      });
      const plan = resolvePlan(subscription?.stripeStatus);

      if (!can(plan, feature, { isAdmin: appUser.isAdmin })) {
        throw new UpgradeRequiredError(feature);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
