import type { MemoryCategory, PersonalizedPromptSuggestion } from '@starter/shared';
import type { EntryPrompt, NewEntryPrompt } from '../table.js';

export type StoredPersonalizedPromptsResult = {
  prompts: PersonalizedPromptSuggestion[];
  memoryCount: number;
};

export function mapRowsToStoredPromptsResult(rows: EntryPrompt[]): StoredPersonalizedPromptsResult {
  const firstRow = rows[0];

  return {
    prompts: rows.map((row) => ({
      prompt: row.prompt,
      rationale: row.rationale,
      anchor:
        row.anchorCategory && row.anchorMemoryTitle
          ? { category: row.anchorCategory, memoryTitle: row.anchorMemoryTitle }
          : null,
    })),
    memoryCount: firstRow?.retrievalConsideredCount ?? 0,
  };
}

export function buildInsertValues({
  generated,
  userId,
  entryId,
  focusCategory,
}: {
  generated: StoredPersonalizedPromptsResult;
  userId: string;
  entryId: string;
  focusCategory?: MemoryCategory;
}): NewEntryPrompt[] {
  return generated.prompts.map((prompt, index) => ({
    userId,
    entryId,
    focusCategory: focusCategory ?? null,
    prompt: prompt.prompt,
    rationale: prompt.rationale,
    anchorCategory: prompt.anchor?.category ?? null,
    anchorMemoryTitle: prompt.anchor?.memoryTitle ?? null,
    sortOrder: index,
    retrievalStructuredCount: 0,
    retrievalSemanticCount: 0,
    retrievalConsideredCount: generated.memoryCount,
  }));
}
