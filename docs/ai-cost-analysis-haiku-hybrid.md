# AI Cost Analysis — Hybrid (GPT-4o-mini Titles + Claude Haiku 4.5)

**Status:** Proposed model split (not implemented)  
**Routing:** Vercel AI Gateway  
**Embeddings:** `openai/text-embedding-3-small` (unchanged — Anthropic has no drop-in replacement in current pipeline)

---

## Executive summary

This analysis models a **quality-oriented split**:

| Feature | Model |
|---------|-------|
| Entry titles | `openai/gpt-4o-mini` (cheap, one-shot) |
| Memory extraction | `anthropic/claude-haiku-4-5` |
| Personalized prompts | `anthropic/claude-haiku-4-5` |
| Embeddings | `openai/text-embedding-3-small` |

**Critical finding:** At June 2026 **list prices**, Claude Haiku 4.5 is **~6–8× more expensive per token** than GPT-4o-mini on the workloads JuneBug uses (input-heavy extraction, moderate output). Switching extraction and prompts to Haiku **increases** AI spend unless you also cut call volume.

| Headline | All GPT-4o-mini | Haiku hybrid | Δ |
|----------|-----------------|--------------|---|
| AI cost / power user / month (current autosave) | ~$0.38 | **~$2.86** | **~7.5×** |
| AI cost / power user / month (optimized) | ~$0.05 | **~$0.37** | **~7.4×** |
| Plus ($8) margin — power user, optimized | ~94% | **~90%** | Still viable |
| Plus margin — power user, unoptimized | ~90% | **~65%** | Risky at scale |

**Recommendation:** Adopt Haiku 4.5 for extraction/prompts only **after** extraction cost optimizations ship, and position the upgrade as a **Plus/Pro quality benefit**, not a platform-wide swap.

---

## Vendor pricing (June 2026 list)

| Model | Input / 1M | Output / 1M | Role in hybrid |
|-------|------------|-------------|----------------|
| `openai/gpt-4o-mini` | $0.15 | $0.60 | Titles only |
| `anthropic/claude-haiku-4-5` | $1.00 | $5.00 | Extraction + prompts |
| `openai/text-embedding-3-small` | $0.02 | — | Embeddings |

