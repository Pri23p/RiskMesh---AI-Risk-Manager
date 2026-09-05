import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URL'),
  API_PREFIX: z.string().default('/api'),
  CORS_ORIGIN: z.string().default('*'),
  ML_SERVICE_URL: z.string().url().default('http://127.0.0.1:8000'),
  ML_SERVICE_TIMEOUT_MS: z.coerce.number().positive().default(3000),
  RISK_THRESHOLD_APPROVE: z.coerce.number().min(0).max(100).default(30),
  RISK_THRESHOLD_BLOCK: z.coerce.number().min(0).max(100).default(75),
  EXPECTED_LOSS_HIGH_THRESHOLD: z.coerce.number().positive().default(50000),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_ENABLED: z.coerce.boolean().default(true),
  RATE_LIMIT_TRANSACTIONS_MAX: z.coerce.number().positive().default(100),
  RATE_LIMIT_TRANSACTIONS_WINDOW_SEC: z.coerce.number().positive().default(60),
  RATE_LIMIT_RISK_SCORE_MAX: z.coerce.number().positive().default(100),
  RATE_LIMIT_RISK_SCORE_WINDOW_SEC: z.coerce.number().positive().default(60),
  IDEMPOTENCY_TTL_SEC: z.coerce.number().positive().default(86400),
  CUSTOMER_CACHE_TTL_SEC: z.coerce.number().positive().default(300),
  RISK_STATE_TTL_SEC: z.coerce.number().positive().default(600),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('riskmesh-backend'),
  KAFKA_ENABLED: z.coerce.boolean().default(true),
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().positive().default(1000),
  OUTBOX_MAX_RETRIES: z.coerce.number().positive().default(5),
  OUTBOX_BATCH_SIZE: z.coerce.number().positive().default(50),
});



const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables configuration:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export type EnvConfig = z.infer<typeof envSchema>;
export const env = parsedEnv.data;
