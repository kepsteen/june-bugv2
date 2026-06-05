import { beforeEach, describe, expect, it, vi } from 'vitest';

const embedTextMock = vi.fn();

vi.mock('@/lib/ai/ai.service.js', () => ({
  aiService: {
    embedText: (...args: unknown[]) => embedTextMock(...args),
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
  beforeEach(() => {
    embedTextMock.mockReset();
    insertMock.mockClear();
    valuesMock.mockClear();
    onConflictDoUpdateMock.mockClear();
    returningMock.mockReset();
  });

  it('stores embeddings from aiService.embedText with the returned model tag', async () => {
    const embedding = Array.from({ length: 1536 }, () => 0.25);
    embedTextMock.mockResolvedValue({
      embedding,
      embeddingModel: 'text-embedding-3-small',
    });
    returningMock.mockResolvedValue([
      {
        memoryId: 'memory-1',
        embedding,
        embeddingModel: 'text-embedding-3-small',
        updatedAt: new Date('2026-06-04T00:00:00.000Z'),
      },
    ]);

    const { upsertMemoryEmbedding } = await import('./memory-embedding.helpers.js');

    const result = await upsertMemoryEmbedding({
      memoryId: 'memory-1',
      text: 'Ship memory embeddings\nComplete semantic retrieval',
      userId: 'user-1',
      entryId: 'entry-1',
    });

    expect(embedTextMock).toHaveBeenCalledWith({
      text: 'Ship memory embeddings\nComplete semantic retrieval',
      userId: 'user-1',
      entryId: 'entry-1',
      memoryId: 'memory-1',
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
