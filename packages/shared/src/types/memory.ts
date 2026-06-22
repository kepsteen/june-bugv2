export const MEMORY_CATEGORIES = [
  'goal',
  'project',
  'milestone',
  'blocker',
  'win',
  'learning',
  'skill_growth',
  'preference',
  'habit',
  'relationship',
  'value',
  'other',
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export const MEMORY_OPERATIONS = ['create', 'update', 'archive_hint'] as const;

export type MemoryOperation = (typeof MEMORY_OPERATIONS)[number];

export type MemoryStatus = 'active' | 'stale' | 'archived';

export type ExtractedMemoryCandidate = {
  category: MemoryCategory;
  fact: string;
  confidence: number;
  evidenceSpan: string | null;
  operation: MemoryOperation;
};

export type MemoryForPrompt = {
  category: MemoryCategory;
  title: string;
  summary: string;
  importance: number;
  confidence: number;
  status: MemoryStatus;
  projectName?: string | null;
  milestoneState?: 'planned' | 'in_progress' | 'completed' | 'blocked' | null;
};

export type PersonalizedPromptSuggestion = {
  prompt: string;
  rationale: string;
  anchor: {
    category: MemoryCategory;
    memoryTitle: string;
  } | null;
};
