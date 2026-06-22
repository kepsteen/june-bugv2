import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { z } from 'zod';
import { AuthMiddleware } from '@/middleware/auth-middleware.js';
import { asyncHandler } from '@/lib/async-handler.js';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '@/middleware/validation-middleware.js';
import { appUsersService } from '../app-users/app-users.service.js';
import {
  memoryCategoryEnum,
  memoryStatusEnum,
} from './table.js';
import { memoriesService } from './services/service.js';

const router: RouterType = Router();

const listMemoriesQuerySchema = z.object({
  category: z.enum(memoryCategoryEnum.enumValues).optional(),
  status: z.enum(memoryStatusEnum.enumValues).optional(),
});

const refreshMemoriesBodySchema = z.object({
  reason: z.enum(['manual', 'backfill', 'debug']).default('manual'),
});

const memoryParamsSchema = z.object({
  id: z.uuid(),
});

async function getAppUser(res: Response) {
  const authUser = res.locals.user;
  return appUsersService.findOrCreate({ authId: authUser.id, email: authUser.email });
}

router.get(
  '/',
  AuthMiddleware(),
  validateQuery(listMemoriesQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const appUser = await getAppUser(res);
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const data = await memoriesService.list({
      userId: appUser.id,
      category: category as (typeof memoryCategoryEnum.enumValues)[number] | undefined,
      status: status as (typeof memoryStatusEnum.enumValues)[number] | undefined,
    });

    res.json({ data });
  }),
);

router.post(
  '/refresh',
  AuthMiddleware(),
  validateBody(refreshMemoriesBodySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const appUser = await getAppUser(res);
    const reason = req.body.reason as 'manual' | 'backfill' | 'debug';
    const data = await memoriesService.enqueueRefresh({ userId: appUser.id, reason });

    res.status(202).json({ data });
  }),
);

router.delete(
  '/',
  AuthMiddleware(),
  validateQuery(listMemoriesQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const appUser = await getAppUser(res);
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    await memoriesService.deleteMany({
      userId: appUser.id,
      category: category as (typeof memoryCategoryEnum.enumValues)[number] | undefined,
      status: status as (typeof memoryStatusEnum.enumValues)[number] | undefined,
    });

    res.status(204).send();
  }),
);

router.delete(
  '/:id',
  AuthMiddleware(),
  validateParams(memoryParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const appUser = await getAppUser(res);
    await memoriesService.delete({ id: req.params.id, userId: appUser.id });
    res.status(204).send();
  }),
);

export default router;
