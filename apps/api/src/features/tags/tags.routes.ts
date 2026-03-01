import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { AuthMiddleware } from '../../middleware/auth-middleware.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { tagsService } from './tags.service.js';
import { appUsersService } from '../app-users/app-users.service.js';

const router: RouterType = Router();

// Helper: get or create app user from Better Auth session
async function getAppUser(res: Response) {
  const authUser = res.locals.user;
  return appUsersService.findOrCreate({ authId: authUser.id, email: authUser.email });
}

// GET / - list all tags (system + user)
router.get('/', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  const tagList = await tagsService.list({ userId: appUser.id });
  res.json({ data: tagList });
}));

// GET /system - list system tags
// Must come before /:id
router.get('/system', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const systemTags = await tagsService.listSystem({});
  res.json({ data: systemTags });
}));

// GET /user - list user's custom tags
// Must come before /:id
router.get('/user', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  const userTags = await tagsService.listUser({ userId: appUser.id });
  res.json({ data: userTags });
}));

// GET /stats - tag usage stats
// Must come before /:id
router.get('/stats', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: [] });
}));

// GET /:id - get single tag
router.get('/:id', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const tag = await tagsService.findById({ id: req.params.id });
  res.json({ data: tag });
}));

// POST / - create tag (body: name, emoji?, color?)
router.post('/', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  const { name, emoji, color } = req.body;
  const tag = await tagsService.create({ userId: appUser.id, data: { name, emoji, color } });
  res.status(201).json({ data: tag });
}));

// PUT /:id - update tag
router.put('/:id', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  const { name, emoji, color } = req.body;
  const updated = await tagsService.update({ id: req.params.id, userId: appUser.id, data: { name, emoji, color } });
  res.json({ data: updated });
}));

// DELETE /:id - hard delete
router.delete('/:id', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  await tagsService.delete({ id: req.params.id, userId: appUser.id });
  res.status(204).send();
}));

export default router;
