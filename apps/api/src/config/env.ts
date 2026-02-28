import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().optional(),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
