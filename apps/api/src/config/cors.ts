import type { CorsOptions } from 'cors';
import { env } from './env.js';

export const corsConfig: CorsOptions = {
  origin: env.CLIENT_URL || 'http://localhost:5174',
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};
