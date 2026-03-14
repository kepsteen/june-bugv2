import { generateText, Output } from 'ai';
import { wrapService } from '@/lib/service-wrapper.js';
import { AppError } from '@/lib/errors/index.js';
import z from 'zod';

const memoryCategorySchema = z.enum([
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
]);

const memoryOperationSchema = z.enum(['create', 'update', 'archive_hint']);

const extractedMemoryCandidateSchema = z.object({
  category: memoryCategorySchema,
  fact: z.string().min(1).max(280),
  confidence: z.number().min(0).max(1),
  evidenceSpan: z.string().min(1).max(240).optional(),
  operation: memoryOperationSchema,
});

const personalizedPromptSchema = z.object({
  prompt: z.string().min(1).max(220),
  rationale: z.string().min(1).max(180),
  anchor: z
    .object({
      category: memoryCategorySchema,
      memoryTitle: z.string().min(1).max(120),
    })
    .nullable(),
});

export type MemoryCategory = z.infer<typeof memoryCategorySchema>;
export type MemoryOperation = z.infer<typeof memoryOperationSchema>;
export type ExtractedMemoryCandidate = z.infer<typeof extractedMemoryCandidateSchema>;
export type MemoryForPrompt = {
  category: MemoryCategory;
  title: string;
  summary: string;
  importance: number;
  confidence: number;
  status: 'active' | 'stale' | 'archived';
  projectName?: string | null;
  milestoneState?: 'planned' | 'in_progress' | 'completed' | 'blocked' | null;
};
export type PersonalizedPromptSuggestion = z.infer<typeof personalizedPromptSchema>;

function normalizeForKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 100);
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function hasAiGatewayKey() {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim());
}

function heuristicExtractMemories(entryText: string, maxCandidates: number): ExtractedMemoryCandidate[] {
  const lines = entryText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const explicit: ExtractedMemoryCandidate[] = [];
  const memoryLinePattern =
    /^(goal|project|milestone|blocker|win|learning|skill_growth|preference|habit|relationship|value|other)\s*[:\-]\s*(.+)$/i;

  for (const line of lines) {
    const match = line.match(memoryLinePattern);
    if (!match) continue;
    const category = match[1].toLowerCase() as MemoryCategory;
    const fact = match[2].trim().slice(0, 280);
    if (!fact) continue;
    explicit.push({
      category,
      fact,
      confidence: 0.7,
      evidenceSpan: line.slice(0, 240),
      operation: 'create',
    });
  }

  if (explicit.length > 0) return explicit.slice(0, maxCandidates);

  const normalized = entryText.toLowerCase();
  const firstSentence = entryText
    .split(/[.!?]/)
    .map((part) => part.trim())
    .find(Boolean);
  const fallback: ExtractedMemoryCandidate[] = [];

  if (normalized.includes('blocked') || normalized.includes('stuck')) {
    fallback.push({
      category: 'blocker',
      fact: (firstSentence ?? 'Current blocker noted in latest entry').slice(0, 280),
      confidence: 0.55,
      evidenceSpan: firstSentence?.slice(0, 240),
      operation: 'create',
    });
  }

  if (
    normalized.includes('shipped') ||
    normalized.includes('released') ||
    normalized.includes('launched') ||
    normalized.includes('deployed') ||
    normalized.includes('merged')
  ) {
    fallback.push({
      category: 'win',
      fact: (firstSentence ?? 'Recent shipped work noted in latest entry').slice(0, 280),
      confidence: 0.6,
      evidenceSpan: firstSentence?.slice(0, 240),
      operation: 'create',
    });
  }

  if (fallback.length === 0 && firstSentence) {
    fallback.push({
      category: 'other',
      fact: firstSentence.slice(0, 280),
      confidence: 0.45,
      evidenceSpan: firstSentence.slice(0, 240),
      operation: 'create',
    });
  }

  return fallback.slice(0, maxCandidates);
}

