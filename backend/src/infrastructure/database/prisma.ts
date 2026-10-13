import { PrismaClient } from '@prisma/client';
import { logger } from '../../config/logger';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Attach event listeners for structured logging
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(prisma as any).$on?.('error', (e: unknown) => {
  logger.error({ error: e }, 'Prisma Database Error');
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(prisma as any).$on?.('warn', (e: unknown) => {
  logger.warn({ warning: e }, 'Prisma Database Warning');
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected via Prisma Client');
  } catch (error) {
    logger.error({ error }, '❌ Failed to connect to PostgreSQL');
    // In dev or local testing without live postgres, allow graceful continuation
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  logger.info('PostgreSQL disconnected');
};
