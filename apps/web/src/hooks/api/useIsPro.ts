import { resolvePlan } from '@starter/shared';
import { useGetCurrentAppUserQuery, useSubscriptionQuery } from '@/hooks/api';

export function useIsPro() {
  const { data: subscriptionData, isPending: subscriptionPending } =
    useSubscriptionQuery();
  const { data: appUserData, isPending: appUserPending } =
    useGetCurrentAppUserQuery();

  const isAdmin = appUserData?.data.isAdmin ?? false;
  const plan = resolvePlan(subscriptionData?.data?.stripeStatus);
  const isPro = isAdmin || plan === 'pro';

  return {
    isPro,
    isAdmin,
    plan,
    isPending: subscriptionPending || appUserPending,
  };
}
