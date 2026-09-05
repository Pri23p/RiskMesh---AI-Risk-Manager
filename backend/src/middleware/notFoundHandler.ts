import { FastifyReply, FastifyRequest } from 'fastify';
import { createErrorResponse } from '../utils/response.js';

export function notFoundHandler(request: FastifyRequest, reply: FastifyReply): void {
  reply.status(404).send(
    createErrorResponse(
      'ROUTE_NOT_FOUND',
      `Cannot ${request.method} ${request.url}`,
      undefined,
      request.url
    )
  );
}
