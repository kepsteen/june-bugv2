import { createAuthClient } from 'better-auth/react';

const authBaseURL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:3000' : '');

export const authClient = createAuthClient({
  baseURL: authBaseURL,
  basePath: '/api/auth',
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  requestPasswordReset,
  resetPassword,
} = authClient;
