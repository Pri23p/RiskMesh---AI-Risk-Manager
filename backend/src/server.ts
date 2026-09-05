import { buildApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './infrastructure/database/prisma.js';
import { logger } from './utils/logger.js';

async function startServer(): Promise<void> {
  const app = buildApp();

  try {
    // Attempt database connection check
    try {
      await connectDatabase();
      logger.info('Connected to PostgreSQL via Prisma');
    } catch (dbError) {
      logger.warn(
        { err: dbError },
        'PostgreSQL connection not established yet. Ensure docker-compose is running.'
      );
    }

    // Start listening
    const address = await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    logger.info(`RiskMesh Backend running at: ${address}`);
    logger.info(`Health check available at: ${address}/health`);
    logger.info(`API endpoints prefix: ${address}${env.API_PREFIX}`);

    // Graceful Shutdown handling
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      try {
        await app.close();
        logger.info('HTTP server closed');
        await disconnectDatabase();
        logger.info('Database connection closed');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during graceful shutdown');
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start RiskMesh server');
    process.exit(1);
  }
}

void startServer();
