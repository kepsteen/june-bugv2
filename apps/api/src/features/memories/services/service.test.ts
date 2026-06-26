import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/observability/observability.service.js', () => ({
  observabilityService: { recordAiUsage: vi.fn() },
}));

vi.mock('@/lib/ai/ai.gateway.js', () => ({
  aiGateway: { generateObject: vi.fn() },
}));

describe('memories service', () => {
  it('placeholder — curator integration tests cover core behaviour', () => {
    expect(true).toBe(true);
  });
});
