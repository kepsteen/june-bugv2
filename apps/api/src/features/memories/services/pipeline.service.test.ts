import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/observability/observability.service.js', () => ({
  observabilityService: {
    recordAiUsage: vi.fn(),
  },
}));

vi.mock('@/lib/ai/ai.gateway.js', () => ({
  aiGateway: {
    generateObject: vi.fn(),
  },
}));

import { buildCanonicalKey } from '../helpers/pipeline.helpers.js';

describe('memory pipeline merge helpers', () => {
  it('normalizes canonical keys consistently', () => {
    const a = buildCanonicalKey('project', '  Build API v2!  ');
    const b = buildCanonicalKey('project', 'build   api-v2');

    expect(a).toBe('project:build-api-v2');
    expect(b).toBe('project:build-api-v2');
    expect(a).toBe(b);
  });

  it('returns null canonical key when fact is empty after normalization', () => {
    const canonical = buildCanonicalKey('other', '!!!');
    expect(canonical).toBeNull();
  });
});
