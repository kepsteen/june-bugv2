/**
 * Base error class for all application errors
 * Provides consistent structure with status codes and operational flags
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Captures stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
  }
}
