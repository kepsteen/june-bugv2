import type { MemoryCategory, PersonalizedPromptSuggestion } from '@starter/shared';
import { request } from './client';

export type { PersonalizedPromptSuggestion };

export interface PersonalizedPromptsResult {
  prompts: PersonalizedPromptSuggestion[];
  memoryCount: number;
}

export const promptsApi = {
  getPersonalized: (data: {
    payload: { entryId: string; focusCategory?: MemoryCategory; entryDraft?: string };
  }) =>
    request<{ data: PersonalizedPromptsResult }>('/api/prompts/personalized', {
      method: 'POST',
      body: JSON.stringify(data.payload),
    }),
  regeneratePersonalized: (data: {
    payload: { entryId: string; focusCategory?: MemoryCategory; entryDraft?: string };
  }) =>
    request<{ data: PersonalizedPromptsResult }>('/api/prompts/personalized/regenerate', {
      method: 'POST',
      body: JSON.stringify(data.payload),
    }),
};