function finalizeCandidates(
  candidates: ExtractedMemoryCandidate[],
  maxCandidates: number,
): ExtractedMemoryCandidate[] {
  const deduped = new Map<string, ExtractedMemoryCandidate>();
  for (const candidate of candidates) {
    const fact = candidate.fact.trim().slice(0, 280);
    if (!fact) continue;
    const normalizedKey = `${candidate.category}:${normalizeForKey(fact)}`;
    if (!normalizedKey.endsWith(':')) {
      const existing = deduped.get(normalizedKey);
      if (!existing || existing.confidence < candidate.confidence) {
        deduped.set(normalizedKey, {
          ...candidate,
          fact,
          confidence: clamp(candidate.confidence),
          evidenceSpan: candidate.evidenceSpan?.trim().slice(0, 240) || undefined,
        });
      }
    }
  }

  return [...deduped.values()]
    .filter((candidate) => candidate.confidence >= 0.45)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxCandidates);
}

function fallbackPrompts({
  memories,
  focusCategory,
  entryDraft,
  maxPrompts,
}: {
  memories: MemoryForPrompt[];
  focusCategory?: MemoryCategory;
  entryDraft?: string;
  maxPrompts: number;
}): PersonalizedPromptSuggestion[] {
  const active = memories.filter((memory) => memory.status === 'active');
  const sorted = [...active].sort((a, b) => {
    const scoreA = clamp(a.importance) * 0.6 + clamp(a.confidence) * 0.4;
    const scoreB = clamp(b.importance) * 0.6 + clamp(b.confidence) * 0.4;
    return scoreB - scoreA;
  });

  const focused = focusCategory
    ? sorted.filter((memory) => memory.category === focusCategory)
    : sorted;
  const goalOrProject = sorted.find((memory) => memory.category === 'goal' || memory.category === 'project');
  const seedMemories = [...focused];
  if (goalOrProject && !seedMemories.some((memory) => memory.title === goalOrProject.title)) {
    seedMemories.unshift(goalOrProject);
  }

  const prompts: PersonalizedPromptSuggestion[] = seedMemories.slice(0, maxPrompts).map((memory) => ({
    prompt: `What concrete next step moved "${memory.title}" forward today?`,
    rationale: 'Chosen from active high-signal memory to reinforce measurable progress.',
    anchor: { category: memory.category, memoryTitle: memory.title.slice(0, 120) },
  }));

  if (entryDraft?.trim()) {
    prompts.unshift({
      prompt: 'What in this draft should become a reusable memory for future planning?',
      rationale: 'Uses current draft context to extract durable signal.',
      anchor: null,
    });
  }

  const unique = new Map<string, PersonalizedPromptSuggestion>();
  for (const prompt of prompts) unique.set(prompt.prompt, prompt);

  return [...unique.values()].slice(0, maxPrompts);
}

