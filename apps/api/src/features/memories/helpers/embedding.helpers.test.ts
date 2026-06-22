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

const returningMock = vi.fn();
const onConflictDoUpdateMock = vi.fn(() => ({ returning: returningMock }));
const valuesMock = vi.fn(() => ({ onConflictDoUpdate: onConflictDoUpdateMock }));
const insertMock = vi.fn(() => ({ values: valuesMock }));

vi.mock('@/lib/db/index.js', () => ({
  db: {
    insert: () => insertMock(),
  },
}));

describe('upsertMemoryEmbedding', () => {
  const originalGatewayKey = process.env.AI_GATEWAY_API_KEY;

  beforeEach(() => {
    embedMock.mockReset();
    insertMock.mockClear();
    valuesMock.mockClear();
    onConflictDoUpdateMock.mockClear();
    returningMock.mockReset();
    process.env.AI_GATEWAY_API_KEY = 'test-key';
  });

  afterEach(() => {
    if (originalGatewayKey === undefined) {
      delete process.env.AI_GATEWAY_API_KEY;
    } else {
      process.env.AI_GATEWAY_API_KEY = originalGatewayKey;
    }
  });

  it('stores embeddings from embedMemoryText with the returned model tag', async () => {
    const embedding = Array.from({ length: 1536 }, () => 0.25);
    embedMock.mockResolvedValue({
      embedding,
      usage: { inputTokens: 12 },
    });
    returningMock.mockResolvedValue([
      {
        memoryId: 'memory-1',
        embedding,
        embeddingModel: 'text-embedding-3-small',
        updatedAt: new Date('2026-06-04T00:00:00.000Z'),
      },
    ]);

    const { upsertMemoryEmbedding } = await import('./embedding.helpers.js');

    const result = await upsertMemoryEmbedding({
      memoryId: 'memory-1',
      text: 'Ship memory embeddings\nComplete semantic retrieval',
      userId: 'user-1',
      entryId: 'entry-1',
    });

    expect(embedMock).toHaveBeenCalledWith({
      model: 'openai/text-embedding-3-small',
      value: 'Ship memory embeddings\nComplete semantic retrieval',
    });
    expect(valuesMock).toHaveBeenCalledWith({
      memoryId: 'memory-1',
      embedding,
      embeddingModel: 'text-embedding-3-small',
      updatedAt: expect.any(Date),
    });
    expect(result.embeddingModel).toBe('text-embedding-3-small');
  });
});
