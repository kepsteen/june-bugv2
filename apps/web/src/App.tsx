import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from '@/lib/auth-client';
import { useGetOnboardingStatusQuery } from '@/hooks/api/useAppUsers';
import { EntriesPage } from '@/pages/EntriesPage';
import { SignInPage } from '@/pages/SignInPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { OnboardingPage } from '@/pages/OnboardingPage';

function ProtectedRoute({ children, checkOnboarding = true }: { children: React.ReactNode; checkOnboarding?: boolean }) {
  const { data: session, isPending: isSessionPending } = useSession();
  const { data: onboardingData, isPending: isOnboardingPending, isFetching } = useGetOnboardingStatusQuery({
    enabled: !!session && checkOnboarding,
  });


  if (isSessionPending || (checkOnboarding && isOnboardingPending)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/sign-in" />;
  }

  // Redirect to onboarding if not completed (but avoid loop on /onboarding itself)
  if (checkOnboarding && onboardingData && !onboardingData.data.isOnboarded) {   
    fetch('http://127.0.0.1:7243/ingest/c77b8c5e-48b1-490d-a366-6f9361fe3c74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:29',message:'Redirecting to onboarding - isOnboarded is false',data:{isOnboarded:onboardingData?.data?.isOnboarded},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    return <Navigate to="/onboarding" />;
  }

  return <>{children}</>;
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
        <Route
          path="/entries"
          element={
            <ProtectedRoute>
              <EntriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/entries/:entryId"
          element={
            <ProtectedRoute>
              <EntriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute checkOnboarding={false}>
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
        {/* Legacy routes */}
        <Route path="/login" element={<Navigate to="/sign-in" />} />
        <Route path="/signup" element={<Navigate to="/sign-up" />} />
        <Route path="/dashboard" element={<Navigate to="/entries" />} />
      </Routes>
    </BrowserRouter>
  );
}
