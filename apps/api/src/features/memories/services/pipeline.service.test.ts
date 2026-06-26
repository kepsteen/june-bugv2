import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/index.js', () => ({ db: {} }));
vi.mock('@/lib/ai/ai.gateway.js', () => ({ aiGateway: { generateObject: vi.fn() } }));
vi.mock('@/features/observability/observability.service.js', () => ({
  observabilityService: { recordAiUsage: vi.fn() },
}));

import { CORE_CAP, WORKING_CAP } from '../helpers/pipeline.helpers.js';

describe('curator constants', () => {
  it('core cap is 8', () => {
    expect(CORE_CAP).toBe(8);
  });

  it('working cap is 24', () => {
    expect(WORKING_CAP).toBe(24);
  });

  it('total store cap is ≤32', () => {
    expect(CORE_CAP + WORKING_CAP).toBeLessThanOrEqual(32);
  });
});
