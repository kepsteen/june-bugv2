import type { Request, Response, NextFunction } from 'express';
import { AuthMiddleware } from './auth-middleware.js';
import { env } from '@/config/env.js';
import { ForbiddenError } from '@/lib/errors/index.js';
import { appUsersService } from '@/features/app-users/app-users.service.js';

/**
 * Middleware to protect internal/admin endpoints.
 *
 * In development: allows any authenticated user
 * In production: requires app_user.isAdmin to be true
 */
export function InternalAccessMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // First, ensure user is authenticated
    try {
      const session = await (async () => {
        // Use a promise to wrap the middleware call
        return new Promise<void>((resolve, reject) => {
          AuthMiddleware()(req, res, (err: unknown) => {
            if (err) reject(err);
            else resolve();
          });
        });
      })();
    } catch (authErr) {
      return next(authErr);
    }

    // In development, allow any authenticated user
    if (env.NODE_ENV === 'development') {
      return next();
    }

    // In production, require isAdmin flag on app_user
    const authUser = res.locals.user;
    const appUser = await appUsersService.findByAuthId({ authId: authUser.id });

    if (!appUser?.isAdmin) {
      return next(new ForbiddenError('Admin access required'));
    }

    return next();
  };
}
