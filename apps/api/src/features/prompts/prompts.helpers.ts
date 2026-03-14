import type { MemoryCategory, PersonalizedPromptSuggestion } from '@/lib/ai/ai.service.js';
import type { EntryPrompt, NewEntryPrompt } from './prompts.table.js';

export type PromptRetrieval = {
  structuredCount: number;
  semanticCount: number;
  consideredCount: number;
};

export type StoredPersonalizedPromptsResult = {
  prompts: PersonalizedPromptSuggestion[];
  retrieval: PromptRetrieval;
};

export function mapRowsToStoredPromptsResult(rows: EntryPrompt[]): StoredPersonalizedPromptsResult {
  const firstRow = rows[0];

  return {
    prompts: rows.map((row) => ({
      prompt: row.prompt,
      rationale: row.rationale,
      anchor:
        row.anchorCategory && row.anchorMemoryTitle
          ? {
              category: row.anchorCategory,
              memoryTitle: row.anchorMemoryTitle,
            }
          : null,
    })),
    retrieval: firstRow
      ? {
          structuredCount: firstRow.retrievalStructuredCount,
          semanticCount: firstRow.retrievalSemanticCount,
          consideredCount: firstRow.retrievalConsideredCount,
        }
      : {
          structuredCount: 0,
          semanticCount: 0,
          consideredCount: 0,
        },
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
    retrievalStructuredCount: generated.retrieval.structuredCount,
    retrievalSemanticCount: generated.retrieval.semanticCount,
    retrievalConsideredCount: generated.retrieval.consideredCount,
  }));
}
