import { db } from '@/lib/db';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from '@/config/env';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: { 
    enabled: true, 
  },
  experimental: { joins: true },
  trustedOrigins: [env.CLIENT_URL],
});

export type Session = typeof auth.$Infer.Session;
