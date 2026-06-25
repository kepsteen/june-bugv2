import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationOptions,
} from '@tanstack/react-query';
import {
	subscriptionsApi,
	type BillingCycle,
	type Subscription,
} from '@/lib/api';

type SubscriptionResponse = { data: Subscription | null };
type CheckoutResponse = { data: string };
type PortalResponse = { data: string };

export function useSubscriptionQuery(options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: ['subscription'],
		queryFn: () => subscriptionsApi.getMe(),
		enabled: options?.enabled !== false,
		staleTime: 30_000,
	});
}

export function useCreateCheckoutMutation(
	options?: Omit<
		UseMutationOptions<CheckoutResponse, Error, { cadence: BillingCycle }, unknown>,
		'mutationFn'
	>,
) {
	return useMutation({
		...options,
		mutationFn: (variables: { cadence: BillingCycle }) =>
			subscriptionsApi.createCheckout(variables),
	});
}

export function useCreatePortalMutation(
	options?: Omit<
		UseMutationOptions<PortalResponse, Error, void, unknown>,
		'mutationFn'
	>,
) {
	return useMutation({
		...options,
		mutationFn: () => subscriptionsApi.createPortal(),
	});
}

export function useInvalidateSubscription() {
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: ['subscription'] });
}
