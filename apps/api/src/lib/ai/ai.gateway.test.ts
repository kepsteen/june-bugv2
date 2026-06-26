import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const embedMock = vi.fn();

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    embed: (...args: unknown[]) => embedMock(...args),
  };
});

vi.mock('@/features/observability/observability.service.js', () => ({
  observabilityService: {
    recordAiUsage: vi.fn(),
  },
}));

vi.mock('@/lib/db/index.js', () => ({
  db: {
    insert: vi.fn(),
  },
}));

import { aiGateway } from './ai.gateway.js';

describe('aiGateway.embed', () => {
  const originalGatewayKey = process.env.AI_GATEWAY_API_KEY;

  beforeEach(() => {
    embedMock.mockReset();
    delete process.env.AI_GATEWAY_API_KEY;
  });

  afterEach(() => {
    if (originalGatewayKey === undefined) {
      delete process.env.AI_GATEWAY_API_KEY;
    } else {
      process.env.AI_GATEWAY_API_KEY = originalGatewayKey;
    }
  });

  it('throws when the gateway key is missing', async () => {
    await expect(
      aiGateway.embed({
        model: 'openai/text-embedding-3-small',
        text: 'Ship memory embeddings',
        userId: 'user-1',
        feature: 'memory_embedding',
      }),
    ).rejects.toThrow('AI gateway API key not configured');

    expect(embedMock).not.toHaveBeenCalled();
  });

  it('returns real embeddings when the gateway is configured', async () => {
    process.env.AI_GATEWAY_API_KEY = 'test-key';
    embedMock.mockResolvedValue({
      embedding: Array.from({ length: 1536 }, (_, index) => index / 1536),
      usage: { inputTokens: 12 },
    });

    const result = await aiGateway.embed({
      model: 'openai/text-embedding-3-small',
      text: 'Ship memory embeddings',
      userId: 'user-1',
      feature: 'memory_embedding',
      requestContext: { memoryId: 'memory-1' },
    });

    expect(embedMock).toHaveBeenCalledWith({
      model: 'openai/text-embedding-3-small',
      value: 'Ship memory embeddings',
    });
    expect(result.embedding).toHaveLength(1536);
  });
});

