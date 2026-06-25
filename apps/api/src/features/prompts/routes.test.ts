import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { requireEntitlement } from '@/middleware/entitlement-middleware.js';
import { UpgradeRequiredError } from '@/lib/errors/index.js';
import { errorHandler } from '@/middleware/error-middleware.js';

vi.mock('@/features/app-users/app-users.service.js', () => ({
  appUsersService: {
    findOrCreate: vi.fn(),
  },
}));

vi.mock('@/features/subscriptions/index.js', () => ({
  subscriptionsService: {
    getByAppUserId: vi.fn(),
  },
}));

vi.mock('@/features/prompts/services/service.js', () => ({
  promptsService: {
    regenerateForEntry: vi.fn(),
  },
}));

import { appUsersService } from '@/features/app-users/app-users.service.js';
import { subscriptionsService } from '@/features/subscriptions/index.js';
import { promptsService } from '@/features/prompts/services/service.js';

function createResponse() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return {
    res: {
      locals: { user: { id: 'auth-1', email: 'user@example.com' } },
      json,
      status,
    } as unknown as Response,
    json,
    status,
  };
}

describe('POST /prompts/personalized/regenerate entitlement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 402 for free users before reaching the service', async () => {
    const req = {
      body: {
        entryId: '123e4567-e89b-12d3-a456-426614174000',
      },
    } as Request;
    const { res, status, json } = createResponse();
    const next = vi.fn();

    vi.mocked(appUsersService.findOrCreate).mockResolvedValue({
      id: 'app-user-1',
      isAdmin: false,
    } as Awaited<ReturnType<typeof appUsersService.findOrCreate>>);
    vi.mocked(subscriptionsService.getByAppUserId).mockResolvedValue({
      stripeStatus: 'canceled',
    } as Awaited<ReturnType<typeof subscriptionsService.getByAppUserId>>);

    await requireEntitlement('prompts.regenerate')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0] as UpgradeRequiredError;
    expect(error).toBeInstanceOf(UpgradeRequiredError);

    errorHandler(error, req, res, vi.fn());

    expect(status).toHaveBeenCalledWith(402);
    expect(json).toHaveBeenCalledWith({
      error: 'Upgrade required',
      code: 'upgrade_required',
      feature: 'prompts.regenerate',
    });
    expect(promptsService.regenerateForEntry).not.toHaveBeenCalled();
  });

  it('allows pro users through entitlement check', async () => {
    const req = {} as Request;
    const { res } = createResponse();
    const next = vi.fn();

    vi.mocked(appUsersService.findOrCreate).mockResolvedValue({
      id: 'app-user-1',
      isAdmin: false,
    } as Awaited<ReturnType<typeof appUsersService.findOrCreate>>);
    vi.mocked(subscriptionsService.getByAppUserId).mockResolvedValue({
      stripeStatus: 'active',
    } as Awaited<ReturnType<typeof subscriptionsService.getByAppUserId>>);

    await requireEntitlement('prompts.regenerate')(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows admin users through entitlement check', async () => {
    const req = {} as Request;
    const { res } = createResponse();
    const next = vi.fn();

    vi.mocked(appUsersService.findOrCreate).mockResolvedValue({
      id: 'app-user-1',
      isAdmin: true,
    } as Awaited<ReturnType<typeof appUsersService.findOrCreate>>);

    await requireEntitlement('prompts.regenerate')(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(subscriptionsService.getByAppUserId).not.toHaveBeenCalled();
  });
});
