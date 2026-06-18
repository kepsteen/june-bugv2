# Handoff: Memory Extraction Cost Optimization (Tier 1 #1 + #2)

**Status:** Not started — ready for implementation  
**Author context:** Cost/pricing analysis conversation (June 2026)  
**Goal:** Cut AI spend on memory extraction by ~3–10× so budget can shift to higher-tier models on user-facing features (prompts).

---

## Problem statement

JuneBug triggers a **full LLM memory-extraction call on every entry autosave**. A typical writing session produces 5–15 extractions because:

1. `entries.service.ts` calls `publishEntryChangedJob()` on every `create` and `update`.
2. Frontend debounces saves at **1s / maxWait 2s** (`EntriesPage.tsx`).
3. Idempotency keys include `entryUpdatedAt`, so **each save is a distinct job** — there is no “still editing” coalescing.

Each extraction sends the full `plainText` plus up to **30 existing memories** to `gpt-4o-mini` (~3k input / ~1k output tokens). This is **~60–80% of per-user AI cost**.

**Tier 1 scope (this handoff):**

| # | Optimization | Expected savings |
|---|--------------|------------------|
| 1 | Coalesce extraction to “done writing” (idle debounce), not every save | 3–10× fewer extraction calls per session |
| 2 | Skip extraction when content hasn’t meaningfully changed | Additional 20–40% on top of #1 |

**Out of scope for this handoff:** prompt prefetch removal, model routing, context shrinking, embeddings skip, frontend `beforeunload` beacon (optional follow-up).

---

## Current architecture (read this first)

### Trigger path

```
MarkdownEditor onChange
  → EntriesPage debounce (1s / 2s maxWait)
  → PUT /api/entries/:id
  → entriesService.update()
  → memoriesPipelineService.publishEntryChangedJob({ userId, entryId, entryUpdatedAt })
  → void runEntryChangedJobWithRetries(job)   // fire-and-forget, in-process
  → processEntryChangedJob()
  → aiService.extractMemoriesFromEntry()
  → merge memories + upsertMemoryEmbedding per changed memory
```

### Key files

| File | Role |
|------|------|
| `apps/web/src/pages/EntriesPage.tsx` | Debounced save; also prefetches prompts (unrelated to this task) |
| `apps/api/src/features/entries/entries.service.ts` | Publishes job on `createOrGetByDate` and `update` |
| `apps/api/src/features/memories/memory-pipeline.service.ts` | Job publish, retry, idempotency, extraction orchestration |
| `apps/api/src/lib/queue/memory-queue.ts` | Job type + `buildMemoryProcessKey()` |
| `apps/api/src/lib/ai/ai.service.ts` | `extractMemoriesFromEntry()` — the expensive LLM call |
| `apps/api/src/features/memories/memories.service.ts` | `enqueueRefresh()` — manual refresh via `POST /api/memories/refresh` |
| `apps/api/src/features/observability/` | `queue_job_events`, `ai_usage_events` — use to verify savings |

### Idempotency today

```ts
// memory-queue.ts
buildMemoryProcessKey({ entryId, entryUpdatedAt })
// → `memory-process:${entryId}:${entryUpdatedAt}`
```

`processEntryChangedJob` skips if a `memory_events` row exists with matching `idempotencyKey` in payload (`eventType: 'updated'`). This prevents **duplicate retries** for the same timestamp, but **not** coalescing across rapid saves with different `updatedAt` values.

### Job execution model

- **In-process inline async** — no Redis/Bull/SQS (`memory-pipeline.service.ts` line ~439).
- **Single Railway Node process** in production — module-level in-memory debounce is safe **today**.
- **Caveat:** If the app ever runs multiple API replicas, in-memory timers won’t coalesce across instances. Document this; future work = DB-backed schedule or Redis.

### Manual refresh (must keep working)

`POST /api/memories/refresh` → `memoriesService.enqueueRefresh()` → publishes job for user’s latest entry. This should **bypass idle debounce** and **bypass content-hash skip** (force extraction).

---

## Proposed design

### Feature 1: Idle debounce (coalesce per entry)

**Behavior:** `publishEntryChangedJob()` schedules work instead of running immediately. One pending timer per `(userId, entryId)`. Each new publish **resets** the timer. When the timer fires, run extraction **once** against the **latest** entry row from DB.

**Recommended defaults (env-configurable):**

| Variable | Default | Meaning |
|----------|---------|---------|
| `MEMORY_EXTRACTION_IDLE_MS` | `300000` (5 min) | Wait after last save before extracting |
| `MEMORY_EXTRACTION_MIN_IDLE_MS` | `60000` (1 min) | Floor for dev/testing via env override |

