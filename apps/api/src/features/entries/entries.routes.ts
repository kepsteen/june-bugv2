import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { AuthMiddleware } from '../../middleware/auth-middleware.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { entriesService } from './entries.service.js';
import { appUsersService } from '../app-users/app-users.service.js';
import { insightsService } from '../insights/insights.service.js';

const router: RouterType = Router({ mergeParams: true });

// Helper: get or create app user from Better Auth session
async function getAppUser(res: Response) {
  const authUser = res.locals.user; // Better Auth user
  return appUsersService.findOrCreate({ authId: authUser.id, email: authUser.email });
}

// GET / - list entries
router.get('/', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  const entryList = await entriesService.list({ userId: appUser.id });
  res.json({ data: entryList });

  // Fire-and-forget: refresh insights if stale (non-blocking)
  insightsService.refreshIfStale(appUser.id);
}));

// GET /search - search entries (query param q)
// Must come before /:id
router.get('/search', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const results = await entriesService.search({ userId: appUser.id, q });
  res.json({ data: results });
}));

// GET /range - get by date range (query params start, end as ISO strings)
// Must come before /:id
router.get('/range', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  const start = new Date(req.query.start as string);
  const end = new Date(req.query.end as string);
  const results = await entriesService.getByRange({ userId: appUser.id, start, end });
  res.json({ data: results });
}));

// GET /test-error - Test endpoint to demonstrate error logging with context
// Must come before /:id
router.get('/test-error', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  // Intentionally try to find a non-existent entry to trigger NotFoundError
  await entriesService.findById({ id: '00000000-0000-0000-0000-000000000000', userId: appUser.id });
  res.json({ data: 'This should not be reached' });
}));

// GET /test-error-demo - Demo endpoint without auth (for testing error logging)
// Must come before /:id
router.get('/test-error-demo', asyncHandler(async (req: Request, res: Response) => {
  // Use a valid UUID format for demonstration
  const mockUserId = '00000000-0000-0000-0000-000000000001';
  // Intentionally try to find a non-existent entry to trigger NotFoundError
  await entriesService.findById({ id: '00000000-0000-0000-0000-000000000000', userId: mockUserId });
  res.json({ data: 'This should not be reached' });
}));

// GET /:id - get single entry
router.get('/:id', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  const entry = await entriesService.findById({ id: req.params.id, userId: appUser.id });
  res.json({ data: entry });
}));

// POST / - create entry (body: entryDate? as ISO string)
router.post('/', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  const entryDate = req.body.entryDate ? new Date(req.body.entryDate) : undefined;
  const entry = await entriesService.createOrGetByDate({ userId: appUser.id, entryDate });
  res.status(201).json({ data: entry });
}));

// POST / - create entry title
router.post('/:id/title', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;
  const entry = await entriesService.updateTitle({ id, content });
  res.status(201).json({ data: entry });
}));

// PUT /:id - update entry (body: content?, plainText?, entryDate?, aiTitle?)
router.put('/:id', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  const { content, plainText, entryDate, aiTitle } = req.body;
  const updateData: Record<string, unknown> = {};
  if (content !== undefined) updateData.content = content;
  if (plainText !== undefined) updateData.plainText = plainText;
  if (entryDate !== undefined) updateData.entryDate = new Date(entryDate);
  if (aiTitle !== undefined) updateData.aiTitle = aiTitle;
  const updated = await entriesService.update({ id: req.params.id, userId: appUser.id, data: updateData });
  res.json({ data: updated });
}));

// DELETE /:id - hard delete
router.delete('/:id', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  await entriesService.delete({ id: req.params.id, userId: appUser.id });
  res.status(204).send();
}));

export default router;
