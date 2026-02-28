import { AppError } from './AppError.js';

/**
 * Validation error with structured field-level details
 * Used for request validation failures (body, query, params, headers)
 */
export class ValidationError extends AppError {
  public readonly details: Array<{ path: string[]; message: string }>;

  constructor(
    message: string = 'Validation failed',
    details: Array<{ path: string[]; message: string }> = []
  ) {
    super(message, 400, true);
    this.details = details;
  }
}
