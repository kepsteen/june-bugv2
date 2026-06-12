import { db } from '@/lib/db';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from '@/config/env';
import { sendPasswordResetEmail } from '@/lib/email/email.service.js';

const authBaseUrl =
  env.BETTER_AUTH_URL ?? `http://localhost:${env.PORT}`;

const socialProviders =
  env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
    ? {
        github: {
          clientId: env.GITHUB_CLIENT_ID as string,
          clientSecret: env.GITHUB_CLIENT_SECRET as string,
        },
      }
    : undefined;

export const auth = betterAuth({
  baseURL: authBaseUrl,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ to: user.email, url });
    },
  },
  socialProviders,
  experimental: { joins: true },
  trustedOrigins: [env.CLIENT_URL],
  advanced: {
    defaultCookieAttributes: {
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  },
});

export type Session = typeof auth.$Infer.Session;
