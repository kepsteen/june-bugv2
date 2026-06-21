# JuneBug v2 — AI Cost & Pricing Analysis

Bottom-up cost estimates for operating JuneBug’s AI features, derived from a codebase audit (`apps/api/src/lib/ai/ai.service.ts`, memory pipeline, prompts) and vendor list prices as of **June 2026**.

## Documents

| Analysis | Model strategy | Summary |
|----------|----------------|---------|
| [Baseline: all GPT-4o-mini](./ai-cost-analysis-gpt-4o-mini-baseline.md) | `gpt-4o-mini` for titles, extraction, and prompts | **Current code path.** Lowest token cost; autosave re-extraction is the main spend leak. |
| [Hybrid: Haiku 4.5 + GPT-4o-mini titles](./ai-cost-analysis-haiku-hybrid.md) | `gpt-4o-mini` titles only; `claude-haiku-4-5` for extraction and prompts | **Higher per-call cost** at list price (~7× on heavy ops). Viable only with cost optimizations and/or quality-driven pricing. |

Embeddings (`openai/text-embedding-3-small`) are identical in both scenarios and remain negligible.

## Quick comparison (power user, current autosave behavior)

Assumes ~26 active days/month, ~10 memory extractions per writing session, ~5 prompt generations per day (4 category prefetch + 1 regenerate). See each doc for assumptions.

| Metric | All GPT-4o-mini | Haiku hybrid |
|--------|-----------------|--------------|
| AI cost / power user / month | ~$0.38 | ~$2.86 |
| AI cost / engaged MAU (blended) | ~$0.12–0.17 | ~$0.90–1.30 |
| Dominant cost driver | Memory extraction on autosave | Same (amplified by Haiku rates) |
| Plus ($8/mo) gross margin (power user) | ~90%+ | ~65–75% (still viable) |

After **memory extraction cost optimizations** (idle debounce, content-hash skip, or nightly sweep — see `.cursor/plans/` and `docs/diagrams/memory-cost-optimization.html`):

| Metric | All GPT-4o-mini | Haiku hybrid |
|--------|-----------------|--------------|
| AI cost / power user / month | ~$0.05 | ~$0.37 |
| Plus gross margin | ~94%+ | ~90%+ |

## Fixed infrastructure (both scenarios)

Early scale (&lt; 2k MAU), unchanged by model choice:

| Service | Est. $/month |
|---------|--------------|
| Railway (Pro + usage) | ~$20 |
| Neon Postgres (Launch) | ~$25 |
| Resend / S3 | ~$0 |
| **Total fixed** | **~$45** |

## Recommended freemium shape (model-agnostic)

| Tier | Price | Gating idea |
|------|-------|-------------|
| Free | $0 | Full journal; meter AI (memory cap, prompt generations/mo) |
| Plus | $8/mo | Unlimited memories + prompts; export, reminders |
| Pro | $16/mo | Premium model on hero features (prompts / insights) |

Marginal AI cost is low enough on GPT-4o-mini that conversion matters more than COGS. A Haiku hybrid **requires** extraction/prompt optimizations before scaling free users.

## Related

- [ADR 0001: Keep custom memory system](./adr/0001-keep-custom-memory-system.md)
- [Memory cost optimization diagram](./diagrams/memory-cost-optimization.html)
- Implementation handoff: `.cursor/plans/memory_extraction_cost_optimization_handoff.md`
- Observability: `ai_usage_events`, `queue_job_events` → `/internal` dashboard

## Verification

These are **estimates**. Ground truth:

```sql
SELECT feature, model, count(*),
       sum(tokens_input) AS in_tok,
       sum(tokens_output) AS out_tok
FROM ai_usage_events
WHERE status = 'success'
  AND created_at > now() - interval '30 days'
GROUP BY 1, 2
ORDER BY count DESC;
```

Add a `cost_usd` column (tokens × model rate) for per-user rollups before enforcing free-tier caps.
