import { beforeEach, describe, expect, it, vi } from 'vitest';

const whereMock = vi.fn();
const deleteMock = vi.fn(() => ({ where: whereMock }));

vi.mock('@/lib/db/index.js', () => ({
  db: {
    delete: () => deleteMock(),
  },
}));

describe('memoriesService.deleteMany', () => {
  beforeEach(() => {
    deleteMock.mockClear();
    whereMock.mockReset();
    whereMock.mockResolvedValue(undefined);
  });

  it('deletes all memories for a user when no filters are provided', async () => {
    const { memoriesService } = await import('./service.js');

    await memoriesService.deleteMany({ userId: 'user-1' });

    expect(deleteMock).toHaveBeenCalledOnce();
    expect(whereMock).toHaveBeenCalledOnce();
  });

  it('scopes deleteMany to the requesting user and optional filters', async () => {
    const { memoriesService } = await import('./service.js');

    await memoriesService.deleteMany({
      userId: 'user-1',
      category: 'goal',
      status: 'active',
    });

    expect(deleteMock).toHaveBeenCalledOnce();
    expect(whereMock).toHaveBeenCalledOnce();
  });

  it('does not accept another user id in the delete payload', async () => {
    const { memoriesService } = await import('./service.js');

    await memoriesService.deleteMany({ userId: 'user-2', category: 'blocker' });

    expect(deleteMock).toHaveBeenCalledOnce();
    expect(whereMock).toHaveBeenCalledOnce();
  });
});
