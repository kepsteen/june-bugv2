import {
	useQuery,
	useMutation,
	type UseMutationOptions,
} from "@tanstack/react-query";
import { appUsersApi, type AppUser } from "@/lib/api";

/**
 * Query hook to get the current app user
 */
export function useGetCurrentAppUserQuery(options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: ["appUser"],
		queryFn: () => appUsersApi.getMe(),
		enabled: options?.enabled !== false,
		staleTime: 60_000,
	});
}

/**
 * Query hook to get onboarding status
 */
export function useGetOnboardingStatusQuery(options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: ["appUser", "onboarding", "status"],
		queryFn: () => appUsersApi.getOnboardingStatus(),
		enabled: options?.enabled !== false,
		staleTime: 60_000,
	});
}

type CompleteOnboardingResponse = { data: AppUser };
type CompleteOnboardingVariables = { payload: Partial<AppUser> };

/**
 * Mutation hook to complete onboarding
 * Automatically invalidates app user queries on success
 */
export function useCompleteOnboardingMutation(
	options?: Omit<
		UseMutationOptions<
			CompleteOnboardingResponse,
			Error,
			CompleteOnboardingVariables,
			unknown
		>,
		"mutationFn"
	>,
) {
	return useMutation({
		...options,
		mutationFn: (variables: CompleteOnboardingVariables) =>
			appUsersApi.completeOnboarding(variables),
	});
}
