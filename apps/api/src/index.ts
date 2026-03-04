import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { env } from './config/env.js';
import { corsConfig } from './config/cors.js';
import { errorHandler } from './middleware/error-middleware.js';
import { requestLogger } from './middleware/request-logger.js';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './features/auth/auth.js';
import { userRoutes } from './features/users/index.js';
import { appUsersRoutes } from './features/app-users/index.js';
import { entriesRoutes } from './features/entries/index.js';
import { tagsRoutes } from './features/tags/index.js';
import { entryTagsRouter, tagEntriesRouter } from './features/entry-tags/index.js';
import { todosRoutes } from './features/todos/index.js';
import { uploadsRoutes } from './features/uploads/index.js';
import { insightsRouter } from './features/insights/index.js';

const app = express();

app.use(cors(corsConfig));
app.all('/api/auth/*', toNodeHandler(auth));
app.use(express.json());
app.use(requestLogger);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/users', userRoutes);
app.use('/api/app-users', appUsersRoutes);
app.use('/api/entries', entriesRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/entries/:entryId/tags', entryTagsRouter);
app.use('/api/tags/:tagId/entries', tagEntriesRouter);
app.use('/api/todos', todosRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/insights', insightsRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});
