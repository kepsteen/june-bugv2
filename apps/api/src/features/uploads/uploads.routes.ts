import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { AuthMiddleware } from '../../middleware/auth-middleware.js';
import { asyncHandler } from '../../lib/async-handler.js';

const router: RouterType = Router();

// POST /presigned-url - returns a mock presigned URL
// (S3 implementation can be wired when env vars are set)
router.post('/presigned-url', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: { url: '', fields: {} } });
}));

// POST /complete - returns public URL after upload
router.post('/complete', AuthMiddleware(), asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: { publicUrl: '' } });
}));

export default router;
