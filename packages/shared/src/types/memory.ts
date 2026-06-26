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

export type MemoryTier = 'core' | 'working';

export type MemoryStatus = 'active' | 'stale' | 'archived';

export type MemoryOp =
  | { op: 'create'; tier: MemoryTier; category: MemoryCategory; fact: string; importance: number; reason: string }
  | { op: 'update'; id: string; fact?: string; importance?: number; reason: string }
  | { op: 'promote'; id: string; reason: string }
  | { op: 'demote'; id: string; reason: string }
  | { op: 'delete'; id: string; reason: string };

export type MemoryForPrompt = {
  category: MemoryCategory;
  title: string;
  summary: string;
  importance: number;
  confidence: number;
  status: MemoryStatus;
  tier: MemoryTier;
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
