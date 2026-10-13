import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { VerificationController } from './verification.controller';
import { validateRequest } from '../../infrastructure/middleware/validator';
import {
  initiateVerificationSchema,
  verificationParamsSchema,
  verifyCodeSchema,
} from './verification.schemas';

export const verificationRoutes: FastifyPluginAsync = async (fastify: FastifyInstance): Promise<void> => {
  const controller = new VerificationController();

  fastify.post(
    '/initiate',
    {
      preHandler: validateRequest({ body: initiateVerificationSchema }),
    },
    controller.initiate
  );

  fastify.post(
    '/verify',
    {
      preHandler: validateRequest({ body: verifyCodeSchema }),
    },
    controller.verify
  );

  fastify.get(
    '/:id',
    {
      preHandler: validateRequest({ params: verificationParamsSchema }),
    },
    controller.getStatus
  );
};
