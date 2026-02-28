
import { UnauthorizedError } from '@/lib/errors';
import { auth } from '../features/auth/index'
import type { Request, Response, NextFunction } from 'express';

export function AuthMiddleware () {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await auth.api.getSession({ headers: req.headers });

      if (!session) {
        throw new UnauthorizedError();
      }
      res.locals.session = session;
      res.locals.user = session.user;
      next();
    } catch (error) {
      next(error)
    }
  }
}