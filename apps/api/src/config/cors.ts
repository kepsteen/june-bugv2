import type { CorsOptions } from 'cors';
import { env } from './env.js';

export const corsConfig: CorsOptions = {
  origin: env.CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};
