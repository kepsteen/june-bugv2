import { AppError } from './errors/index.js';

/**
 * Wraps a service object to automatically enrich errors with service call context.
 * All service methods must accept a single options object parameter.
 * 
 * @param serviceName - Name of the service (e.g., "entriesService")
 * @param service - Service object with methods to wrap
 * @returns Wrapped service with error context enrichment
 */
export function wrapService<T extends Record<string, Function>>(
  serviceName: string,
  service: T
): T {
  const wrapped: any = {};
  
  for (const [methodName, method] of Object.entries(service)) {
    if (typeof method !== 'function') continue;
    
    wrapped[methodName] = async (options: any) => {
      try {
        return await method(options);
      } catch (error) {
        if (error instanceof AppError) {
          // Enrich with service call context in callable format
          error.context = {
            ...error.context,
            service: serviceName,
            serviceMethod: methodName,
            serviceArgs: options, // Single options object
          };
        }
        throw error;
      }
    };
  }
  
  return wrapped as T;
}
