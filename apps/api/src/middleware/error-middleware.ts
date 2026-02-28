import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../lib/errors/index.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error with request context
  console.error(`[${req.method}] ${req.path}:`, err);

  // Handle ValidationError with structured details
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
  }

  // Handle other AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Fallback for unexpected ZodError (should be caught by validate middleware)
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((issue) => ({
        path: issue.path.map(String),
        message: issue.message,
      })),
    });
  }

  // Handle unexpected errors
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'development'
    ? err.message
    : 'Internal Server Error';

  res.status(statusCode).json({ error: message });
}
