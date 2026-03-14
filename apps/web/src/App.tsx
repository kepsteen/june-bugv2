import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useSession } from '@/lib/auth-client';
import { EntriesPage } from '@/pages/EntriesPage';
import { SignInPage } from '@/pages/SignInPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import {
  InternalDashboardAiPage,
  InternalDashboardPage,
  InternalDashboardPlatformPage,
  InternalDashboardQueuesPage,
} from '@/pages/InternalDashboardPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return session ? <>{children}</> : <Navigate to="/sign-in" />;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return session ? <Navigate to="/entries" /> : <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/entries" />} />
        <Route path="/sign-in" element={<AuthRoute><SignInPage /></AuthRoute>} />
        <Route path="/sign-up" element={<AuthRoute><SignUpPage /></AuthRoute>} />
        <Route path="/entries" element={<EntriesPage />} />
        <Route path="/entries/:entryId" element={<EntriesPage />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/internal"
          element={
            <ProtectedRoute>
              <InternalDashboardPage />
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
