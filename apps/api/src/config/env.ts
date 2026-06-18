import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  PUBLIC_URL: z.string().url().optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
  CLIENT_URL: z.string().url().optional(),

  // GitHub OAuth
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // Vercel AI Gateway (routes to OpenAI and other providers)
  AI_GATEWAY_API_KEY: z.string().optional(),

  // AWS S3
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().optional(),

  // Resend
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  CLIENT_URL: parsed.CLIENT_URL ?? parsed.PUBLIC_URL ?? 'http://localhost:5174',
  BETTER_AUTH_URL: parsed.BETTER_AUTH_URL ?? parsed.PUBLIC_URL,
};

export type Env = z.infer<typeof envSchema> & {
  CLIENT_URL: string;
  BETTER_AUTH_URL: string | undefined;
};
