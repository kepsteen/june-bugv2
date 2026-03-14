import { and, desc, eq, gte, lte, sql, count, avg } from 'drizzle-orm';
import { db } from '@/lib/db/index.js';
import { wrapService } from '@/lib/service-wrapper.js';
import {
  aiUsageEvents,
  queueJobEvents,
  type NewAiUsageEvent,
  type NewQueueJobEvent,
  type AiUsageEvent,
  type QueueJobEvent,
  aiUsageStatusEnum,
  aiUsageFeatureEnum,
  queueJobStatusEnum,
  queueJobTypeEnum,
} from './observability.table.js';

// AI Usage Tracking
async function recordAiUsage(event: Omit<NewAiUsageEvent, 'id' | 'createdAt'>): Promise<AiUsageEvent> {
  const [row] = await db.insert(aiUsageEvents).values(event).returning();
  return row;
}

// Queue Job Event Tracking
async function recordQueueJobEvent(
  event: Omit<NewQueueJobEvent, 'id' | 'createdAt'>,
): Promise<QueueJobEvent> {
  const [row] = await db.insert(queueJobEvents).values(event).returning();
  return row;
}

// AI Usage Queries
async function getAiOverview(hours: number = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [totals] = await db
    .select({
      totalCalls: count(aiUsageEvents.id),
      uniqueUsers: count(sql`DISTINCT ${aiUsageEvents.userId}`),
      avgLatency: avg(aiUsageEvents.latencyMs),
    })
    .from(aiUsageEvents)
    .where(gte(aiUsageEvents.createdAt, since));

  const statusBreakdown = await db
    .select({
      status: aiUsageEvents.status,
      count: count(aiUsageEvents.id),
    })
    .from(aiUsageEvents)
    .where(gte(aiUsageEvents.createdAt, since))
    .groupBy(aiUsageEvents.status);

  const featureBreakdown = await db
    .select({
      feature: aiUsageEvents.feature,
      count: count(aiUsageEvents.id),
    })
    .from(aiUsageEvents)
    .where(gte(aiUsageEvents.createdAt, since))
    .groupBy(aiUsageEvents.feature);

  return {
    period: { hours, since: since.toISOString() },
    totals: {
      totalCalls: Number(totals?.totalCalls ?? 0),
      uniqueUsers: Number(totals?.uniqueUsers ?? 0),
      avgLatencyMs: Math.round(Number(totals?.avgLatency ?? 0)),
    },
    statusBreakdown: statusBreakdown.map((s) => ({
      status: s.status,
      count: Number(s.count),
    })),
    featureBreakdown: featureBreakdown.map((f) => ({
      feature: f.feature,
      count: Number(f.count),
    })),
  };
}

async function listAiEvents(options: {
  userId?: string;
  feature?: (typeof aiUsageFeatureEnum.enumValues)[number];
  status?: (typeof aiUsageStatusEnum.enumValues)[number];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<AiUsageEvent[]> {
  const { userId, feature, status, startDate, endDate, limit = 100, offset = 0 } = options;

  const conditions = [];
  if (userId) conditions.push(eq(aiUsageEvents.userId, userId));
  if (feature) conditions.push(eq(aiUsageEvents.feature, feature));
  if (status) conditions.push(eq(aiUsageEvents.status, status));
  if (startDate) conditions.push(gte(aiUsageEvents.createdAt, startDate));
  if (endDate) conditions.push(lte(aiUsageEvents.createdAt, endDate));

  const query = db
    .select()
    .from(aiUsageEvents)
    .orderBy(desc(aiUsageEvents.createdAt))
    .limit(limit)
    .offset(offset);

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }

  return query;
}

// Queue Job Queries
async function getQueueOverview(hours: number = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [totals] = await db
    .select({
      totalJobs: count(queueJobEvents.id),
      uniqueUsers: count(sql`DISTINCT ${queueJobEvents.userId}`),
      avgRetries: avg(queueJobEvents.retryCount),
    })
    .from(queueJobEvents)
    .where(gte(queueJobEvents.createdAt, since));

  const statusBreakdown = await db
    .select({
      status: queueJobEvents.status,
      count: count(queueJobEvents.id),
    })
    .from(queueJobEvents)
    .where(gte(queueJobEvents.createdAt, since))
    .groupBy(queueJobEvents.status);

  const outcomeBreakdown = await db
    .select({
      outcome: queueJobEvents.outcome,
      count: count(queueJobEvents.id),
    })
    .from(queueJobEvents)
    .where(and(gte(queueJobEvents.createdAt, since), sql`${queueJobEvents.outcome} IS NOT NULL`))
    .groupBy(queueJobEvents.outcome);

  return {
    period: { hours, since: since.toISOString() },
    totals: {
      totalJobs: Number(totals?.totalJobs ?? 0),
      uniqueUsers: Number(totals?.uniqueUsers ?? 0),
      avgRetries: Math.round(Number(totals?.avgRetries ?? 0) * 10) / 10,
    },
    statusBreakdown: statusBreakdown.map((s) => ({
      status: s.status,
      count: Number(s.count),
    })),
    outcomeBreakdown: outcomeBreakdown.map((o) => ({
      outcome: o.outcome,
      count: Number(o.count),
    })),
  };
}

async function listQueueJobEvents(options: {
  userId?: string;
  jobType?: (typeof queueJobTypeEnum.enumValues)[number];
  status?: (typeof queueJobStatusEnum.enumValues)[number];
  jobId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<QueueJobEvent[]> {
  const { userId, jobType, status, jobId, startDate, endDate, limit = 100, offset = 0 } = options;

  const conditions = [];
  if (userId) conditions.push(eq(queueJobEvents.userId, userId));
  if (jobType) conditions.push(eq(queueJobEvents.jobType, jobType));
  if (status) conditions.push(eq(queueJobEvents.status, status));
  if (jobId) conditions.push(eq(queueJobEvents.jobId, jobId));
  if (startDate) conditions.push(gte(queueJobEvents.createdAt, startDate));
  if (endDate) conditions.push(lte(queueJobEvents.createdAt, endDate));

  const query = db
    .select()
    .from(queueJobEvents)
    .orderBy(desc(queueJobEvents.createdAt))
    .limit(limit)
    .offset(offset);

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }

  return query;
}

const observabilityServiceRaw = {
  // Recording methods
  recordAiUsage,
  recordQueueJobEvent,

  // AI queries
  getAiOverview,
  listAiEvents,

  // Queue queries
  getQueueOverview,
  listQueueJobEvents,
};

export const observabilityService = wrapService('observabilityService', observabilityServiceRaw);
