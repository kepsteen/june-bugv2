import { AppError } from './AppError.js';

/**
 * Authentication error for missing or invalid credentials
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, true);
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, true);
  }
}

/**
 * Conflict error for duplicate resources or state conflicts
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, true);
  }
}
