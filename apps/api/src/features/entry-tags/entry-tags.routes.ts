import { Router, type Router as RouterType, type Request, type Response, type NextFunction } from 'express';
import { AuthMiddleware } from '../../middleware/auth-middleware.js';
import { entryTagsService } from './entry-tags.service.js';
import { appUsersService } from '../app-users/app-users.service.js';

// Helper: get or create app user from Better Auth session
async function getAppUser(res: Response) {
  const authUser = res.locals.user;
  return appUsersService.findOrCreate(authUser.id, authUser.email);
}

// Router for /api/entries/:entryId/tags
const entryTagsRouter: RouterType = Router({ mergeParams: true });

// GET /api/entries/:entryId/tags - get tags for an entry
entryTagsRouter.get('/', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    const { entryId } = req.params;
    const tagList = await entryTagsService.getEntryTags(entryId, appUser.id);
    res.json({ data: tagList });
  } catch (error) {
    next(error);
  }
});

// POST /api/entries/:entryId/tags - add tag to entry (body: tagId)
entryTagsRouter.post('/', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    const { entryId } = req.params;
    const { tagId } = req.body;
    await entryTagsService.addTagToEntry(entryId, tagId, appUser.id);
    res.status(201).json({ data: { entryId, tagId } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/entries/:entryId/tags/:tagId - remove tag from entry
entryTagsRouter.delete('/:tagId', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    const { entryId, tagId } = req.params;
    await entryTagsService.removeTagFromEntry(entryId, tagId, appUser.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// PUT /api/entries/:entryId/tags - bulk set tags (body: tagIds[])
entryTagsRouter.put('/', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    const { entryId } = req.params;
    const { tagIds } = req.body;
    await entryTagsService.setEntryTags(entryId, tagIds ?? [], appUser.id);
    res.json({ data: { entryId, tagIds } });
  } catch (error) {
    next(error);
  }
});

// Router for /api/tags/:tagId/entries
const tagEntriesRouter: RouterType = Router({ mergeParams: true });

// GET /api/tags/:tagId/entries - get entries with a specific tag
tagEntriesRouter.get('/', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    const { tagId } = req.params;
    const entryList = await entryTagsService.getEntriesWithTag(tagId, appUser.id);
    res.json({ data: entryList });
  } catch (error) {
    next(error);
  }
});

export { entryTagsRouter, tagEntriesRouter };
