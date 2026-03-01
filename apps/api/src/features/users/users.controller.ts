import type { Response } from 'express';
import type { ValidatedRequest } from '../../lib/types/express.js';
import type { UpdateUserInput } from './users.schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { userService } from './users.service.js';

export const userController = {
  /**
   * Get current authenticated user
   */
  getCurrentUser: asyncHandler(async (req: ValidatedRequest, res: Response) => {
    res.json({ user: res.locals.user });
  }),

  /**
   * Update current authenticated user
   */
  updateCurrentUser: asyncHandler(async (
    req: ValidatedRequest<UpdateUserInput>,
    res: Response
  ) => {
    const { user } = res.locals.user;

    // Update user via service layer
    const updatedUser = await userService.update({ id: user.id, data: req.body });

    res.json({ user: updatedUser });
  }),
};
