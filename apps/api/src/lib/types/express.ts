import type { Request } from 'express';

/**
 * Extended Express Request with typed validated data
 * Use with Zod schemas for full type inference from schema to controller
 *
 * @example
 * const schema = z.object({ email: z.string().email() });
 *
 * handler: async (
 *   req: ValidatedRequest<z.infer<typeof schema>>,
 *   res: Response
 * ) => {
 *   // req.body.email is fully typed as string
 *   const { email } = req.body;
 * }
 */
export interface ValidatedRequest<
  TBody = any,
  TQuery = any,
  TParams = any,
  THeaders = any
> extends Omit<Request, 'body' | 'query' | 'params' | 'headers'> {
  body: TBody;
  query: TQuery;
  params: TParams;
  headers: THeaders & Request['headers'];
}