**API shape change (internal):**

```ts
// memory-pipeline.service.ts — extend publish options
publishEntryChangedJob({
  userId,
  entryId,
  entryUpdatedAt,
  force?: boolean,  // true for manual refresh — skip debounce, run ASAP
})
```

**Module-level state (singleton per process):**

```ts
type PendingExtraction = {
  userId: string;
  entryId: string;
  timer: ReturnType<typeof setTimeout>;
  latestEntryUpdatedAt: string;
};

const pendingByEntryId = new Map<string, PendingExtraction>();
```

**`publishEntryChangedJob` logic:**

1. If `force === true`: cancel any pending timer for `entryId`, run job immediately (or enqueue with 0ms delay).
2. Else if pending exists for `entryId`: clear old timer, update `latestEntryUpdatedAt`, set new timer.
3. Else: create pending entry + timer.
4. On timer fire: remove from map, load entry from DB by `entryId`, call `runEntryChangedJobWithRetries` with **current** `entry.updatedAt` (not the stale timestamp from first save in the burst).

**Observability:** Record `queue_job_events` with:

- `status: 'scheduled'` on debounced publish (new status — or use `published` with `metadata: { mode: 'debounced', delayMs }`)
- `status: 'published'` when timer actually fires
- Preserve existing `processing` / `completed` / `skipped` / `failed` flow

**Edge cases:**

| Case | Expected behavior |
|------|-------------------|
| User saves, waits 5+ min | One extraction |
| User saves continuously for 20 min | One extraction ~5 min after last save |
| User saves, navigates away before idle | Extraction runs after idle (acceptable); optional follow-up: `beforeunload` flush endpoint |
| Manual refresh | `force: true` — immediate extraction |
| Entry deleted while pending | Timer fires → `processEntryChangedJob` already handles “entry not found” |
| Server restart during pending timer | **Lost timer** — acceptable for v1; extraction runs on next save or manual refresh. Optional: persist scheduled jobs to DB in v2. |
| Empty `plainText` | Already skipped in pipeline (`outcome: 'no_entry_text'`) |

### Feature 2: Skip unchanged / immaterial content

**Behavior:** Before calling `aiService.extractMemoriesFromEntry`, check whether extraction is warranted. If not, record a skip event and return without LLM call.

**Recommended approach: columns on `entries` table**

Add to `apps/api/src/features/entries/entries.table.ts`:

```ts
memoryExtractionContentHash: text('memory_extraction_content_hash'),  // nullable
memoryExtractedAt: timestamp('memory_extracted_at'),                  // nullable
```

**Why columns vs `memory_events` jsonb query:** Fast indexed lookup, no jsonb scan, clear source of truth on the entry row. Update both fields at end of successful extraction (and on skip-if-unchanged you don’t update).

**Hash function:**

```ts
import { createHash } from 'node:crypto';

function hashPlainText(plainText: string): string {
  return createHash('sha256').update(plainText.trim()).digest('hex');
}
```

Put in `memory-pipeline.helpers.ts` (or a tiny `content-hash.helpers.ts`).

**Skip rules (apply in `processEntryChangedJob` after loading entry, before LLM):**

| Rule | Condition | Skip outcome |
|------|-----------|--------------|
| A. Unchanged content | `hashPlainText(plainText) === entry.memoryExtractionContentHash` | `skipped` / `outcome: 'content_unchanged'` |
| B. Below minimum words | `wordCount(plainText) < MEMORY_EXTRACTION_MIN_WORDS` (default **75**) AND no prior extraction OR hash unchanged | `skipped` / `outcome: 'below_min_words'` |
| C. Immaterial delta | Prior hash exists AND `abs(newWords - oldWords) / oldWords < 0.10` (10%) | `skipped` / `outcome: 'immaterial_delta'` |

**Rule C needs `lastExtractedWordCount`:** Either store `memoryExtractionWordCount: integer` on `entries`, or derive from last successful extraction metadata. Simplest: add `memoryExtractionWordCount` column, set alongside hash on success.

**`force: true` (manual refresh):** Bypass rules A–C.

**On successful extraction:** Update entry:

```ts
{
  memoryExtractionContentHash: hashPlainText(plainText),
  memoryExtractionWordCount: wordCount(plainText),
  memoryExtractedAt: new Date(),
}
```

**Interaction with idempotency:** Content-hash skip is **orthogonal** to `entryUpdatedAt` idempotency. Order in `processEntryChangedJob`:

