import { createHash } from 'node:crypto';

export type RetrievalMemory = {
  category: 'goal' | 'project' | 'milestone' | 'blocker' | 'win' | 'learning' | 'skill_growth' | 'preference' | 'habit' | 'relationship' | 'value' | 'other';
  importance: number;
  confidence: number;
  lastSeenAt: Date;
  milestoneState: 'planned' | 'in_progress' | 'completed' | 'blocked' | null;
};

export type MemoryCategory = RetrievalMemory['category'];

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

export function fallbackDeterministicEmbedding(input: string): number[] {
  const hash = createHash('sha256').update(input).digest();
  const vector = new Array<number>(1536);
  for (let i = 0; i < 1536; i += 1) {
    const byte = hash[(i * 7) % hash.length];
    vector[i] = (byte / 255) * 2 - 1;
  }
  return vector;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  if (length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (!denom) return 0;
  return clamp(dot / denom, -1, 1);
}

export function getCategoryMomentumBonus(memory: RetrievalMemory): number {
  if (memory.category === 'goal' || memory.category === 'project') return 0.12;
  if (memory.category === 'milestone' && memory.milestoneState === 'in_progress') return 0.1;
  if (memory.category === 'blocker') return 0.08;
  return 0;
}

export function getFreshnessDecayScore(lastSeenAt: Date): number {
  const daysSinceLastSeen = (Date.now() - lastSeenAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLastSeen <= 30) return 1;
  if (daysSinceLastSeen >= 120) return 0;
  return clamp(1 - (daysSinceLastSeen - 30) / 90);
}

export function scoreMemoryForRetrieval({
  memory,
  focusCategory,
}: {
  memory: RetrievalMemory;
  focusCategory?: MemoryCategory;
}) {
  const categoryMatch = focusCategory && memory.category === focusCategory ? 1 : 0;
  const freshness = getFreshnessDecayScore(memory.lastSeenAt);
  return (
    clamp(memory.importance) * 0.35 +
    clamp(memory.confidence) * 0.25 +
    freshness * 0.2 +
    categoryMatch * 0.15 +
    getCategoryMomentumBonus(memory) * 0.05
  );
}
