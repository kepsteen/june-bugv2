import { describe, expect, it } from 'vitest';
import {
  cosineSimilarity,
  getFreshnessDecayScore,
  scoreMemoryForRetrieval,
} from '../helpers/retrieval.helpers.js';
import type { UserMemory } from '../table.js';

function createMemory(overrides: Partial<UserMemory> = {}): UserMemory {
  const now = new Date('2026-01-20T10:00:00.000Z');

  return {
    id: 'memory-1',
    userId: 'user-1',
    category: 'goal',
    title: 'Ship personalized prompts',
    summary: 'Complete prompt retrieval endpoint and sidebar wiring',
    evidenceEntryId: null,
    canonicalKey: 'goal:ship-personalized-prompts',
    confidence: 0.8,
    importance: 0.85,
    firstSeenAt: now,
    lastSeenAt: now,
    status: 'active',
    source: 'entry',
    goalId: null,
    projectName: null,
    impactType: null,
    impactSummary: null,
    milestoneState: null,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    ...overrides,
  };
}

describe('memory retrieval scoring helpers', () => {
  it('scores cosine similarity higher for identical vectors', () => {
    const vec = [1, 2, 3];
    const other = [3, 2, 1];

    const selfScore = cosineSimilarity(vec, vec);
    const otherScore = cosineSimilarity(vec, other);

    expect(selfScore).toBeGreaterThan(otherScore);
  });

  it('applies freshness decay after the 30-day grace window', () => {
    const recent = getFreshnessDecayScore(new Date());
    const mid = getFreshnessDecayScore(
      new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    );
    const veryOld = getFreshnessDecayScore(
      new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    );

    expect(recent).toBe(1);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(veryOld).toBe(0);
  });

  it('boosts structured retrieval score when focus category matches', () => {
    const matching = createMemory({ category: 'goal' });
    const nonMatching = createMemory({ category: 'learning' });

    const matchingScore = scoreMemoryForRetrieval({
      memory: matching,
      focusCategory: 'goal',
    });
    const nonMatchingScore = scoreMemoryForRetrieval({
      memory: nonMatching,
      focusCategory: 'goal',
    });

    expect(matchingScore).toBeGreaterThan(nonMatchingScore);
  });
});
