import { describe, expect, it } from 'vitest';
import { buildInsertValues, mapRowsToStoredPromptsResult } from './prompts.helpers.js';
import type { EntryPrompt } from './prompts.table.js';

describe('prompts service persistence helpers', () => {
  it('maps stored prompt rows back into API result shape', () => {
    const now = new Date('2026-03-14T00:00:00.000Z');
    const rows: EntryPrompt[] = [
      {
        id: 'prompt-1',
        userId: 'user-1',
        entryId: 'entry-1',
        focusCategory: 'goal',
        prompt: 'What concrete next step moved my current goal forward today?',
        rationale: 'Anchored to the user goal memory.',
        anchorCategory: 'goal',
        anchorMemoryTitle: 'Ship prompt persistence',
        sortOrder: 0,
        retrievalStructuredCount: 5,
        retrievalSemanticCount: 3,
        retrievalConsideredCount: 6,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prompt-2',
        userId: 'user-1',
        entryId: 'entry-1',
        focusCategory: 'goal',
        prompt: 'What evidence shows I made measurable progress?',
        rationale: 'Bias toward concrete outcomes.',
        anchorCategory: null,
        anchorMemoryTitle: null,
        sortOrder: 1,
        retrievalStructuredCount: 5,
        retrievalSemanticCount: 3,
        retrievalConsideredCount: 6,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const result = mapRowsToStoredPromptsResult(rows);

    expect(result.retrieval).toEqual({
      structuredCount: 5,
      semanticCount: 3,
      consideredCount: 6,
    });
    expect(result.prompts).toEqual([
      {
        prompt: 'What concrete next step moved my current goal forward today?',
        rationale: 'Anchored to the user goal memory.',
        anchor: {
          category: 'goal',
          memoryTitle: 'Ship prompt persistence',
        },
      },
      {
        prompt: 'What evidence shows I made measurable progress?',
        rationale: 'Bias toward concrete outcomes.',
        anchor: null,
      },
    ]);
  });

  it('builds insert rows with stable ordering and retrieval metadata', () => {
    const generated = {
      prompts: [
        {
          prompt: 'What blocker can I make smaller today?',
          rationale: 'Keeps attention on unblockers.',
          anchor: {
            category: 'blocker' as const,
            memoryTitle: 'OAuth callback issue',
          },
        },
        {
          prompt: 'What did I learn that will help tomorrow?',
          rationale: 'Captures reusable insight.',
          anchor: null,
        },
      ],
      retrieval: {
        structuredCount: 7,
        semanticCount: 4,
        consideredCount: 8,
      },
    };

    const rows = buildInsertValues({
      generated,
      userId: 'user-1',
      entryId: 'entry-1',
      focusCategory: 'blocker',
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      userId: 'user-1',
      entryId: 'entry-1',
      focusCategory: 'blocker',
      sortOrder: 0,
      anchorCategory: 'blocker',
      anchorMemoryTitle: 'OAuth callback issue',
      retrievalStructuredCount: 7,
      retrievalSemanticCount: 4,
      retrievalConsideredCount: 8,
    });
    expect(rows[1]).toMatchObject({
      sortOrder: 1,
      anchorCategory: null,
      anchorMemoryTitle: null,
    });
  });
});
