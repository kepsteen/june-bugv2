import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { AuthMiddleware } from '../../middleware/auth-middleware.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { entryTagsService } from './entry-tags.service.js';
import { appUsersService } from '../app-users/app-users.service.js';

// Helper: get or create app user from Better Auth session
async function getAppUser(res: Response) {
  const authUser = res.locals.user;
  return appUsersService.findOrCreate({ authId: authUser.id, email: authUser.email });
}

// Router for /api/entries/:entryId/tags
const entryTagsRouter: RouterType = Router({ mergeParams: true });

// GET /api/entries/:entryId/tags - get tags for an entry
entryTagsRouter.get('/', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  const { entryId } = req.params;
  const tagList = await entryTagsService.getEntryTags({ entryId, userId: appUser.id });
  res.json({ data: tagList });
}));

// POST /api/entries/:entryId/tags - add tag to entry (body: tagId)
entryTagsRouter.post('/', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  const { entryId } = req.params;
  const { tagId } = req.body;
  await entryTagsService.addTagToEntry({ entryId, tagId, userId: appUser.id });
  res.status(201).json({ data: { entryId, tagId } });
}));

// DELETE /api/entries/:entryId/tags/:tagId - remove tag from entry
entryTagsRouter.delete('/:tagId', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  const { entryId, tagId } = req.params;
  await entryTagsService.removeTagFromEntry({ entryId, tagId, userId: appUser.id });
  res.status(204).send();
}));

// PUT /api/entries/:entryId/tags - bulk set tags (body: tagIds[])
entryTagsRouter.put('/', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  const { entryId } = req.params;
  const { tagIds } = req.body;
  await entryTagsService.setEntryTags({ entryId, tagIds: tagIds ?? [], userId: appUser.id });
  res.json({ data: { entryId, tagIds } });
}));

// Router for /api/tags/:tagId/entries
const tagEntriesRouter: RouterType = Router({ mergeParams: true });

// GET /api/tags/:tagId/entries - get entries with a specific tag
tagEntriesRouter.get('/', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  const { tagId } = req.params;
  const entryList = await entryTagsService.getEntriesWithTag({ tagId, userId: appUser.id });
  res.json({ data: entryList });
}));

export { entryTagsRouter, tagEntriesRouter };
