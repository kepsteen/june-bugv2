import type { Response, NextFunction } from 'express';
import type { ValidatedRequest } from '../../lib/types/express.js';
import type { UpdateUserInput } from './users.schema.js';
import { userService } from './users.service.js';

export const userController = {
  /**
   * Get current authenticated user
   */
  getCurrentUser: async (req: ValidatedRequest, res: Response, next: NextFunction) => {
    try {

      res.json({ user: res.locals.user });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update current authenticated user
   */
  updateCurrentUser: async (
    req: ValidatedRequest<UpdateUserInput>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { user } = res.locals.user;

      // Update user via service layer
      const updatedUser = await userService.update(user.id, req.body);

      res.json({ user: updatedUser });
    } catch (error) {
      next(error);
    }
  },
};
