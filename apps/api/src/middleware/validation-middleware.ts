import type { Request, Response, NextFunction } from 'express';
import { z, ZodError, type ZodType } from 'zod';
import { ValidationError } from '../lib/errors/index.js';

/**
 * Recursively converts empty strings to null in an object
 * Handles nested objects and arrays
 */
function convertEmptyStringsToNull(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return obj === '' ? null : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertEmptyStringsToNull);
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertEmptyStringsToNull(value);
    }
    return result;
  }

  return obj;
}

/**
 * Transforms a ZodError into a ValidationError with structured details
 */
function transformZodError(error: ZodError<unknown>): ValidationError {
  const details = error.issues.map((err) => ({
    path: err.path.map(String),
    message: err.message,
  }));

  return new ValidationError('Validation failed', details);
}

/**
 * Validation middleware factory
 * Accepts a single Zod schema that validates the entire request structure
 *
 * @example
 * // Define a request schema with body, params, and/or query
 * const updateUserRequestSchema = z.object({
 *   body: updateUserSchema,
 *   params: z.object({ id: z.string().uuid() }).optional(),
 *   query: z.object({ notify: z.coerce.boolean() }).optional()
 * });
 *
 * router.patch('/:id', validate(updateUserRequestSchema), controller.update);
 */
export function ValidationMiddleware(schema: ZodType) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Convert empty strings to null in the request body
      const processedBody = convertEmptyStringsToNull(req.body);

      // Parse the entire request structure at once
      const validated = (await schema.parseAsync({
        body: processedBody,
        params: req.params,
        query: req.query,
        headers: req.headers,
      })) as Record<string, unknown>;

      // Destructure and assign validated values back to request
      if ('body' in validated && validated.body !== undefined) {
        req.body = validated.body as Request['body'];
      }
      if ('params' in validated && validated.params !== undefined) {
        req.params = validated.params as Request['params'];
      }
      if ('query' in validated && validated.query !== undefined) {
        req.query = validated.query as Request['query'];
      }
      if ('headers' in validated && validated.headers !== undefined) {
        req.headers = validated.headers as Request['headers'];
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(transformZodError(error));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Convenience helper for validating request body only
 *
 * @example
 * router.post('/users', validateBody(createUserSchema), controller.create);
 */
export function validateBody(schema: ZodType) {
  return ValidationMiddleware(z.object({ body: schema }));
}

/**
 * Convenience helper for validating query parameters only
 *
 * @example
 * router.get('/users', validateQuery(paginationSchema), controller.list);
 */
export function validateQuery(schema: ZodType) {
  return ValidationMiddleware(z.object({ query: schema }));
}

/**
 * Convenience helper for validating URL parameters only
 *
 * @example
 * router.get('/users/:id', validateParams(userIdSchema), controller.getById);
 */
export function validateParams(schema: ZodType) {
  return ValidationMiddleware(z.object({ params: schema }));
}
