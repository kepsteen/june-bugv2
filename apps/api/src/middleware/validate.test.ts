import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationMiddleware, validateBody, validateQuery, validateParams } from './validation-middleware.js';
import { ValidationError } from '../lib/errors/index.js';

// Helper to create mock Express objects
function createMocks() {
  const req = {
    body: {},
    query: {},
    params: {},
    headers: {},
  } as Request;
  const res = {} as Response;
  const next = vi.fn();
  return { req, res, next };
}

describe('validate middleware', () => {
  describe('validate() with unified schema', () => {
    it('should validate body only', async () => {
      const { req, res, next } = createMocks();
      req.body = { name: 'John Doe', email: 'john@example.com' };

      const schema = z.object({
        body: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      });

      const middleware = ValidationMiddleware(schema);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body).toEqual({ name: 'John Doe', email: 'john@example.com' });
    });

    it('should validate params only', async () => {
      const { req, res, next } = createMocks();
      req.params = { id: '123e4567-e89b-12d3-a456-426614174000' };

      const schema = z.object({
        params: z.object({
          id: z.string().uuid(),
        }),
      });

      const middleware = ValidationMiddleware(schema);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.params.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should validate query only', async () => {
      const { req, res, next } = createMocks();
      req.query = { page: '1', limit: '20' };

      const schema = z.object({
        query: z.object({
          page: z.coerce.number().int().positive(),
          limit: z.coerce.number().int().positive(),
        }),
      });

      const middleware = ValidationMiddleware(schema);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.query).toEqual({ page: 1, limit: 20 });
    });

    it('should validate multiple parts together', async () => {
      const { req, res, next } = createMocks();
      req.body = { name: 'John Doe' };
      req.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
      req.query = { notify: 'true' };

      const schema = z.object({
        body: z.object({ name: z.string() }),
        params: z.object({ id: z.string().uuid() }),
        query: z.object({ notify: z.coerce.boolean() }),
      });

      const middleware = ValidationMiddleware(schema);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body).toEqual({ name: 'John Doe' });
      expect(req.params.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(req.query).toEqual({ notify: true });
    });

    it('should only validate parts included in the schema', async () => {
      const { req, res, next } = createMocks();
      req.body = { name: 'John Doe' };
      req.params = { someParam: 'ignored' };
      req.query = { someQuery: 'also-ignored' };

      // Only validate body, ignore params and query
      const schema = z.object({
        body: z.object({ name: z.string() }),
      });

      const middleware = ValidationMiddleware(schema);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body).toEqual({ name: 'John Doe' });
      // params and query are not validated, so they remain as-is
      expect(req.params).toEqual({ someParam: 'ignored' });
      expect(req.query).toEqual({ someQuery: 'also-ignored' });
    });

    it('should handle validation errors and transform to ValidationError', async () => {
      const { req, res, next } = createMocks();
      req.body = { email: 'invalid-email' };

      const schema = z.object({
        body: z.object({
          email: z.string().email(),
        }),
      });

      const middleware = ValidationMiddleware(schema);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Validation failed');
      expect(error.details).toBeDefined();
      expect(error.details.length).toBeGreaterThan(0);
    });

    it('should pass through non-Zod errors', async () => {
      const { req, res, next } = createMocks();
      const customError = new Error('Custom error');

      // Create a schema that throws a non-Zod error
      const schema = z.object({
        body: z.any().refine(() => {
          throw customError;
        }),
      });

      const middleware = ValidationMiddleware(schema);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(customError);
    });

    it('should handle multiple validation errors', async () => {
      const { req, res, next } = createMocks();
      req.body = { email: 'invalid', name: '' };

      const schema = z.object({
        body: z.object({
          email: z.string().email(),
          name: z.string().min(1, 'Name is required'),
        }),
      });

      const middleware = ValidationMiddleware(schema);
      await middleware(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.details.length).toBe(2);
    });
  });

  describe('validateBody() helper', () => {
    it('should validate only the request body', async () => {
      const { req, res, next } = createMocks();
      req.body = { name: 'John Doe', email: 'john@example.com' };

      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      const middleware = validateBody(schema);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body).toEqual({ name: 'John Doe', email: 'john@example.com' });
    });

    it('should reject invalid body data', async () => {
      const { req, res, next } = createMocks();
      req.body = { email: 'invalid-email' };

      const schema = z.object({
        email: z.string().email(),
      });

      const middleware = validateBody(schema);
      await middleware(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  describe('validateQuery() helper', () => {
    it('should validate only the query parameters', async () => {
      const { req, res, next } = createMocks();
      req.query = { page: '1', limit: '20' };

      const schema = z.object({
        page: z.coerce.number().int().positive(),
        limit: z.coerce.number().int().positive(),
      });

      const middleware = validateQuery(schema);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.query).toEqual({ page: 1, limit: 20 });
    });

    it('should reject invalid query parameters', async () => {
      const { req, res, next } = createMocks();
      req.query = { page: 'invalid' };

      const schema = z.object({
        page: z.coerce.number().int().positive(),
      });

      const middleware = validateQuery(schema);
      await middleware(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  describe('validateParams() helper', () => {
    it('should validate only the URL parameters', async () => {
      const { req, res, next } = createMocks();
      req.params = { id: '123e4567-e89b-12d3-a456-426614174000' };

      const schema = z.object({
        id: z.string().uuid(),
      });

      const middleware = validateParams(schema);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.params.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should reject invalid URL parameters', async () => {
      const { req, res, next } = createMocks();
      req.params = { id: 'not-a-uuid' };

      const schema = z.object({
        id: z.string().uuid(),
      });

      const middleware = validateParams(schema);
      await middleware(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  describe('empty string to null conversion', () => {
    it('should convert empty strings to null in body', async () => {
      const { req, res, next } = createMocks();
      req.body = { name: 'John', bio: '', age: 25 };

      const schema = z.object({
        body: z.object({
          name: z.string(),
          bio: z.string().nullable(),
          age: z.number(),
        }),
      });

      const middleware = ValidationMiddleware(schema);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body).toEqual({ name: 'John', bio: null, age: 25 });
    });

    it('should convert empty strings to null in nested objects', async () => {
      const { req, res, next } = createMocks();
      req.body = {
        user: {
          name: 'John',
          bio: '',
          address: {
            street: '',
            city: 'NYC',
          },
        },
      };

      const schema = z.object({
        body: z.object({
          user: z.object({
            name: z.string(),
            bio: z.string().nullable(),
            address: z.object({
              street: z.string().nullable(),
              city: z.string(),
            }),
          }),
        }),
      });

      const middleware = ValidationMiddleware(schema);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body).toEqual({
        user: {
          name: 'John',
          bio: null,
          address: {
            street: null,
            city: 'NYC',
          },
        },
      });
    });

    it('should convert empty strings to null in arrays', async () => {
      const { req, res, next } = createMocks();
      req.body = {
        tags: ['frontend', '', 'backend'],
        users: [
          { name: 'John', bio: '' },
          { name: 'Jane', bio: 'Developer' },
        ],
      };

      const schema = z.object({
        body: z.object({
          tags: z.array(z.string().nullable()),
          users: z.array(
            z.object({
              name: z.string(),
              bio: z.string().nullable(),
            })
          ),
        }),
      });

      const middleware = ValidationMiddleware(schema);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body).toEqual({
        tags: ['frontend', null, 'backend'],
        users: [
          { name: 'John', bio: null },
          { name: 'Jane', bio: 'Developer' },
        ],
      });
    });

    it('should preserve non-empty strings', async () => {
      const { req, res, next } = createMocks();
      req.body = { name: 'John', bio: 'Software Engineer' };

      const schema = z.object({
        body: z.object({
          name: z.string(),
          bio: z.string(),
        }),
      });

      const middleware = ValidationMiddleware(schema);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body).toEqual({ name: 'John', bio: 'Software Engineer' });
    });

    it('should not affect params, query, or headers', async () => {
      const { req, res, next } = createMocks();
      req.body = { name: '' };
      req.query = { filter: '' };
      req.params = { id: '' };

      const schema = z.object({
        body: z.object({
          name: z.string().nullable(),
        }),
        query: z.object({
          filter: z.string().optional(),
        }),
        params: z.object({
          id: z.string().optional(),
        }),
      });

      const middleware = ValidationMiddleware(schema);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      // Only body should have empty strings converted to null
      expect(req.body).toEqual({ name: null });
      // Query and params preserve empty strings
      expect(req.query).toEqual({ filter: '' });
      expect(req.params).toEqual({ id: '' });
    });
  });
});
