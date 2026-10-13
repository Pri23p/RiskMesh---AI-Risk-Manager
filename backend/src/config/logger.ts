import pino from 'pino';
import { config } from './env';

export const logger = pino({
  level: config.LOG_LEVEL,
  transport:
    config.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  base: {
    env: config.NODE_ENV,
    service: 'risksentinel-backend',
  },
  redact: ['req.headers.authorization', 'password', 'token', 'codeHash'],
});
