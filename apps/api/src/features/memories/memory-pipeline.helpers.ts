export type MemoryCategory =
  | 'goal'
  | 'project'
  | 'milestone'
  | 'blocker'
  | 'win'
  | 'learning'
  | 'skill_growth'
  | 'preference'
  | 'habit'
  | 'relationship'
  | 'value'
  | 'other';

export type ExtractedCandidate = {
  category: MemoryCategory;
  fact: string;
  confidence: number;
  evidenceSpan?: string;
  operation: 'create' | 'update' | 'archive_hint';
};

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

export function inferCandidatesFromText(plainText: string): ExtractedCandidate[] {
  const lines = plainText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const explicit: ExtractedCandidate[] = [];
  const memoryLinePattern =
    /^(goal|project|milestone|blocker|win|learning|skill_growth|preference|habit|relationship|value|other)\s*[:\-]\s*(.+)$/i;

  for (const line of lines) {
    const matched = line.match(memoryLinePattern);
    if (!matched) continue;
    const category = matched[1].toLowerCase() as MemoryCategory;
    const fact = matched[2].trim();
    if (!fact) continue;
    explicit.push({
      category,
      fact,
      confidence: 0.7,
      evidenceSpan: line,
      operation: 'create',
    });
  }

  if (explicit.length > 0) return explicit;

  const fallbackCandidates: ExtractedCandidate[] = [];
  const normalized = plainText.toLowerCase();
  const firstSentence = plainText.split(/[.!?]/).map((part) => part.trim()).find(Boolean);

  if (normalized.includes('blocked') || normalized.includes('stuck')) {
    fallbackCandidates.push({
      category: 'blocker',
      fact: firstSentence ?? 'Current blocker noted in latest entry',
      confidence: 0.55,
      evidenceSpan: firstSentence,
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
    fallbackCandidates.push({
      category: 'win',
      fact: firstSentence ?? 'Recent shipped work noted in latest entry',
      confidence: 0.6,
      evidenceSpan: firstSentence,
      operation: 'create',
    });
  }

  return fallbackCandidates.slice(0, 2);
}
