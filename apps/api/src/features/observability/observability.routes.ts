import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/lib/async-handler.js';
import { validateQuery } from '@/middleware/validation-middleware.js';
import { InternalAccessMiddleware } from '@/middleware/internal-access-middleware.js';
import { observabilityService } from './observability.service.js';
import {
  queueJobTypeEnum,
  queueJobStatusEnum,
  queueJobOutcomeEnum,
  aiUsageFeatureEnum,
  aiUsageStatusEnum,
} from './observability.table.js';
const router: RouterType = Router();

// AI Overview - aggregate stats
const aiOverviewQuerySchema = z.object({
  hours: z.coerce.number().min(1).max(168).default(24),
});

router.get(
  '/ai/overview',
  InternalAccessMiddleware(),
  validateQuery(aiOverviewQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const hours = Number(req.query.hours) || 24;
    const overview = await observabilityService.getAiOverview(hours);
    res.json({ data: overview });
  }),
);

// AI Events - list recent AI usage events
const aiEventsQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  feature: z.enum(aiUsageFeatureEnum.enumValues).optional(),
  status: z.enum(aiUsageStatusEnum.enumValues).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
});

router.get(
  '/ai/events',
  InternalAccessMiddleware(),
  validateQuery(aiEventsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, feature, status, startDate, endDate, limit, offset } = req.query;

    const events = await observabilityService.listAiEvents({
      userId: typeof userId === 'string' ? userId : undefined,
      feature: feature as (typeof aiUsageFeatureEnum.enumValues)[number] | undefined,
      status: status as (typeof aiUsageStatusEnum.enumValues)[number] | undefined,
      startDate: startDate instanceof Date ? startDate : undefined,
      endDate: endDate instanceof Date ? endDate : undefined,
      limit: Number(limit) || 100,
      offset: Number(offset) || 0,
    });

    res.json({ data: events });
  }),
);

// Queue Overview - aggregate stats
const queueOverviewQuerySchema = z.object({
  hours: z.coerce.number().min(1).max(168).default(24),
});

router.get(
  '/queues/overview',
  InternalAccessMiddleware(),
  validateQuery(queueOverviewQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const hours = Number(req.query.hours) || 24;
    const overview = await observabilityService.getQueueOverview(hours);
    res.json({ data: overview });
  }),
);

const platformOverviewQuerySchema = z.object({
  hours: z.coerce.number().min(1).max(168).default(24),
});

router.get(
  '/platform/overview',
  InternalAccessMiddleware(),
  validateQuery(platformOverviewQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const hours = Number(req.query.hours) || 24;
    const overview = await observabilityService.getPlatformOverview(hours);
    res.json({ data: overview });
  }),
);

// Queue Job Events - list recent job events
const queueJobEventsQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  jobType: z.enum(queueJobTypeEnum.enumValues).optional(),
  status: z.enum(queueJobStatusEnum.enumValues).optional(),
  outcome: z.enum(queueJobOutcomeEnum.enumValues).optional(),
  jobId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
});

router.get(
  '/queues/jobs',
  InternalAccessMiddleware(),
  validateQuery(queueJobEventsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, jobType, status, outcome, jobId, startDate, endDate, limit, offset } =
      req.query;

    const events = await observabilityService.listQueueJobEvents({
      userId: typeof userId === 'string' ? userId : undefined,
      jobType: jobType as (typeof queueJobTypeEnum.enumValues)[number] | undefined,
      status: status as (typeof queueJobStatusEnum.enumValues)[number] | undefined,
      outcome: outcome as (typeof queueJobOutcomeEnum.enumValues)[number] | undefined,
      jobId: typeof jobId === 'string' ? jobId : undefined,
      startDate: startDate instanceof Date ? startDate : undefined,
      endDate: endDate instanceof Date ? endDate : undefined,
      limit: Number(limit) || 100,
      offset: Number(offset) || 0,
    });

    res.json({ data: events });
  }),
);

export default router;
