import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { AuthMiddleware } from '../../middleware/auth-middleware.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { todosService } from './todos.service.js';
import { appUsersService } from '../app-users/app-users.service.js';

const router: RouterType = Router();

// Helper: get or create app user from Better Auth session
async function getAppUser(res: Response) {
  const authUser = res.locals.user;
  return appUsersService.findOrCreate({ authId: authUser.id, email: authUser.email });
}

// GET / - list todos
router.get('/', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  const todoList = await todosService.list({ userId: appUser.id });
  res.json({ data: todoList });
}));

// POST / - create todo (body: text)
router.post('/', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  const { text } = req.body;
  const todo = await todosService.create({ userId: appUser.id, text });
  res.status(201).json({ data: todo });
}));

// PUT /:id/toggle - toggle completion
router.put('/:id/toggle', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  const updated = await todosService.toggle({ id: req.params.id, userId: appUser.id });
  res.json({ data: updated });
}));

// DELETE /:id - delete
router.delete('/:id', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  const appUser = await getAppUser(res);
  await todosService.delete({ id: req.params.id, userId: appUser.id });
  res.status(204).send();
}));

export default router;