const aiServiceRaw = {
  async generateTitle({ content }: { content: string }): Promise<string> {
    if (!content?.trim()) {
      throw new AppError('Content is required for title generation', 400);
    }

    if (!process.env.AI_GATEWAY_API_KEY) {
      throw new AppError('OpenAI API key not configured', 500);
    }

    const { text } = await generateText({
      model: 'openai/gpt-4o-mini',
      output: Output.object({
        schema: z.object({
          title: z.string()
            .max(50)
            .refine(
              (val) => !val.includes('"') && !val.includes("'"),
              { message: "Title must not contain quotes" }
            ),
        }),
      }),
      prompt: `Generate a concise title (max 50 chars, do not use quotes) for this journal entry:\n\n${content}`,
    });
    const textJSON = JSON.parse(text);
    return textJSON.title;
  },

  async extractMemoriesFromEntry({
    entryText,
    existingMemories = [],
    maxCandidates = 8,
  }: {
    entryText: string;
    existingMemories?: Array<Pick<MemoryForPrompt, 'category' | 'title' | 'summary'>>;
    maxCandidates?: number;
  }): Promise<ExtractedMemoryCandidate[]> {
    if (!entryText?.trim()) return [];

    const safeMax = Math.max(1, Math.min(maxCandidates, 12));
    if (!hasAiGatewayKey()) {
      return finalizeCandidates(heuristicExtractMemories(entryText, safeMax), safeMax);
    }

    const existingContext = existingMemories
      .slice(0, 30)
      .map((memory) => `- [${memory.category}] ${memory.title}: ${memory.summary}`)
      .join('\n');

    const prompt = [
      'You extract durable developer memory facts from a journal entry.',
      'Return JSON only with this shape: { "candidates": [...] }.',
      'Each candidate requires category, fact, confidence(0..1), optional evidenceSpan, and operation.',
      'Categories: goal, project, milestone, blocker, win, learning, skill_growth, preference, habit, relationship, value, other.',
      'Focus on long-lived, actionable developer context (projects, goals, blockers, wins, learning).',
      'Reject weak/noisy facts by omitting them. Keep fact concise, <= 280 chars.',
      '',
      'Known memories for merge context:',
      existingContext || '- none',
      '',
      'Entry text:',
      entryText,
    ].join('\n');

    const { text } = await generateText({
      model: 'openai/gpt-4o-mini',
      output: Output.object({
        schema: z.object({
          candidates: z.array(extractedMemoryCandidateSchema).max(20),
        }),
      }),
      prompt,
    });

    const parsed = JSON.parse(text) as { candidates?: ExtractedMemoryCandidate[] };
    return finalizeCandidates(parsed.candidates ?? [], safeMax);
  },

  async generatePersonalizedPrompts({
    memories,
    focusCategory,
    entryDraft,
    maxPrompts = 5,
  }: {
    memories: MemoryForPrompt[];
    focusCategory?: MemoryCategory;
    entryDraft?: string;
    maxPrompts?: number;
  }): Promise<PersonalizedPromptSuggestion[]> {
    const safeMax = Math.max(3, Math.min(maxPrompts, 5));
    const activeMemories = memories.filter((memory) => memory.status !== 'archived');

    if (activeMemories.length === 0) {
      return [
        {
          prompt: 'What meaningful progress did I make today, and what is the next step?',
          rationale: 'Fallback prompt when no active memory exists yet.',
          anchor: null,
        },
      ];
    }

    if (!hasAiGatewayKey()) {
      return fallbackPrompts({
        memories: activeMemories,
        focusCategory,
        entryDraft,
        maxPrompts: safeMax,
      });
    }

    const memoryContext = activeMemories
      .slice(0, 30)
      .map(
        (memory) =>
          `- [${memory.category}] ${memory.title} | ${memory.summary} | importance=${memory.importance.toFixed(2)} confidence=${memory.confidence.toFixed(2)} status=${memory.status}`,
      )
      .join('\n');

    const prompt = [
      'You generate personalized developer journaling prompts.',
      'Return JSON only with this shape: { "prompts": [...] }.',
      'Each prompt item must include: prompt, rationale, anchor.',
      'Anchor must be either an object { category, memoryTitle } or null.',
      'Generate 3-5 prompts focused on measurable progress and outcomes.',
      'At least one prompt should anchor to an active goal or project when available.',
      focusCategory ? `Prioritize focus category: ${focusCategory}.` : 'No forced category.',
      entryDraft?.trim() ? `Entry draft context:\n${entryDraft}` : 'No draft context provided.',
      '',
      'Memory context:',
      memoryContext,
    ].join('\n');

    const { text } = await generateText({
      model: 'openai/gpt-4o-mini',
      output: Output.object({
        schema: z.object({
          prompts: z.array(personalizedPromptSchema).min(3).max(5),
        }),
      }),
      prompt,
    });

    const parsed = JSON.parse(text) as { prompts?: PersonalizedPromptSuggestion[] };
    const prompts = parsed.prompts ?? [];
    const unique = new Map<string, PersonalizedPromptSuggestion>();
    for (const suggestion of prompts) unique.set(suggestion.prompt, suggestion);
    const finalized = [...unique.values()].slice(0, safeMax);

    if (finalized.length >= 3) return finalized;

    return fallbackPrompts({
      memories: activeMemories,
      focusCategory,
      entryDraft,
      maxPrompts: safeMax,
    });
  },
};

export const aiService = wrapService('aiService', aiServiceRaw);