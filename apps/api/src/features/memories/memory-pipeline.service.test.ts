import { describe, expect, it } from 'vitest';
import {
  buildCanonicalKey,
  inferCandidatesFromText,
} from './memory-pipeline.helpers.js';

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

  it('extracts explicit categorized candidates from entry text', () => {
    const text = [
      'goal: Ship memory system this sprint',
      'win: Merged queue consumer PR',
      'learning: Better retry strategies',
    ].join('\n');

    const candidates = inferCandidatesFromText(text);

    expect(candidates).toHaveLength(3);
    expect(candidates.map((candidate) => candidate.category)).toEqual([
      'goal',
      'win',
      'learning',
    ]);
    expect(candidates.every((candidate) => candidate.operation === 'create')).toBe(true);
  });

  it('falls back to blocker/win inference for unstructured text', () => {
    const text = 'I was blocked on auth callbacks this morning, then shipped a fix after lunch.';
    const candidates = inferCandidatesFromText(text);

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.some((candidate) => candidate.category === 'blocker')).toBe(true);
    expect(candidates.some((candidate) => candidate.category === 'win')).toBe(true);
  });
});
