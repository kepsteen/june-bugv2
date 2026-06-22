import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { useSession } from "@/lib/auth-client";
import { useGetOnboardingStatusQuery } from "@/hooks/api";
import { EntriesPage } from "@/pages/EntriesPage";
import { SignInPage } from "@/pages/SignInPage";
import { SignUpPage } from "@/pages/SignUpPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import {
	InternalDashboardAiPage,
	InternalDashboardPage,
	InternalDashboardPlatformPage,
	InternalDashboardQueuesPage,
} from "@/pages/InternalDashboardPage";

function LoadingScreen() {
	return (
		<div className="flex h-screen items-center justify-center">
			<div className="text-muted-foreground text-sm">Loading...</div>
		</div>
	);
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const { data: session, isPending } = useSession();

	if (isPending) {
		return <LoadingScreen />;
	}

	return session ? <>{children}</> : <Navigate to="/sign-in" />;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
	const { data: session, isPending } = useSession();

	if (isPending) {
		return <LoadingScreen />;
	}

	return session ? <Navigate to="/entries" /> : <>{children}</>;
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
	const { data: session, isPending: sessionPending } = useSession();
	const isAuthenticated = !!session?.user;

	const { data: onboardingStatus, isPending: statusPending } =
		useGetOnboardingStatusQuery({ enabled: isAuthenticated });

	if (sessionPending || (isAuthenticated && statusPending)) {
		return <LoadingScreen />;
	}

	if (isAuthenticated && onboardingStatus?.data.isOnboarded === false) {
		return <Navigate to="/onboarding" replace />;
	}

	return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
	const { data: session, isPending: sessionPending } = useSession();
	const isAuthenticated = !!session?.user;

	const { data: onboardingStatus, isPending: statusPending } =
		useGetOnboardingStatusQuery({ enabled: isAuthenticated });

	if (sessionPending || (isAuthenticated && statusPending)) {
		return <LoadingScreen />;
	}

	if (isAuthenticated && onboardingStatus?.data.isOnboarded === true) {
		return <Navigate to="/entries" replace />;
	}

	return <>{children}</>;
}

export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Navigate to="/entries" />} />
				<Route
					path="/sign-in"
					element={
						<AuthRoute>
							<SignInPage />
						</AuthRoute>
					}
				/>
				<Route
					path="/sign-up"
					element={
						<AuthRoute>
							<SignUpPage />
						</AuthRoute>
					}
				/>
				<Route
					path="/reset-password"
					element={
						<AuthRoute>
							<ResetPasswordPage />
						</AuthRoute>
					}
				/>
				<Route
					path="/entries"
					element={
						<OnboardingGuard>
							<EntriesPage />
						</OnboardingGuard>
					}
				/>
				<Route path="/entries/demo" element={<EntriesPage demo />} />
				<Route
					path="/entries/:entryId"
					element={
						<OnboardingGuard>
							<EntriesPage />
						</OnboardingGuard>
					}
				/>
				<Route
					path="/onboarding"
					element={
						<ProtectedRoute>
							<OnboardingRoute>
								<OnboardingPage />
							</OnboardingRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/settings"
					element={
						<ProtectedRoute>
							<OnboardingGuard>
								<SettingsPage />
							</OnboardingGuard>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/internal"
					element={
						<ProtectedRoute>
							<OnboardingGuard>
								<InternalDashboardPage />
							</OnboardingGuard>
						</ProtectedRoute>
					}
				>
					<Route index element={<Navigate to="ai" replace />} />
					<Route path="ai" element={<InternalDashboardAiPage />} />
					<Route path="queues" element={<InternalDashboardQueuesPage />} />
					<Route path="platform" element={<InternalDashboardPlatformPage />} />
				</Route>
				{/* Legacy routes */}
				<Route path="/login" element={<Navigate to="/sign-in" />} />
				<Route path="/signup" element={<Navigate to="/sign-up" />} />
				<Route path="/dashboard" element={<Navigate to="/entries" />} />
			</Routes>
		</BrowserRouter>
	);
}
