import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AIPredictionQueueService {
  private readonly logger = new Logger(AIPredictionQueueService.name);

  constructor(
    @InjectQueue('ai-predictions') private aiQueue: Queue,
    private prisma: PrismaService,
  ) {}

  /**
   * Queue a fraud detection job
   */
  async queueFraudDetection(businessId: string, invoiceId: string, invoiceData: any) {
    try {
      const job = await this.aiQueue.add(
        'predict-fraud',
        {
          businessId,
          invoiceId,
          invoiceData,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
        },
      );

      this.logger.log(`✅ Fraud detection queued: Job ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`❌ Failed to queue fraud detection: ${error.message}`);
      throw error;
    }
  }

  /**
   * Queue anomaly detection job
   */
  async queueAnomalyDetection(businessId: string, expenseId: string, amount: number) {
    try {
      const job = await this.aiQueue.add(
        'predict-anomaly',
        {
          businessId,
          expenseId,
          amount,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
        },
      );

      this.logger.log(`✅ Anomaly detection queued: Job ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`❌ Failed to queue anomaly detection: ${error.message}`);
      throw error;
    }
  }

  /**
   * Queue risk assessment job
   */
  async queueRiskAssessment(businessId: string, invoiceId: string, transactionData: any) {
    try {
      const job = await this.aiQueue.add(
        'predict-risk',
        {
          businessId,
          invoiceId,
          transactionData,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
        },
      );

      this.logger.log(`✅ Risk assessment queued: Job ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`❌ Failed to queue risk assessment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Queue model training job
   */
  async queueModelTraining(businessId: string, modelType: string) {
    try {
      const job = await this.aiQueue.add(
        'train-model',
        {
          businessId,
          modelType,
        },
        {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
        },
      );

      this.logger.log(`✅ Model training queued: Job ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`❌ Failed to queue model training: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const counts = await this.aiQueue.getJobCounts();
      return {
        active: counts.active,
        waiting: counts.waiting,
        completed: counts.completed,
        failed: counts.failed,
        delayed: counts.delayed,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get queue stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear queue
   */
  async clearQueue() {
    try {
      await this.aiQueue.clean(0, 'failed');
      await this.aiQueue.clean(0, 'completed');
      this.logger.log('✅ Queue cleared');
    } catch (error) {
      this.logger.error(`❌ Failed to clear queue: ${error.message}`);
      throw error;
    }
  }
}
