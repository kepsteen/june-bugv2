# JuneBug Context

JuneBug is a daily developer journal. This document captures the shared language used across the app, with a current focus on **subscription-based feature gating**: how a user's plan decides which features they can use and how often.

## Language

### Plans & access

**Plan**:
A user's access level. Exactly two exist: **Free** (default for everyone) and **Pro** (a paying subscriber).
_Avoid_: tier, level, package.

**Pro**:
A user whose subscription status is `active` or `trialing`. Server and client agree on this via the same `isActiveSubscriptionStatus` check.
_Avoid_: premium, paid, subscriber (when precision matters).

**Free**:
Any user who is not Pro — no subscription row, or a `canceled`/`past_due`/incomplete one. Free users still get limited access to gated features, not zero access.

**Entitlement**:
What a given Plan is allowed to do for a specific feature. An entitlement takes one of three shapes: a **Capability gate** (an action is simply allowed or denied by Plan), a **Quota** (a windowed allowance), or a **Cap** (a total stored-resource limit). The full set of entitlements is the **policy**, defined once in code (`packages/shared`).
_Avoid_: permission, grant, license.

**Capability gate** (or **Gate**):
An entitlement that allows or denies an action outright based on Plan, with no counting (e.g. "regenerating prompts is Pro-only"). The mechanism used by v1.
_Avoid_: lock, flag.

**Admin**:
A user with `app_users.isAdmin = true`. Admins bypass all limits regardless of Plan.

### Limits & usage

**Gated feature**:
A feature whose availability or frequency depends on the user's Plan. v1 gates exactly one: **personalized prompt regeneration**. Future candidates: AI titles, saved memories.
_Avoid_: locked feature, premium feature.

**Quota** _(future, not used in v1)_:
The maximum number of times a Free user may use a windowed gated feature within a single **Period** (e.g. "three AI titles per day"). Pro users have no Quota.
_Avoid_: rate limit, allowance cap.

**Cap** _(future, not used in v1)_:
A maximum on a stored resource rather than an action over time (e.g. "a handful of saved memories on Free"). Measured by counting existing rows, not by a counter.
_Avoid_: quota (reserve "quota" for windowed actions).

**Period** _(future, not used in v1)_:
The window a Quota resets on. A **UTC calendar day** (`YYYY-MM-DD`), matching the existing "one entry per calendar date" boundary (`getMidnightUTC`).
_Avoid_: cycle, billing period (that's a Stripe concept, unrelated).

## Relationships

- A **User** has exactly one **Plan** (Free or Pro), derived from their **Subscription** status.
- A **Plan** maps to a set of **Entitlements**, one per **Gated feature**.
- An entitlement is a **Capability gate** (v1), a **Quota** (future, windowed), or a **Cap** (future, total resource).
- **Pro** removes all gates, Quotas, and Caps.
- **Admins** bypass all gates regardless of Plan.

## Example dialogue

> **Dev:** "A Free user opens an entry and clicks through all four prompt categories — does that work?"
> **Domain expert:** "Yes. The **initial** generation for each category is free — that's their one free look across all categories."
>
> **Dev:** "Then they hit the refresh button to get different prompts?"
> **Domain expert:** "That's **regeneration** — Pro-only. We block it and invite them to upgrade. The **Capability gate** doesn't count anything; refresh is simply a Pro action."

## Flagged ambiguities

- "one generation" was ambiguous (per-category vs all categories) — resolved: the **initial** generation is free across **all** categories; only **regeneration** (the refresh action) is gated to Pro.
- "limit" was used loosely for both windowed actions and total stored resources — resolved: **Quota** = per-Period action count, **Cap** = total resource count. Neither is used in v1.
- "past_due" subscriptions: resolved as **Free** (no grace period), matching the client's existing `isActiveSubscription` logic.
