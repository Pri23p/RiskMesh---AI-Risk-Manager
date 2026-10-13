import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../../utils/errors';
import { logger } from '../../config/logger';

export const errorHandler = (
  error: FastifyError | AppError | ZodError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void => {
  const reqInfo = {
    method: request.method,
    url: request.url,
    requestId: request.id,
  };

  // 1. Handled Domain AppError
  if (error instanceof AppError || (error && (error as AppError).isOperational)) {
    const appErr = error as AppError;
    const statusCode = appErr.statusCode || 500;
    logger.warn({ ...reqInfo, err: appErr.message, statusCode }, 'Application Error');
    reply.status(statusCode).send({
      success: false,
      error: {
        code: appErr.name || 'APPLICATION_ERROR',
        message: appErr.message,
        details: appErr.details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // 2. Zod Validation Error
  if (error instanceof ZodError || error.name === 'ZodError' || 'issues' in error) {
    const zodErr = error as ZodError;
    const formatted = Array.isArray(zodErr.issues)
      ? zodErr.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          rule: issue.code,
        }))
      : [];

    logger.warn({ ...reqInfo, validationErrors: formatted }, 'Validation Error');
    reply.status(422).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request payload validation failed',
        details: formatted,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // 3. Fastify Schema Validation Error
  if ('validation' in error && error.validation) {
    logger.warn({ ...reqInfo, validation: error.validation }, 'Fastify Validation Error');
    reply.status(400).send({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: error.message,
        details: error.validation,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // 4. Prisma Known / Connection Error (Duck-typing check)
  if (error.name === 'PrismaClientKnownRequestError') {
    logger.error({ ...reqInfo, prismaError: error.message }, 'Database Error');
    reply.status(400).send({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'A database constraint error occurred',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // 5. Unhandled / Internal Server Error
  logger.error({ ...reqInfo, err: error.stack || error.message }, 'Unhandled Internal Server Error');
  reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};
