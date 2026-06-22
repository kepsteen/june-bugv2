---
name: Remove memory fallback vectors
overview: Remove all three "no AI gateway key / AI error" fallbacks from the memories feature (embedding vectors, heuristic memory extraction, and prompt templates) so every AI path goes through the gateway and fails loudly, then delete the now-dead helpers, constant, and backfill script.
todos: []
isProject: false
---

# Remove memory fallback vectors

Treat the AI gateway key as always-required across the memories feature. All three fallbacks are removed: (1) the deterministic-hash embedding vectors, (2) the heuristic memory extraction, and (3) the prompt-template generation. After this change, a missing key or a transient AI error propagates as an error instead of silently degrading.

Behavior change to accept: AI errors during the memory pipeline now throw, which feeds the existing retry logic in [memory-pipeline.service.ts](apps/api/src/features/memories/memory-pipeline.service.ts) (`MAX_RETRIES = 3`); after retries the job is recorded as `failed`. Personalized-prompt generation errors surface to the caller instead of returning templates. The non-AI "user has no active memories yet" early return in `generatePersonalizedPromptSuggestions` is kept (it is not an AI-key fallback).

## 1. Embedding / vector fallback

- **[apps/api/src/features/memories/memory-embedding.helpers.ts](apps/api/src/features/memories/memory-embedding.helpers.ts)** — rewrite `embedMemoryText` to drop the empty-text fallback branch, the `hasAiGatewayKey()` short-circuit, and the `try/catch` that returned a fallback vector. Trim, throw a clear `AppError` on empty text, then return `aiGateway.embed(...)`'s result tagged with `MEMORY_EMBEDDING_MODEL_TAG`. Update the import from `@/lib/ai/index.js` to only `aiGateway`, `MEMORY_EMBEDDING_MODEL`, `MEMORY_EMBEDDING_MODEL_TAG`; drop `hasAiGatewayKey`, `MEMORY_EMBEDDING_FALLBACK_MODEL`, `fallbackDeterministicEmbedding`, and the now-unused `observabilityService`; add `AppError`.

- **[apps/api/src/lib/ai/embeddings.ts](apps/api/src/lib/ai/embeddings.ts)** — delete `fallbackDeterministicEmbedding`, `MEMORY_EMBEDDING_FALLBACK_MODEL`, and the now-unused `import { createHash } from 'node:crypto'`. Keep `MEMORY_EMBEDDING_MODEL` and `MEMORY_EMBEDDING_MODEL_TAG`. The barrel `export * from './embeddings.js'` in [apps/api/src/lib/ai/index.ts](apps/api/src/lib/ai/index.ts) needs no edit.

- **[apps/api/src/features/memories/memory-retrieval.helpers.ts](apps/api/src/features/memories/memory-retrieval.helpers.ts)** — remove the `import { fallbackDeterministicEmbedding }` (line 2) and its `export { fallbackDeterministicEmbedding }` re-export (line 12).

- **Delete [apps/api/src/scripts/backfill-memory-embeddings.ts](apps/api/src/scripts/backfill-memory-embeddings.ts)** and remove its `"script:backfill-memory-embeddings"` entry from [apps/api/package.json](apps/api/package.json) (line 10).

## 2. Heuristic memory extraction fallback

- **[apps/api/src/features/memories/memory-pipeline.helpers.ts](apps/api/src/features/memories/memory-pipeline.helpers.ts)**:
  - In `extractMemoriesFromEntry`, remove the `if (!hasAiGatewayKey()) { ... return finalizeCandidates(heuristicExtractMemories(...)) }` block (lines ~175-185) and the `catch { return finalizeCandidates(heuristicExtractMemories(...)) }` (lines ~220-222) so the `aiGateway.generateObject` result is returned directly and errors propagate. Drop the now-unused `startTime`.
  - Delete the `heuristicExtractMemories` function (lines ~54-125). After removing the fallbacks, it is only reachable via `inferCandidatesFromText`, which is itself only used by a test — delete `inferCandidatesFromText` (lines ~225-253) too.
  - Update imports: drop `hasAiGatewayKey` (keep `aiGateway`) and remove the now-unused `observabilityService` import.

