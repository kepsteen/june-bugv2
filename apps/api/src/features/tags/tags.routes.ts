import { Router, type Router as RouterType, type Request, type Response, type NextFunction } from 'express';
import { AuthMiddleware } from '../../middleware/auth-middleware.js';
import { tagsService } from './tags.service.js';
import { appUsersService } from '../app-users/app-users.service.js';

const router: RouterType = Router();

// Helper: get or create app user from Better Auth session
async function getAppUser(res: Response) {
  const authUser = res.locals.user;
  return appUsersService.findOrCreate(authUser.id, authUser.email);
}

// GET / - list all tags (system + user)
router.get('/', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    const tagList = await tagsService.list(appUser.id);
    res.json({ data: tagList });
  } catch (error) {
    next(error);
  }
});

// GET /system - list system tags
// Must come before /:id
router.get('/system', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const systemTags = await tagsService.listSystem();
    res.json({ data: systemTags });
  } catch (error) {
    next(error);
  }
});

// GET /user - list user's custom tags
// Must come before /:id
router.get('/user', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    const userTags = await tagsService.listUser(appUser.id);
    res.json({ data: userTags });
  } catch (error) {
    next(error);
  }
});

// GET /stats - tag usage stats
// Must come before /:id
router.get('/stats', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ data: [] });
  } catch (error) {
    next(error);
  }
});

// GET /:id - get single tag
router.get('/:id', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tag = await tagsService.findById(req.params.id);
    res.json({ data: tag });
  } catch (error) {
    next(error);
  }
});

// POST / - create tag (body: name, emoji?, color?)
router.post('/', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    const { name, emoji, color } = req.body;
    const tag = await tagsService.create(appUser.id, { name, emoji, color });
    res.status(201).json({ data: tag });
  } catch (error) {
    next(error);
  }
});

// PUT /:id - update tag
router.put('/:id', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    const { name, emoji, color } = req.body;
    const updated = await tagsService.update(req.params.id, appUser.id, { name, emoji, color });
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id - soft delete
router.delete('/:id', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    await tagsService.softDelete(req.params.id, appUser.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
