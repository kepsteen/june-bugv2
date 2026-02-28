import { Router, type Router as RouterType, type Request, type Response, type NextFunction } from 'express';
import { AuthMiddleware } from '../../middleware/auth-middleware.js';

const router: RouterType = Router();

// POST /presigned-url - returns a mock presigned URL
// (S3 implementation can be wired when env vars are set)
router.post('/presigned-url', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ data: { url: '', fields: {} } });
  } catch (error) {
    next(error);
  }
});

// POST /complete - returns public URL after upload
router.post('/complete', AuthMiddleware(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ data: { publicUrl: '' } });
  } catch (error) {
    next(error);
  }
});

export default router;
