import { Router, type Router as RouterType, type Request, type Response, type NextFunction } from 'express';
import { AuthMiddleware } from '../../middleware/auth-middleware.js';
import { todosService } from './todos.service.js';
import { appUsersService } from '../app-users/app-users.service.js';

const router: RouterType = Router();

// Helper: get or create app user from Better Auth session
async function getAppUser(res: Response) {
  const authUser = res.locals.user;
  return appUsersService.findOrCreate(authUser.id, authUser.email);
}

// GET / - list todos
router.get('/', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    const todoList = await todosService.list(appUser.id);
    res.json({ data: todoList });
  } catch (error) {
    next(error);
  }
});

// POST / - create todo (body: text)
router.post('/', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    const { text } = req.body;
    const todo = await todosService.create(appUser.id, text);
    res.status(201).json({ data: todo });
  } catch (error) {
    next(error);
  }
});

// PUT /:id/toggle - toggle completion
router.put('/:id/toggle', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    const updated = await todosService.toggle(req.params.id, appUser.id);
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id - delete
router.delete('/:id', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUser = await getAppUser(res);
    await todosService.delete(req.params.id, appUser.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
