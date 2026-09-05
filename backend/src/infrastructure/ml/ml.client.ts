import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export interface TransactionMLFeatures {
  amount: number;
  currency: string;
  paymentMethod: string;
  customerAvgAmount: number;
  transactionsLast10Min: number;
  transactionsLast24Hours: number;
  failedAttempts: number;
  accountAge: number;
  isNewDevice: number;
  isNewIp: number;
  previousFraudCount: number;
}

export interface MLPredictResponse {
  fraudProbability: number;
  riskScore: number;
  modelVersion: string;
}

export interface MLRiskFactor {
  feature: string;
  impact: string;
  contribution?: number;
  value?: unknown;
}

export interface MLExplainResponse {
  fraudProbability: number;
  riskScore: number;
  modelVersion: string;
  riskFactors: MLRiskFactor[];
}

export class MLServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'MLServiceError';
  }
}

export class MLTimeoutError extends MLServiceError {
  constructor(timeoutMs: number) {
    super(`ML service request timed out after ${timeoutMs}ms`);
    this.name = 'MLTimeoutError';
  }
}

export class MLUnavailableError extends MLServiceError {
  constructor(cause?: unknown) {
    super('ML service is unreachable or unavailable', 503, cause);
    this.name = 'MLUnavailableError';
  }
}

export class MLClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(baseUrl = env.ML_SERVICE_URL, timeoutMs = env.ML_SERVICE_TIMEOUT_MS) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.timeoutMs = timeoutMs;
  }

  async predict(features: TransactionMLFeatures): Promise<MLPredictResponse> {
    const url = `${this.baseUrl}/predict`;
    return this.postRequest<MLPredictResponse>(url, { features });
  }

  async explain(features: TransactionMLFeatures): Promise<MLExplainResponse> {
    const url = `${this.baseUrl}/explain`;
    return this.postRequest<MLExplainResponse>(url, { features });
  }

  private async postRequest<T>(url: string, payload: unknown): Promise<T> {
    logger.debug({ url, timeoutMs: this.timeoutMs }, 'Sending request to Python ML service');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        logger.error(
          { url, status: response.status, errorText },
          'ML service returned non-2xx status'
        );
        throw new MLServiceError(
          `ML service responded with status ${response.status}: ${errorText}`,
          response.status,
          errorText
        );
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      if (err instanceof MLServiceError) {
        throw err;
      }

      if (err instanceof Error) {
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
          logger.error({ url, timeoutMs: this.timeoutMs }, 'ML service request timed out');
          throw new MLTimeoutError(this.timeoutMs);
        }
      }

      logger.error({ url, err }, 'Failed to communicate with ML service');
      throw new MLUnavailableError(err);
    }
  }
}
