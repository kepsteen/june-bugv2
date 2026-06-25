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

/**
 * Forbidden error for operations the user is not allowed to perform
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, true);
  }
}

/**
 * Upgrade required error for subscription-gated features
 */
export class UpgradeRequiredError extends AppError {
  constructor(feature: string, message: string = 'Upgrade required') {
    super(message, 402, true, { code: 'upgrade_required', feature });
  }
}
