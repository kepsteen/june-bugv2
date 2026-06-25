/**
 * Base error class for all application errors
 * Provides consistent structure with status codes and operational flags
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly feature?: string;
  public context?: {
    // HTTP Request context
    method?: string;
    path?: string;
    params?: Record<string, any>;
    query?: Record<string, any>;
    userId?: string;
    
    // Service call context
    service?: string;              // e.g., "entriesService"
    serviceMethod?: string;         // e.g., "updateTitle"
    serviceArgs?: any;              // Options object passed to the service method
    
    timestamp?: string;
  };

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    options?: { code?: string; feature?: string },
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = options?.code;
    this.feature = options?.feature;

    // Maintains proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Captures stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
  }
}
