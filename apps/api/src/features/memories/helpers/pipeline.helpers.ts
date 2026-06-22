export type { MemoryCategory } from '@starter/shared';
import type {
  ExtractedMemoryCandidate,
  MemoryCategory,
  MemoryForPrompt,
} from '@starter/shared';
import z from 'zod';
import { aiGateway } from '@/lib/ai/ai.gateway.js';

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
  evidenceSpan: z.string().min(1).max(240).nullable(),
  operation: memoryOperationSchema,
});

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeForKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90);
}

export function buildCanonicalKey(category: MemoryCategory, fact: string) {
  const normalized = normalizeForKey(fact);
  if (!normalized) return null;
  return `${category}:${normalized}`;
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
          evidenceSpan: candidate.evidenceSpan?.trim().slice(0, 240) ?? null,
        });
      }
    }
  }

  return [...deduped.values()]
    .filter((candidate) => candidate.confidence >= 0.45)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxCandidates);
}

export async function extractMemoriesFromEntry({
  entryText,
  existingMemories = [],
  maxCandidates = 8,
  userId,
  entryId,
}: {
  entryText: string;
  existingMemories?: Array<Pick<MemoryForPrompt, 'category' | 'title' | 'summary'>>;
  maxCandidates?: number;
  userId: string;
  entryId?: string;
}): Promise<ExtractedMemoryCandidate[]> {
  if (!entryText?.trim()) return [];

  const safeMax = Math.max(1, Math.min(maxCandidates, 12));
  const model = 'openai/gpt-4o-mini';
  const requestContext = { entryId, memoryCount: existingMemories.length };

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

  const { data } = await aiGateway.generateObject({
    model,
    prompt,
    schema: z.object({
      candidates: z.array(extractedMemoryCandidateSchema).max(20),
    }),
    userId,
    feature: 'memory_extraction',
    requestContext,
  });

  return finalizeCandidates(data.candidates ?? [], safeMax);
}