- **[apps/api/src/features/memories/memory-pipeline.service.test.ts](apps/api/src/features/memories/memory-pipeline.service.test.ts)** — remove the `inferCandidatesFromText` import and its two tests ("extracts explicit categorized candidates..." and "falls back to blocker/win inference..."), keeping the `buildCanonicalKey` tests. Simplify the `@/lib/ai/ai.gateway.js` mock to drop the `hasAiGatewayKey` stub (keep the `aiGateway.generateObject` stub needed for module import).

## 3. Personalized prompt template fallback

- **[apps/api/src/features/memories/memories.service.ts](apps/api/src/features/memories/memories.service.ts)**:
  - Delete the `fallbackPrompts` function (lines ~61-106).
  - In `generatePersonalizedPromptSuggestions`: keep the `activeMemories.length === 0` early return; remove the `if (!hasAiGatewayKey()) { ... return fallbackPrompts(...) }` block (lines ~139-154); return the gateway result directly (the schema already enforces 3-5 prompts), dropping the `finalized.length >= 3 ? ... : fallbackPrompts(...)` branch (lines ~195-202) and the `catch { return fallbackPrompts(...) }` (lines ~203-210). Drop the now-unused `startTime`.
  - Update imports: drop `hasAiGatewayKey` (keep `aiGateway`); remove the now-unused `observabilityService` import; remove the now-unused local `clamp` helper (lines ~57-59). Keep `MemoryForPrompt` (still used by `generatePersonalizedPromptSuggestions`).

## Test updates (embedding)

- **[apps/api/src/lib/ai/ai.gateway.test.ts](apps/api/src/lib/ai/ai.gateway.test.ts)** — in the `embedMemoryText` describe block, replace "returns deterministic fallback embeddings when the gateway key is missing" with a test asserting `embedMemoryText` rejects (and `embed` is not called) when `AI_GATEWAY_API_KEY` is unset, mirroring the existing `aiGateway.embed` test. Keep the configured-key test. Remove the `fallbackDeterministicEmbedding` import (line 2).

- **[apps/api/src/features/memories/memories.service.test.ts](apps/api/src/features/memories/memories.service.test.ts)** — remove the `fallbackDeterministicEmbedding` import, delete the "builds stable fallback deterministic embeddings" test, and rewrite the cosine-similarity test to use plain inline vectors (e.g. `[1,2,3]` vs `[3,2,1]`) so `cosineSimilarity(vec, vec) > cosineSimilarity(vec, other)` still holds.

- **[apps/api/src/features/memories/memory-embedding.helpers.test.ts](apps/api/src/features/memories/memory-embedding.helpers.test.ts)** — already exercises only the configured-key success path; expected to keep passing with no change.

## Verification

- From `apps/api`: `pnpm typecheck` and `pnpm test:run` (focus: `ai.gateway.test.ts`, `memory-embedding.helpers.test.ts`, `memories.service.test.ts`, `memory-pipeline.service.test.ts`).

## Out of scope / notes

- `hasAiGatewayKey` stays exported and is still used internally by [ai.gateway.ts](apps/api/src/lib/ai/ai.gateway.ts) (its own missing-key guards) — only the memories-feature imports of it are removed.
- The `'fallback'` value in `aiUsageFeatureEnum` / observability and the web `AiOverviewCards` fallback counts are left intact (other features may still report it).
- Docs still mention deterministic-hash and heuristic fallbacks (e.g. [docs/adr/0001-keep-custom-memory-system.md](docs/adr/0001-keep-custom-memory-system.md), `docs/diagrams/*`). Not required for the code change; can be updated separately if you want them accurate.
