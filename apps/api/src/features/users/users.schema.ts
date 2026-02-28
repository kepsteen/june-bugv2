import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { user } from '../auth/auth.table.js';

/**
 * ============================================================================
 * LAYER 1: Base/Reusable Schemas (Domain-Agnostic)
 * ============================================================================
 * These validation rules are not tied to database tables.
 */

export const userIdSchema = z.string().min(1, 'Invalid ID format');

/**
 * URL parameter validation for user ID
 */
export const userIdParamSchema = z.object({
  id: userIdSchema,
});

/**
 * Reusable pagination query schema with coercion
 * Query strings are always strings, so we coerce to expected types
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100, 'Limit cannot exceed 100')
    .default(20),
});

/**
 * User list filtering with pagination
 */
export const userFilterQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  role: z.enum(['admin', 'user']).optional(),
  active: z.coerce.boolean().optional(),
});

/**
 * ============================================================================
 * LAYER 2: Database-Derived Schemas (Private/Internal)
 * ============================================================================
 * Generated from Drizzle tables with field-level refinements.
 * Note: Drizzle automatically makes fields with defaults optional:
 *   - id (defaultRandom) → optional
 *   - emailVerified (default false) → optional
 *   - createdAt, updatedAt (defaultNow) → optional
 */

const baseInsertUserSchema = createInsertSchema(user, {
  email: (schema) =>
    schema
      .email({ message: 'Invalid email format' })
      .max(255, 'Email must be less than 255 characters')
      .toLowerCase()
      .trim(),
  name: (schema) =>
    schema
      .min(1, 'Name is required')
      .max(100, 'Name must be less than 100 characters')
      .trim(),
});

export const selectUserSchema = createSelectSchema(user);

/**
 * ============================================================================
 * LAYER 3: Domain Schemas (Public API)
 * ============================================================================
 * Use .pick() to explicitly select user-controlled fields, then add business logic.
 */

/**
 * User creation schema
 * Picks user-controlled fields (email, name) and adds password field
 */
export const createUserSchema = baseInsertUserSchema
  .pick({
    email: true,
    name: true,
  })
  .extend({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(255, 'Password must be less than 255 characters'),
  });

/**
 * User update schema (PUT)
 * Picks only user-controlled fields (email, name) - both required for full resource replacement
 */
export const updateUserSchema = baseInsertUserSchema.pick({
  email: true,
  name: true,
});

/**
 * ============================================================================
 * LAYER 4: Request-Level Schemas
 * ============================================================================
 * Combine body, params, query validation for different request types.
 */

export const updateUserRequestSchema = z.object({
  body: updateUserSchema,
});

export const getUserRequestSchema = z.object({
  params: userIdParamSchema,
});

export const listUsersRequestSchema = z.object({
  query: userFilterQuerySchema,
});

/**
 * ============================================================================
 * Type Exports
 * ============================================================================
 * Exported types for use in controllers.
 */

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type SelectUser = z.infer<typeof selectUserSchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type UserFilterQuery = z.infer<typeof userFilterQuerySchema>;
