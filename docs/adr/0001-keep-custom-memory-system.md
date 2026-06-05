# ADR 0001: Keep Custom Memory System (Do Not Adopt Third-Party Memory Library)

## Status

Accepted — 2026-06-04

## Context

JuneBug's memory layer extracts durable developer facts from journal entries, stores them in Postgres with pgvector embeddings, and uses hybrid retrieval (structured scoring + semantic similarity) to personalize prompts.

We evaluated replacing this with a third-party memory library or service:

- **Hosted memory services** (e.g. Zep Cloud, Mem0 Platform): rejected — private journal data should stay in our infrastructure.
- **Zep Community Edition**: deprecated; no longer a self-host option.
- **Graphiti** (Zep's OSS engine): Apache-2.0 temporal knowledge-graph engine requiring a graph database (Neo4j/FalkorDB/etc.) and Python runtime. Operational and stack mismatch for our Express + Postgres + Drizzle app.
- **Mem0 OSS** (Apache-2.0): closest fit — TypeScript SDK, pgvector backend, OpenAI embeddings. However, it largely mirrors what we already built (extraction, dedup, vector storage, retrieval).

The custom system already includes JuneBug-specific assets:

- Developer taxonomy (`goal`, `project`, `blocker`, `win`, `learning`, etc.)
- Retrieval scoring tuned for prompt generation (importance, confidence, freshness decay, category momentum)
- Event-sourced idempotency via `memory_events` and RabbitMQ jobs
- Freemium gating and AI usage observability integrated with `app_users`

The main quality gap was not architectural: embeddings were placeholders (`deterministic-hash-v1`) rather than real semantic vectors.

## Decision

1. **Keep the custom Postgres/pgvector memory system.** Do not migrate to Mem0, Graphiti, or a hosted memory service at this time.
2. **Fix embeddings in-house** by calling `openai/text-embedding-3-small` through the existing AI gateway, with deterministic-hash fallback when the gateway is unavailable.
3. **Backfill** existing `memory_embeddings` rows tagged `deterministic-hash-v1` via `pnpm run script:backfill-memory-embeddings`.

## Consequences

### Positive

- No new runtime dependencies (Neo4j, Python memory service, external memory API).
- Journal data remains in our Neon Postgres database.
- Domain-specific retrieval logic and observability stay intact.
- Semantic retrieval becomes meaningful after real embeddings are enabled.

### Negative

- We continue to own extraction, merge/dedup, and pipeline maintenance.
- Embedding API calls add marginal cost per memory write and prompt retrieval.

## Revisit Trigger

Re-evaluate adopting Mem0 OSS (or similar) if **maintenance burden** of the custom pipeline becomes a real cost — e.g. frequent bugs in merge logic, need for graph-based relationship memory, or team capacity cannot support pipeline evolution. Curiosity or generic "agent memory" features alone are not sufficient justification.
