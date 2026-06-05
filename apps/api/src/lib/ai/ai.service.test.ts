import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fallbackDeterministicEmbedding } from '@/features/memories/memory-retrieval.helpers.js';

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

import { aiService } from './ai.service.js';

describe('aiService.embedText', () => {
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

  it('returns deterministic fallback embeddings when the gateway key is missing', async () => {
    const result = await aiService.embedText({
      text: 'Ship memory embeddings',
      userId: 'user-1',
    });

    expect(embedMock).not.toHaveBeenCalled();
    expect(result.embeddingModel).toBe('deterministic-hash-v1');
    expect(result.embedding).toEqual(fallbackDeterministicEmbedding('Ship memory embeddings'));
  });

  it('returns real embeddings and model tag when the gateway is configured', async () => {
    process.env.AI_GATEWAY_API_KEY = 'test-key';
    embedMock.mockResolvedValue({
      embedding: Array.from({ length: 1536 }, (_, index) => index / 1536),
      usage: { inputTokens: 12 },
    });

    const result = await aiService.embedText({
      text: 'Ship memory embeddings',
      userId: 'user-1',
      memoryId: 'memory-1',
    });

    expect(embedMock).toHaveBeenCalledWith({
      model: 'openai/text-embedding-3-small',
      value: 'Ship memory embeddings',
    });
    expect(result.embeddingModel).toBe('text-embedding-3-small');
    expect(result.embedding).toHaveLength(1536);
  });
});