1. Validate payload
2. Check `entryUpdatedAt` idempotency (existing)
3. Load entry
4. **NEW:** Content-hash / word-count skip (unless `force`)
5. LLM extraction
6. **NEW:** Update entry extraction metadata
7. Existing merge + embedding + completion event

---

## Implementation checklist

### Phase A — Schema + helpers

- [ ] Add columns to `entries.table.ts`:
  - `memoryExtractionContentHash` (text, nullable)
  - `memoryExtractionWordCount` (integer, nullable)
  - `memoryExtractedAt` (timestamp, nullable)
- [ ] `pnpm db:generate` from `apps/api` → review SQL → `pnpm db:migrate`
- [ ] Commit `.sql`, snapshot, and `_journal.json` together (see `CLAUDE.md` migration rules)
- [ ] Add `hashPlainText()` + `countWords()` helpers with unit tests

### Phase B — Idle debounce

- [ ] Add env vars to `apps/api/src/config/env.ts`:
  - `MEMORY_EXTRACTION_IDLE_MS` (default 300000)
  - `MEMORY_EXTRACTION_MIN_WORDS` (default 75) — used in Phase C
- [ ] Refactor `publishEntryChangedJob` to debounce (module-level `Map`)
- [ ] Add `force?: boolean` param; wire `memories.service.ts` `enqueueRefresh` with `force: true`
- [ ] On timer fire: re-fetch entry, use fresh `updatedAt` for job payload
- [ ] Extend `queue_job_events` metadata for debounce visibility
- [ ] Unit/integration tests for debounce behavior (see Testing below)

### Phase C — Content skip

- [ ] Implement skip rules in `processEntryChangedJob` before LLM call
- [ ] Pass `force` through job payload (`MemoryEntryChangedJob` — bump `MEMORY_JOB_VERSION` to `2` if payload shape changes)
- [ ] Update entry metadata after successful extraction
- [ ] Record skip outcomes in `queue_job_events` with clear `outcome` strings
- [ ] Tests for unchanged hash, below min words, immaterial delta, force bypass

### Phase D — Verification

- [ ] Run `pnpm test` and `pnpm type-check`
- [ ] Manual test: type in editor for 30s → confirm **zero** `memory_extraction` AI events during typing
- [ ] Wait idle period → confirm **one** extraction
- [ ] Save without content change → confirm skip
- [ ] `POST /api/memories/refresh` → confirm extraction runs despite skip rules
- [ ] Check `/internal` observability dashboard for new skip outcomes

---

## Suggested code touchpoints (minimal diff)

```
apps/api/src/features/entries/entries.table.ts          # new columns
apps/api/src/lib/db/drizzle/NNNN_*.sql                  # generated migration
apps/api/src/lib/queue/memory-queue.ts                  # optional: job version bump, force flag
apps/api/src/features/memories/memory-pipeline.helpers.ts # hash + word count
apps/api/src/features/memories/memory-pipeline.service.ts # debounce + skip logic (main work)
apps/api/src/features/memories/memories.service.ts      # force: true on refresh
apps/api/src/config/env.ts                              # new env vars
apps/api/.env.example                                   # document new vars
apps/api/src/features/memories/memory-pipeline.service.test.ts # expand tests
```

**Do not change** `entries.service.ts` publish call sites beyond optionally passing nothing (debounce is internal to pipeline). Keep `void publishEntryChangedJob(...)` fire-and-forget pattern.

**Do not change** frontend autosave debounce in this task — backend coalescing is sufficient.

---

## Testing strategy

Existing tests in `memory-pipeline.service.test.ts` only cover `memory-pipeline.helpers.ts`. Add tests for new helpers + pipeline behavior.

### Helper tests (`memory-pipeline.helpers.test.ts` or extend existing file)

- `hashPlainText` is stable, trims whitespace, differs on content change
- `countWords` handles empty, punctuation, markdown remnants in plainText

### Pipeline tests (mock `aiService`, `db`, timers)

Use `vi.useFakeTimers()` for debounce:

1. **Debounce coalescing:** Publish 5 jobs for same `entryId` within 1s → `extractMemoriesFromEntry` called once after idle
2. **Debounce isolation:** Publish for `entryId` A and B → two extractions after idle
3. **Force bypass:** Publish with `force: true` → immediate call, no wait
4. **Content unchanged:** Entry has matching hash → no LLM call, `outcome: 'content_unchanged'`
5. **Below min words:** 20-word entry, no prior extraction → skip
6. **Force on short entry:** Manual refresh still extracts

Prefer testing `processEntryChangedJob` directly where possible; debounce tests can target internal schedule helpers if you extract them for testability.

---

## Acceptance criteria

