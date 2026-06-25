export type Plan = 'free' | 'pro';

export const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'] as const;

export type ActiveSubscriptionStatus = (typeof ACTIVE_SUBSCRIPTION_STATUSES)[number];

export type FeatureKey = 'prompts.regenerate';

type CapabilityEntitlement = {
  type: 'capability';
  requires: Plan;
};

export type EntitlementPolicy = CapabilityEntitlement;

export const ENTITLEMENT_POLICY: Record<FeatureKey, EntitlementPolicy> = {
  'prompts.regenerate': { type: 'capability', requires: 'pro' },
};

export function resolvePlan(status: string | null | undefined): Plan {
  if (
    status != null &&
    (ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status)
  ) {
    return 'pro';
  }
  return 'free';
}

export function can(
  plan: Plan,
  feature: FeatureKey,
  opts?: { isAdmin?: boolean },
): boolean {
  if (opts?.isAdmin) return true;

  const policy = ENTITLEMENT_POLICY[feature];
  if (policy.type === 'capability') {
    if (policy.requires === 'pro') return plan === 'pro';
    return true;
  }

  return false;
}
