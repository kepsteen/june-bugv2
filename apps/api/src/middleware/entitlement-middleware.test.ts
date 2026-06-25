import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireEntitlement } from './entitlement-middleware.js';
import { UpgradeRequiredError } from '../lib/errors/index.js';

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

import { appUsersService } from '@/features/app-users/app-users.service.js';
import { subscriptionsService } from '@/features/subscriptions/index.js';

function createMocks() {
  const req = {} as Request;
  const res = {
    locals: {
      user: { id: 'auth-1', email: 'user@example.com' },
    },
  } as unknown as Response;
  const next = vi.fn();
  return { req, res, next };
}

describe('requireEntitlement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows pro users', async () => {
    const { req, res, next } = createMocks();

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

  it('allows admin users regardless of subscription', async () => {
    const { req, res, next } = createMocks();

    vi.mocked(appUsersService.findOrCreate).mockResolvedValue({
      id: 'app-user-1',
      isAdmin: true,
    } as Awaited<ReturnType<typeof appUsersService.findOrCreate>>);

    await requireEntitlement('prompts.regenerate')(req, res, next);

    expect(subscriptionsService.getByAppUserId).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it('denies free users with UpgradeRequiredError', async () => {
    const { req, res, next } = createMocks();

    vi.mocked(appUsersService.findOrCreate).mockResolvedValue({
      id: 'app-user-1',
      isAdmin: false,
    } as Awaited<ReturnType<typeof appUsersService.findOrCreate>>);
    vi.mocked(subscriptionsService.getByAppUserId).mockResolvedValue({
      stripeStatus: 'canceled',
    } as Awaited<ReturnType<typeof subscriptionsService.getByAppUserId>>);

    await requireEntitlement('prompts.regenerate')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(UpgradeRequiredError);
    expect(error.statusCode).toBe(402);
    expect(error.code).toBe('upgrade_required');
    expect(error.feature).toBe('prompts.regenerate');
  });
});