1. A user typing continuously for 10 minutes triggers **at most 1** `memory_extraction` AI usage event per idle window (default 5 min after last save).
2. Saving identical `plainText` twice (after a successful extraction) triggers **0** LLM calls.
3. `POST /api/memories/refresh` always triggers extraction (force path).
4. All skip/debounce paths emit `queue_job_events` rows inspectable in `/internal` dashboard.
5. No regression: memories still created/merged/embedded on genuine content changes after idle.
6. Migrations apply cleanly on fresh DB (`pnpm db:migrate` from `0004` baseline).

---

## Success metrics (post-deploy)

Compare `ai_usage_events` where `feature = 'memory_extraction'`:

| Metric | Before (estimate) | Target after |
|--------|-------------------|--------------|
| Extractions per entry save | ~1.0 | ~0.05–0.15 (amortized) |
| Extractions per daily active user | 5–15 / session | 1–2 / session |
| `memory_extraction` tokens / MAU / month | dominant cost line | 60–80% reduction |

Query sketch (for implementer to run against observability tables):

```sql
-- Extractions per day
SELECT date_trunc('day', created_at), count(*)
FROM ai_usage_events
WHERE feature = 'memory_extraction'
GROUP BY 1 ORDER BY 1 DESC;

-- Skip reasons from queue jobs
SELECT outcome, count(*)
FROM queue_job_events
WHERE job_type = 'memory_entry_changed' AND status = 'skipped'
GROUP BY 1;
```

---

## Design decisions left to implementer (pick one, document in PR)

### 1. Job version bump

If adding `force?: boolean` to `MemoryEntryChangedJob`, bump `MEMORY_JOB_VERSION` to `2` and reject v1 payloads in `processEntryChangedJob` (or accept both). Low risk — jobs are ephemeral.

### 2. Debounce duration

5 minutes is conservative (max savings, slight delay before memories update). Alternatives:

- **3 min** — snappier, still large savings
- **10 min** — maximum savings, users may notice lag

Recommend shipping **5 min default** + env override. Mention in PR description.

### 3. Rule C (immaterial delta)

Optional for v1. Rules A + B deliver most value with less complexity. If time-constrained: ship A + B first, add C in follow-up.

### 4. `beforeunload` flush (optional follow-up)

Frontend could `POST /api/entries/:id/flush-memories` on navigate away. Not required for v1 — idle timer covers most cases. Note in PR as future enhancement.

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Memories feel “stale” during active writing | Expected — memories are background context, not live co-editing. Manual refresh exists. |
| Lost debounce timer on deploy/restart | Next save reschedules; acceptable for v1 |
| Multi-replica deployment breaks in-memory debounce | Document single-replica assumption; Railway is one service today |
| Hash skip prevents re-extract after prompt/model change | Manual refresh with `force: true`; future: bump extraction version in hash salting |
| Idempotency + hash skip double-skip confusion | Hash skip runs after idempotency check; use distinct `outcome` strings |

---

## Reference: cost motivation

From prior analysis (June 2026 list prices):

- Memory extraction: ~$0.0011/call (gpt-4o-mini, ~3k in / ~1k out tokens)
- 10 saves/session × 30 days ≈ 300 calls/user/mo ≈ **$0.33/user** on extraction alone
- After optimization: ~30 calls/user/mo ≈ **$0.03/user**

Freed budget → upgrade `generatePersonalizedPrompts` to a higher-tier model for paid users.

---

## Related docs / prior work

- Cost analysis canvas: `~/.cursor/projects/Users-codyepstein-repos-june-bugv2/canvases/junebug-cost-and-pricing.canvas.tsx`
- Entry flow diagram: `docs/diagrams/entries.html`
- Memory pipeline diagram: `docs/diagrams/memory.html`
- Repo conventions: `CLAUDE.md` (migrations, feature structure, testing commands)

---

## PR description template (for implementer)

```markdown
## Summary
- Debounce memory extraction per entry (default 5 min idle after last save)
- Skip LLM extraction when entry plainText is unchanged or below minimum word threshold
- Manual memory refresh bypasses both optimizations

## Why
Memory extraction on every autosave was ~60–80% of AI cost. This coalesces
5–15 extractions per writing session into 1, and skips no-op saves.

## Test plan
- [ ] Unit tests for debounce + content skip
- [ ] Manual: type continuously → no AI calls during session
- [ ] Manual: idle → one extraction
- [ ] Manual: POST /api/memories/refresh → forces extraction
- [ ] Internal dashboard shows new skip outcomes
```

---

**End of handoff.** Start with Phase A (schema), then Phase B (debounce), then Phase C (skip). Phases B and C can be separate PRs if preferred, but debounce alone delivers the largest win.
