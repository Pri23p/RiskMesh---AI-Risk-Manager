import { buildApp } from './app';
import { config } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './infrastructure/database/prisma';

const startServer = async (): Promise<void> => {
  try {
    // 1. Connect database (Prisma)
    await connectDatabase();

    // 2. Build Fastify application
    const app = await buildApp();

    // 3. Start listening
    await app.listen({
      port: config.PORT,
      host: config.HOST,
    });

    logger.info(
      `🚀 RiskSentinel Backend Server running on http://${config.HOST}:${config.PORT}`
    );
    logger.info(`🔍 Health check: http://${config.HOST}:${config.PORT}/health`);
    logger.info(`🛡️ API endpoints: http://${config.HOST}:${config.PORT}${config.API_PREFIX}`);

    // 4. Graceful shutdown handlers
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, initiating graceful shutdown...`);
        try {
          await app.close();
          await disconnectDatabase();
          logger.info('Server and database shut down gracefully');
          process.exit(0);
        } catch (err) {
          logger.error({ err }, 'Error during graceful shutdown');
          process.exit(1);
        }
      });
    }
  } catch (error) {
    logger.error({ error }, 'Fatal error while starting server');
    process.exit(1);
  }
};

void startServer();
