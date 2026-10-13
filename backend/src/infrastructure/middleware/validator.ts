import { FastifyRequest } from 'fastify';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../../utils/errors';

interface ValidationSchema {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export const validateRequest = (schema: ValidationSchema) => {
  return async (request: FastifyRequest): Promise<void> => {
    try {
      if (schema.body) {
        request.body = await schema.body.parseAsync(request.body ?? {});
      }
      if (schema.query) {
        request.query = await schema.query.parseAsync(request.query ?? {});
      }
      if (schema.params) {
        request.params = await schema.params.parseAsync(request.params ?? {});
      }
    } catch (error) {
      if (error instanceof ZodError || (error && typeof error === 'object' && 'issues' in error)) {
        const zodErr = error as ZodError;
        const formatted = zodErr.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          rule: issue.code,
        }));
        throw new ValidationError('Request payload validation failed', formatted);
      }
      throw error;
    }
  };
};
