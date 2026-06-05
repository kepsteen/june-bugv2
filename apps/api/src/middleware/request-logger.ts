import type { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware similar to Next.js
 * Logs all requests with method, path, status code, and response time
 * Format: GET /api/entries 200 in 45ms
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const { method, originalUrl } = req;

  // Override res.end to capture response status and timing
  const originalEnd = res.end;
  res.end = function (this: Response, ...args: unknown[]) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const statusColor = getStatusColor(statusCode);
    const statusSymbol = getStatusSymbol(statusCode);

    // Format similar to Next.js: GET /api/entries 200 in 45ms
    // Or: GET /api/entries 404 in 12ms
    const logMessage = `${method} ${originalUrl} ${statusColor}${statusCode}\x1b[0m ${statusSymbol} in ${duration}ms`;
    console.log(logMessage);

    return (originalEnd as (...args: unknown[]) => Response).apply(this, args);
  } as typeof res.end;

  next();
}

/**
 * Get ANSI color code for HTTP status code
 */
function getStatusColor(statusCode: number): string {
  if (statusCode >= 500) return '\x1b[31m'; // Red for server errors
  if (statusCode >= 400) return '\x1b[33m'; // Yellow for client errors
  if (statusCode >= 300) return '\x1b[36m'; // Cyan for redirects
  return '\x1b[32m'; // Green for success
}

/**
 * Get status symbol for visual indication
 */
function getStatusSymbol(statusCode: number): string {
  if (statusCode >= 500) return '⚠️ '; // Server error
  if (statusCode >= 400) return '⚠️ '; // Client error
  return '✓'; // Success
}
