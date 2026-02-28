import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { env } from './config/env.js';
import { corsConfig } from './config/cors.js';
import { errorHandler } from './middleware/error-middleware.js';
import { userRoutes } from './features/users/index.js';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './features/auth/auth.js';

const app = express();

// CORS configuration
app.use(cors(corsConfig));

// Better Auth routes - IMPORTANT: Must be before express.json()
app.all('/api/auth/*', toNodeHandler(auth));

// Body parsing middleware - AFTER Better Auth routes
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Feature routes
app.use('/api/users', userRoutes);

// Error handling
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
});
