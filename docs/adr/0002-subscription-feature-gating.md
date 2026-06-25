# ADR 0002: Subscription Feature Gating

## Status

Accepted — 2026-06-25

## Context

JuneBug offers a Pro subscription via Stripe. We need a consistent way to gate premium capabilities on both server and client without duplicating plan-resolution logic or building an admin UI for entitlements.

v1 gates exactly one action: **personalized prompt regeneration** (`prompts.regenerate`). Initial prompt generation (`getOrCreate`, all four categories) remains free for everyone.

The domain vocabulary (Plan, Pro/Free, Entitlement, Capability gate) is documented in [CONTEXT.md](../CONTEXT.md). Usage counters, daily quotas, and memory caps are explicitly deferred.

## Decision

1. **Single source of truth:** a typed entitlement policy in `packages/shared/src/entitlements.ts`, deployed with the app (no DB or admin UI).
2. **Plan resolution:** `Pro = subscription status active|trialing`; everything else `Free`. `isAdmin` bypasses all gates. Centralized in `resolvePlan()` and `can()`.
3. **v1 gate model:** capability gates only — `{ type: 'capability', requires: 'pro' }`. The policy map is shaped so future quota/cap entitlements can slot in without new plumbing.
4. **Server enforcement:** reusable `requireEntitlement(feature)` Express middleware on gated routes. Denial returns HTTP `402` with `{ error, code: 'upgrade_required', feature }`.
5. **Client UX:** visible-but-locked UI for gated actions (disabled button + tooltip, no navigation to upgrade). The API 402 is a safety net with a quiet toast.

## Consequences

### Positive

- Server and client agree on plan and entitlement checks via shared code.
- Adding future gates is a policy-map entry plus middleware/hook wiring — no new infrastructure.
- Free users retain full initial prompt generation; only refresh is Pro-only.

### Negative

- Entitlement changes require a deploy (acceptable for v1 scale).
- No grace period for `past_due` subscriptions — resolved as Free, matching existing client behavior.

## Deferred (not in v1)

- Usage-counter table and daily quota resets
- Memory caps and AI-title gating
- UpgradePage marketing copy changes

## Revisit Trigger

Introduce quota/cap entitlements when a second metered feature ships (e.g. memory extraction limits) and capability gates alone are insufficient.
