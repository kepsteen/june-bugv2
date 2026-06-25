import { describe, expect, it } from 'vitest';
import { can, resolvePlan } from './entitlements.js';

describe('resolvePlan', () => {
  it('returns pro for active and trialing statuses', () => {
    expect(resolvePlan('active')).toBe('pro');
    expect(resolvePlan('trialing')).toBe('pro');
  });

  it('returns free for other or missing statuses', () => {
    expect(resolvePlan('canceled')).toBe('free');
    expect(resolvePlan('past_due')).toBe('free');
    expect(resolvePlan(null)).toBe('free');
    expect(resolvePlan(undefined)).toBe('free');
  });
});

describe('can', () => {
  it('allows prompts.regenerate for pro users', () => {
    expect(can('pro', 'prompts.regenerate')).toBe(true);
  });

  it('denies prompts.regenerate for free users', () => {
    expect(can('free', 'prompts.regenerate')).toBe(false);
  });

  it('allows all features for admins regardless of plan', () => {
    expect(can('free', 'prompts.regenerate', { isAdmin: true })).toBe(true);
    expect(can('pro', 'prompts.regenerate', { isAdmin: true })).toBe(true);
  });
});
