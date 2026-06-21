# AI Cost Analysis — Baseline (All GPT-4o-mini)

**Status:** Reflects current implementation (June 2026)  
**Routing:** Vercel AI Gateway → `openai/gpt-4o-mini` for titles, memory extraction, and personalized prompts  
**Embeddings:** `openai/text-embedding-3-small` (unchanged)

---

## Executive summary

JuneBug’s variable cost is almost entirely **LLM tokens**. With today’s code, **memory extraction on every autosave** accounts for ~60–80% of AI spend. GPT-4o-mini is among the cheapest production chat models at list price, so the product has **high gross margin** even before cost optimizations.

| Headline | Estimate |
|----------|----------|
| AI cost / engaged power user / month | ~$0.38 |
| Blended AI cost / MAU @ 1,000 users | ~$0.12 |
| Total COGS / MAU @ 1,000 (AI + infra) | ~$0.17 |
| Fixed infra / month (early scale) | ~$45 |
| Plus ($8/mo) gross margin (power user) | ~90%+ |

After extraction optimizations (debounce, content-hash skip, or nightly sweep): power-user AI drops to **~$0.05/mo**.

---

## Vendor pricing (June 2026 list)

| Model | Input / 1M tokens | Output / 1M tokens | Used for |
|-------|---------------------|---------------------|----------|
| `openai/gpt-4o-mini` | $0.15 | $0.60 | Titles, extraction, prompts |
| `openai/text-embedding-3-small` | $0.02 | — | Memory + prompt retrieval vectors |

Sources: [OpenAI API pricing](https://developers.openai.com/api/docs/models/gpt-4o-mini), [embeddings pricing](https://developers.openai.com/api/docs/models/text-embedding-3-small).

Gateway may add a small routing fee; figures assume pass-through.

---

## AI operations (from `ai.service.ts`)

| Feature | Model | Trigger | Est. tokens (in / out) | Cost / call |
|---------|-------|---------|------------------------|-------------|
| Entry title | `gpt-4o-mini` | Once when entry &gt; 50 words | ~450 / 15 | **$0.00008** |
| Memory extraction | `gpt-4o-mini` | Every entry save with `plainText` | ~3,000 / 1,000 | **$0.0011** |
| Personalized prompts | `gpt-4o-mini` | Per `(entry, focusCategory)`; cached in `entry_prompts` | ~3,500 / 500 | **$0.0008** |
| Memory embedding | `text-embedding-3-small` | Per changed memory + prompt query embed | ~100 / — | **~$0.00002** |

**Formula:** `(input_tokens × $0.15 + output_tokens × $0.60) / 1,000,000`

Extraction prompt includes up to **30 existing memories** plus full entry text (`extractMemoriesFromEntry`). Prompts include up to **~20 retrieved memories** plus optional `entryDraft` (max 5,000 chars in route schema).

---

## Why autosave dominates spend

```
Editor autosave (1s debounce, 2s maxWait)
  → PUT /api/entries/:id
  → entriesService.update()
  → publishEntryChangedJob()   // every save
  → extractMemoriesFromEntry() // full LLM call
```

Idempotency key = `entryId + entryUpdatedAt`, so **each save is a new job**. A 15-minute writing session with continuous edits can trigger **5–15 extractions** (~$0.006–$0.017 in one session).

Other triggers:

- `POST /api/memories/refresh` — manual re-run on latest entry
- Entry create with empty content — job runs but skips empty `plainText`

Prompt prefetch: `EntriesPage.tsx` prefetches **all 4 focus categories** on entry load → up to 4× prompt cost before the user opens the sidebar.

---

## Per-user personas (monthly AI only)

Assumptions for **current behavior** (no extraction optimizations):

| Persona | Activity | Extractions | Prompts | Titles | **AI $/mo** |
|---------|----------|-------------|---------|--------|-------------|
| Casual | ~4 active days | ~8 total | ~4 | ~4 | **~$0.03** |
| Regular | ~12 active days | ~60 | ~24 | ~12 | **~$0.12** |
| Power | ~26 active days; ~10 extractions/session; ~5 prompts/day | ~260 | ~130 | ~26 | **~$0.38** |

Breakdown (power user):

- Extraction: 26 × 10 × $0.0011 ≈ **$0.29**
- Prompts: 26 × 5 × $0.0008 ≈ **$0.10**
- Titles + embeddings: negligible

---

## Platform scale @ 1,000 MAU

Assume persona mix: 60% casual, 30% regular, 10% power.

| Line item | Calculation | $/month |
|-----------|-------------|---------|
| AI (blended) | 600×$0.03 + 300×$0.12 + 100×$0.38 | **~$120** |
| Railway | Pro + light usage | **~$20** |
| Neon | Launch, ~2 GB + compute | **~$25** |
| Resend / S3 | Minimal today | **~$0** |
| **Total** | | **~$165** |
| **COGS / MAU** | | **~$0.17** |

---

## Freemium unit economics (this model stack)

Proposed tiers (from product analysis):

| Tier | Price | Cost to serve (power) | Gross margin |
|------|-------|------------------------|--------------|
| Free | $0 | ~$0.03–0.10 | Acquisition |
| Plus | $8/mo | ~$0.20–0.60 | **~90%+** |
| Pro | $16/mo | ~$1–3 (if upgraded to premium model on prompts) | **~85%+** |

At 1,000 MAU and 5% Plus conversion: 50 × $8 = **$400/mo** revenue vs **~$165** COGS → **~$235** gross profit before payment fees.

Stripe (~2.9% + $0.30): ~$0.53 per $8 charge → net ~$7.47/subscriber.

---

## Cost optimization levers (priority order)

1. **Coalesce extraction** — idle debounce or nightly sweep (see `memory_extraction_cost_optimization_handoff.md`)
2. **Skip unchanged content** — SHA-256 of `plainText` vs last extraction hash
3. **Lazy prompt fetch** — remove 4-category prefetch on entry load
4. **Shrink context** — fewer memories in extraction/prompt prompts
5. **Prompt caching** — static instruction prefix for repeated schema

Optimized power user on this stack: **~$0.05/mo** AI → headroom to upgrade **prompts only** to a premium model on Plus/Pro.

---

## Implementation reference

| Area | Path |
|------|------|
| All LLM calls | `apps/api/src/lib/ai/ai.service.ts` |
| Job publish | `apps/api/src/features/entries/entries.service.ts` |
| Pipeline | `apps/api/src/features/memories/memory-pipeline.service.ts` |
| Prompt cache | `apps/api/src/features/prompts/prompts.service.ts` |
| Usage telemetry | `apps/api/src/features/observability/` |

---

## Comparison

See [AI cost analysis index](./ai-cost-analysis.md) and [Haiku hybrid analysis](./ai-cost-analysis-haiku-hybrid.md).