Sources: [OpenAI gpt-4o-mini](https://developers.openai.com/api/docs/models/gpt-4o-mini), [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing).

**Rate comparison (same token counts):**

| | Input $/1M | Output $/1M | vs 4o-mini input | vs 4o-mini output |
|--|------------|-------------|------------------|---------------------|
| GPT-4o-mini | $0.15 | $0.60 | 1× | 1× |
| Haiku 4.5 | $1.00 | $5.00 | **6.7×** | **8.3×** |

Anthropic **Batch API** (50% off) and **prompt caching** (up to ~90% off cached input) can narrow the gap for batch/nightly extraction — not for real-time autosave without architectural change.

---

## Per-operation cost (same token assumptions as baseline)

Token estimates from `ai.service.ts` prompts (unchanged by model):

| Feature | Model | Tokens (in / out) | Cost / call |
|---------|-------|---------------------|-------------|
| Entry title | `gpt-4o-mini` | ~450 / 15 | **$0.00008** |
| Memory extraction | `claude-haiku-4-5` | ~3,000 / 1,000 | **$0.0080** |
| Personalized prompts | `claude-haiku-4-5` | ~3,500 / 500 | **$0.0060** |
| Memory embedding | `text-embedding-3-small` | ~100 / — | **~$0.00002** |

**Haiku extraction formula:** `(3000 × $1.00 + 1000 × $5.00) / 1,000,000 = $0.008`  
**Haiku prompts formula:** `(3500 × $1.00 + 500 × $5.00) / 1,000,000 = $0.006`

vs baseline extraction $0.0011 and prompts $0.0008 → **~7.3× and ~7.5×** per call respectively.

---

## Per-user personas (monthly AI only)

Same activity assumptions as [baseline doc](./ai-cost-analysis-gpt-4o-mini-baseline.md).

### Current autosave behavior (unoptimized)

| Persona | Extractions | Prompts | Titles (4o-mini) | **AI $/mo** |
|---------|-------------|---------|------------------|-------------|
| Casual | ~8 | ~4 | ~4 | **~$0.09** |
| Regular | ~60 | ~24 | ~12 | **~$0.62** |
| Power | ~260 | ~130 | ~26 | **~$2.86** |

Power user breakdown:

- Extraction: 260 × $0.008 ≈ **$2.08**
- Prompts: 130 × $0.006 ≈ **$0.78**
- Titles + embeddings ≈ **$0.003**

### After extraction optimizations

Assume **1 extraction per active day**, **1 prompt category opened per day** (no prefetch), titles unchanged:

| Persona | Active days | **AI $/mo** |
|---------|-------------|-------------|
| Casual | 4 | **~$0.05** |
| Regular | 12 | **~$0.17** |
| Power | 26 | **~$0.37** |

Optimized power: 26 × ($0.008 + $0.006 + $0.00008) ≈ **$0.36**.

---

## Platform scale @ 1,000 MAU

Persona mix: 60% casual / 30% regular / 10% power.

### Unoptimized (current autosave)

| Line item | $/month |
|-----------|---------|
| AI (blended) | **~$900** |
| Fixed infra | **~$45** |
| **Total** | **~$945** |
| **COGS / MAU** | **~$0.95** |

### Optimized extraction + lazy prompts

| Line item | $/month |
|-----------|---------|
| AI (blended) | **~$120** |
| Fixed infra | **~$45** |
| **Total** | **~$165** |
| **COGS / MAU** | **~$0.17** |

Note: optimized hybrid AI total (~$120) is **similar to unoptimized all–4o-mini** (~$120) — optimizations are **prerequisite** for Haiku, not optional.

---

## When Haiku 4.5 is worth it

**Quality arguments (not cost):**

- Stronger instruction-following on structured JSON extraction (`Output.object` / schema)
- Better nuance for developer journaling tone in personalized prompts
- Extended thinking support on Haiku 4.5 for harder merge decisions (if enabled — adds latency + cost)

**Cost mitigation specific to Anthropic:**

| Technique | Applies to | Effect |
|-----------|------------|--------|
| Nightly batch extraction | Memory pipeline | Batch API 50% off → extraction **$0.004/call** |
| Prompt caching | Static extraction/prompt system instructions | Up to ~90% off repeated input prefix |
| Tier gating | Free vs Plus | Free: 4o-mini or heuristics; Plus: Haiku |

**Cheaper Anthropic alternative:** Claude Haiku 3 at **$0.25 / $1.25** per 1M is closer to 4o-mini economics on input-heavy extraction but is deprecated on some platforms (April 2026). Evaluate `claude-haiku-3` only if quality suffices.

---

## Freemium impact (hybrid stack)

| Tier | Suggested model policy | Power user cost to serve |
|------|------------------------|--------------------------|
| Free | 4o-mini or heuristics for extraction; template/heuristic prompts | ~$0.03–0.10 |
| Plus | Haiku 4.5 extraction + prompts (optimized) | **~$0.37** |
| Pro | Haiku 4.5 + Sonnet 4.6 on prompts / weekly insights | **~$1–3** |

Plus @ $8 with optimized Haiku hybrid: **~$7.47** after Stripe → **~90% gross margin** on AI+infra for a power subscriber.

Plus @ $8 **without** optimizations on a power user: ~$2.86 AI alone → **~64% margin** before infra — acceptable for paid tier only, dangerous if free users get Haiku.

---

## Implementation notes

Today all features use a single model constant in `ai.service.ts`:

```ts
const model = 'openai/gpt-4o-mini'; // generateTitle, extractMemoriesFromEntry, generatePersonalizedPrompts
```

Suggested change:

```ts
// env or config map
AI_MODEL_TITLE = 'openai/gpt-4o-mini'
AI_MODEL_EXTRACTION = 'anthropic/claude-haiku-4-5'
AI_MODEL_PROMPTS = 'anthropic/claude-haiku-4-5'
```

Gateway model IDs must match [Vercel AI Gateway provider strings](https://sdk.vercel.ai/docs). Record actual `model` in `ai_usage_events` per feature for cost attribution.

**Embeddings:** Keep OpenAI `text-embedding-3-small` unless you re-embed the corpus. Mixing embedding providers breaks semantic similarity unless dimensions and geometry match (they do not across providers).

**Eval before ship:** Run prompt versioning / eval harness (`.cursor/plans/ai_evals_and_observability_6b5d9bda.plan.md`) comparing 4o-mini vs Haiku on:

- Extraction precision/recall on real journal samples
- Prompt relevance ratings
- Token usage (Haiku may use more output tokens for same schema)

---

## Decision matrix

| Goal | Recommendation |
|------|----------------|
| Minimize cost | Stay on **all GPT-4o-mini** + optimize extraction |
| Maximize prompt quality on Plus | **Hybrid** after optimizations; Haiku prompts only on paid tier |
| Maximize extraction quality | Haiku extraction in **nightly batch** (Batch API discount) |
| Scale free tier broadly | **Do not** put Haiku on free path |

---

## Related

- [Cost analysis index](./ai-cost-analysis.md)
- [Baseline: all GPT-4o-mini](./ai-cost-analysis-gpt-4o-mini-baseline.md)
- [Memory cost optimization diagram](./diagrams/memory-cost-optimization.html)
