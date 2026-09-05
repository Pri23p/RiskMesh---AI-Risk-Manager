import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { createErrorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export function errorHandler(
  error: FastifyError | AppError | ZodError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const path = request.url;

  // Handle Zod Schema Validation Errors
  if (error instanceof ZodError) {
    const formattedErrors = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      rule: err.code,
    }));

    logger.warn({ path, errors: formattedErrors }, 'Request validation failed');

    reply.status(422).send(
      createErrorResponse('VALIDATION_ERROR', 'Request validation failed', formattedErrors, path)
    );
    return;
  }

  // Handle Custom Operational App Errors
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error({ err: error, path }, error.message);
    } else {
      logger.warn({ statusCode: error.statusCode, code: error.code, path }, error.message);
    }

    reply.status(error.statusCode).send(
      createErrorResponse(error.code, error.message, error.details, path)
    );
    return;
  }

  // Handle Fastify standard validation / body parsing errors
  const fastifyErr = error as FastifyError;
  if (fastifyErr.validation) {
    logger.warn({ path, validation: fastifyErr.validation }, fastifyErr.message);
    reply.status(400).send(
      createErrorResponse('BAD_REQUEST', fastifyErr.message, fastifyErr.validation, path)
    );
    return;
  }

  // Unhandled / Internal Server Errors
  logger.error({ err: error, path }, 'Unhandled internal server error');

  const statusCode = fastifyErr.statusCode && fastifyErr.statusCode >= 400 && fastifyErr.statusCode < 600
    ? fastifyErr.statusCode
    : 500;

  reply.status(statusCode).send(
    createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      statusCode === 500 ? 'An unexpected internal server error occurred' : error.message,
      undefined,
      path
    )
  );
}
