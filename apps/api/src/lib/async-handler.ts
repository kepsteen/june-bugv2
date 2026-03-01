import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from './errors/index.js';

/**
 * Wraps an async route handler to automatically catch errors and enrich them
 * with HTTP request context. Eliminates the need for try-catch blocks in routes.
 * 
 * @param fn - Async route handler function
 * @returns Express middleware function
 */
export const asyncHandler = (fn: RequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      if (error instanceof AppError) {
        // Add HTTP request context (service context already added by wrapper)
        error.context = {
          ...error.context,
          method: req.method,
          path: req.path,
          params: req.params,
          query: req.query,
          userId: res.locals.user?.id,
          timestamp: new Date().toISOString(),
        };
      }
      next(error);
    });
  };
};
