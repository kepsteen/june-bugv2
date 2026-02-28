import { Router, type Router as RouterType, type Request, type Response, type NextFunction } from 'express';
import { AuthMiddleware } from '../../middleware/auth-middleware.js';
import { entriesService } from './entries.service.js';
import { appUsersService } from '../app-users/app-users.service.js';

const router: RouterType = Router({ mergeParams: true });

// Helper: get or create app user from Better Auth session
async function getAppUser(res: Response) {
  const authUser = res.locals.user; // Better Auth user
  return appUsersService.findOrCreate(authUser.id, authUser.email);
}

// GET / - list entries (query param includeInactive)
router.get('/', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    const includeInactive = req.query.includeInactive === 'true';
    const entryList = await entriesService.list(appUser.id, includeInactive);
    res.json({ data: entryList });
  } catch (error) {
    next(error);
  }
});

// GET /search - search entries (query param q)
// Must come before /:id
router.get('/search', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const results = await entriesService.search(appUser.id, q);
    res.json({ data: results });
  } catch (error) {
    next(error);
  }
});

// GET /range - get by date range (query params start, end as ISO strings)
// Must come before /:id
router.get('/range', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    const start = new Date(req.query.start as string);
    const end = new Date(req.query.end as string);
    const results = await entriesService.getByRange(appUser.id, start, end);
    res.json({ data: results });
  } catch (error) {
    next(error);
  }
});

// GET /:id - get single entry
router.get('/:id', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    const entry = await entriesService.findById(req.params.id, appUser.id);
    res.json({ data: entry });
  } catch (error) {
    next(error);
  }
});

// POST / - create entry (body: entryDate? as ISO string)
router.post('/', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    const entryDate = req.body.entryDate ? new Date(req.body.entryDate) : undefined;
    const entry = await entriesService.createOrGetByDate(appUser.id, entryDate);
    res.status(201).json({ data: entry });
  } catch (error) {
    next(error);
  }
});

// PUT /:id - update entry (body: content?, plainText?, entryDate?, aiTitle?)
router.put('/:id', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    const { content, plainText, entryDate, aiTitle } = req.body;
    const updateData: Record<string, unknown> = {};
    if (content !== undefined) updateData.content = content;
    if (plainText !== undefined) updateData.plainText = plainText;
    if (entryDate !== undefined) updateData.entryDate = new Date(entryDate);
    if (aiTitle !== undefined) updateData.aiTitle = aiTitle;
    const updated = await entriesService.update(req.params.id, appUser.id, updateData);
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id - soft delete
router.delete('/:id', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    await entriesService.softDelete(req.params.id, appUser.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// DELETE /:id/permanent - hard delete
router.delete('/:id/permanent', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    await entriesService.permanentDelete(req.params.id, appUser.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
