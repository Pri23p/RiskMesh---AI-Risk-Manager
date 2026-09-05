import { Kafka, Producer, Consumer, KafkaConfig, ProducerRecord, RecordMetadata, logLevel } from 'kafkajs';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class KafkaClient {
  private static instance: KafkaClient | null = null;
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private isProducerConnected = false;
  private isDegraded = false;

  private constructor() {
    if (!env.KAFKA_ENABLED) {
      logger.info('Kafka is disabled via configuration. Operating in degraded outbox storage mode.');
      this.isDegraded = true;
      return;
    }

    this.initialize();
  }

  public static getInstance(): KafkaClient {
    if (!KafkaClient.instance) {
      KafkaClient.instance = new KafkaClient();
    }
    return KafkaClient.instance;
  }

  private initialize(): void {
    try {
      const brokers = env.KAFKA_BROKERS.split(',').map((b) => b.trim());
      const kafkaConfig: KafkaConfig = {
        clientId: env.KAFKA_CLIENT_ID,
        brokers,
        logLevel: logLevel.WARN,
        retry: {
          initialRetryTime: 300,
          retries: 5,
          maxRetryTime: 5000,
        },
      };

      this.kafka = new Kafka(kafkaConfig);
      this.producer = this.kafka.producer({
        allowAutoTopicCreation: true,
        transactionTimeout: 30000,
      });

      // Connect producer lazily
      this.producer
        .connect()
        .then(() => {
          this.isProducerConnected = true;
          this.isDegraded = false;
          logger.info({ brokers }, 'Kafka Producer connected successfully');
        })
        .catch((err: Error) => {
          this.isProducerConnected = false;
          this.isDegraded = true;
          logger.warn(
            { error: err.message },
            'Initial Kafka connection failed. Outbox events will stage in PostgreSQL until broker recovers.'
          );
        });
    } catch (err: unknown) {
      this.isProducerConnected = false;
      this.isDegraded = true;
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ error: message }, 'Failed to initialize Kafka client');
    }
  }

  public isAvailable(): boolean {
    return this.isProducerConnected && !this.isDegraded && this.producer !== null;
  }

  public async publish(record: ProducerRecord): Promise<RecordMetadata[]> {
    if (!this.producer) {
      throw new Error('Kafka producer is not initialized');
    }

    if (!this.isProducerConnected) {
      try {
        await this.producer.connect();
        this.isProducerConnected = true;
        this.isDegraded = false;
      } catch (err) {
        this.isProducerConnected = false;
        this.isDegraded = true;
        throw new Error(
          `Kafka broker unavailable: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return await this.producer.send(record);
  }

  public createConsumer(groupId: string): Consumer {
    if (!this.kafka) {
      const brokers = env.KAFKA_BROKERS.split(',').map((b) => b.trim());
      this.kafka = new Kafka({
        clientId: `${env.KAFKA_CLIENT_ID}-${groupId}`,
        brokers,
        logLevel: logLevel.WARN,
      });
    }

    return this.kafka.consumer({
      groupId,
      retry: {
        initialRetryTime: 500,
        retries: 5,
      },
      readUncommitted: false,
    });
  }

  public async disconnect(): Promise<void> {
    if (this.producer && this.isProducerConnected) {
      try {
        await this.producer.disconnect();
      } catch (err) {
        logger.warn({ err }, 'Error during Kafka producer disconnect');
      }
      this.isProducerConnected = false;
    }
  }
}

export const kafkaClient = KafkaClient.getInstance();
